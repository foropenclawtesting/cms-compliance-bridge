const supabase = require('../services/supabaseClient');
const apiPoller = require('../services/api-poller');
const axios = require('axios');

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        // 1. Fetch active transmissions
        const { data: claims, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .in('status', ['Submitted', 'Escalated', 'Healing Required'])
            .eq('final_outcome', 'Pending');

        if (fetchError) throw fetchError;

        const now = new Date();
        const results = [];

        for (const claim of claims) {
            // A. URGENCY CHECK (Repolling Logic)
            // If the claim is due in < 24h, we poll every time. 
            // If it's further out, we might skip to save API costs/rate limits.
            const timeLeft = claim.due_at ? new Date(claim.due_at) - now : Infinity;
            const isUrgent = timeLeft < (24 * 60 * 60 * 1000);

            console.log(`[Reconciliation] Checking Claim ${claim.id}. Urgent: ${isUrgent}`);

            // B. CHECK TRANSMISSION STATUS
            if (claim.submission_status === 'Sent' && claim.submission_log.includes('ID:')) {
                const faxId = claim.submission_log.match(/ID:\s*(\d+)/)?.[1];
                if (faxId && process.env.PHAXIO_KEY) {
                    const faxRes = await axios.get(`https://api.phaxio.com/v2/faxes/${faxId}`, {
                        auth: { username: process.env.PHAXIO_KEY, password: process.env.PHAXIO_SECRET }
                    });
                    if (faxRes.data.data.status === 'success') {
                        await supabase.from('healthcare_denial_leads').update({ submission_status: 'Delivered' }).eq('id', claim.id);
                    }
                }
            }

            // C. CHECK ADJUDICATION OUTCOME
            // Triggered if urgent OR on a standard interval
            const result = await apiPoller.checkDenials(claim.insurance_type, `AUTO-${claim.id}`);
            
            if (result.status === 'success') {
                if (!result.denialFound) {
                    console.log(`[Victory] Claim ${claim.id} APPROVED.`);
                    await supabase.from('healthcare_denial_leads').update({
                        status: 'Settled',
                        final_outcome: 'Approved',
                        settled_at: now.toISOString(),
                        recovered_amount: claim.estimated_value
                    }).eq('id', claim.id);
                    results.push({ id: claim.id, outcome: 'Approved' });
                } else if (isUrgent) {
                    // If still denied and window is closing, flag for "Final Escalation"
                    console.log(`[Warning] Claim ${claim.id} nearing deadline without approval.`);
                }
            }
        }
        
        return res.status(200).json({ processed: true, count: claims.length, results });

    } catch (error) {
        console.error('[Outcome Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
