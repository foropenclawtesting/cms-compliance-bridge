const supabase = require('../services/supabaseClient');
const apiPoller = require('../services/api-poller');
const appealGenerator = require('../services/appeal-generator');
const axios = require('axios');

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        // 1. Fetch claims that are 'Submitted', 'Settled', or 'Escalated'
        const { data: claims, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .in('status', ['Submitted', 'Settled', 'Escalated'])
            .eq('final_outcome', 'Pending');

        if (fetchError) throw fetchError;

        console.log(`[Reconciliation Engine] Monitoring ${claims.length} active transmissions/appeals...`);

        const results = [];
        const now = new Date();

        for (const claim of claims) {
            let currentStatus = claim.status;

            // A. CHECK TRANSMISSION STATUS (Fax delivery verification)
            if (claim.submission_status === 'Sent' && claim.submission_log.includes('ID:')) {
                const faxId = claim.submission_log.match(/ID:\s*(\d+)/)?.[1];
                if (faxId && process.env.PHAXIO_KEY) {
                    try {
                        const faxRes = await axios.get(`https://api.phaxio.com/v2/faxes/${faxId}`, {
                            auth: { username: process.env.PHAXIO_KEY, password: process.env.PHAXIO_SECRET }
                        });
                        if (faxRes.data.data.status === 'success') {
                            await supabase.from('healthcare_denial_leads').update({ submission_status: 'Delivered' }).eq('id', claim.id);
                        }
                    } catch (e) { console.error(`Fax check failed for ${faxId}`); }
                }
            }

            // B. CHECK ADJUDICATION OUTCOME (Victory or Denial Detection)
            const result = await apiPoller.checkDenials(claim.insurance_type, `AUTO-${claim.id}`);
            
            if (result.status === 'success') {
                if (!result.denialFound) {
                    console.log(`[Victory] Claim AUTO-${claim.id} APPROVED.`);
                    await supabase
                        .from('healthcare_denial_leads')
                        .update({ 
                            status: 'Settled',
                            final_outcome: 'Approved',
                            settled_at: now.toISOString(),
                            recovered_amount: claim.estimated_value
                        })
                        .eq('id', claim.id);
                    results.push({ id: claim.id, action: 'Approved' });
                    continue;
                } else if (claim.status === 'Submitted' || claim.status === 'Escalated') {
                    // If it's still denied AFTER we submitted an appeal, it's an Appeal Denial
                    console.log(`[Defeat] Appeal denied for Claim AUTO-${claim.id}. Escalating to Level 2.`);
                    await supabase
                        .from('healthcare_denial_leads')
                        .update({ 
                            status: 'Level 2 Pending',
                            final_outcome: 'Denied (L1)',
                            submission_log: `${claim.submission_log || ''}\n[${now.toISOString()}] L1 Appeal denied. Triggering Level 2 Clinical Deep-Dive.`
                        })
                        .eq('id', claim.id);
                    results.push({ id: claim.id, action: 'Escalated to L2' });
                    continue;
                }
            }

            // C. CHECK FOR REGULATORY VIOLATION (Escalation)
            // If submitted and deadline passed without approval
            if (claim.status === 'Submitted' && claim.due_at && new Date(claim.due_at) < now) {
                console.log(`[Escalation] Deadline EXPIRED for Claim AUTO-${claim.id}. Drafting Violation Notice.`);
                
                const escalationText = appealGenerator.draft({
                    payerId: claim.insurance_type,
                    claimId: `AUTO-${claim.id}`,
                    priority: claim.priority,
                    isEscalation: true
                });

                await supabase
                    .from('healthcare_denial_leads')
                    .update({ 
                        status: 'Escalated',
                        edited_appeal: escalationText,
                        submission_log: `${claim.submission_log || ''}\n[${now.toISOString()}] Regulatory deadline missed. Notice of Violation drafted.`
                    })
                    .eq('id', claim.id);
                
                results.push({ id: claim.id, action: 'Escalated' });
            }
        }
        
        return res.status(200).json({ processed: true, results });

    } catch (error) {
        console.error('[Reconciliation Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
