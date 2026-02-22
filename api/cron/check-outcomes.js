const supabase = require('../services/supabaseClient');
const apiPoller = require('../services/api-poller');
const axios = require('axios');

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        // 1. Fetch claims that are 'Submitted' or 'Settled'
        const { data: claims, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .in('status', ['Submitted', 'Settled'])
            .eq('final_outcome', 'Pending');

        if (fetchError) throw fetchError;

        console.log(`[Reconciliation Engine] Monitoring ${claims.length} active transmissions/appeals...`);

        const results = [];

        for (const claim of claims) {
            // A. CHECK TRANSMISSION STATUS (if via Phaxio)
            if (claim.submission_status === 'Sent' && claim.submission_log.includes('ID:')) {
                const faxId = claim.submission_log.match(/ID:\s*(\d+)/)?.[1];
                if (faxId && process.env.PHAXIO_KEY) {
                    try {
                        const faxRes = await axios.get(`https://api.phaxio.com/v2/faxes/${faxId}`, {
                            auth: { username: process.env.PHAXIO_KEY, password: process.env.PHAXIO_SECRET }
                        });
                        const status = faxRes.data.data.status;
                        if (status === 'success') {
                            await supabase.from('healthcare_denial_leads').update({ submission_status: 'Delivered' }).eq('id', claim.id);
                        } else if (status === 'failure') {
                            await supabase.from('healthcare_denial_leads').update({ submission_status: 'Failed' }).eq('id', claim.id);
                        }
                    } catch (e) { console.error(`Fax check failed for ${faxId}`); }
                }
            }

            // B. CHECK ADJUDICATION OUTCOME
            const result = await apiPoller.checkDenials(claim.insurance_type, `AUTO-${claim.id}`);

            if (result.status === 'success' && !result.denialFound) {
                console.log(`[Victory] Claim AUTO-${claim.id} APPROVED.`);
                await supabase
                    .from('healthcare_denial_leads')
                    .update({ 
                        status: 'Settled',
                        final_outcome: 'Approved',
                        settled_at: new Date().toISOString(),
                        recovered_amount: claim.estimated_value
                    })
                    .eq('id', claim.id);

                results.push({ id: claim.id, outcome: 'Approved' });
            }
        }
        
        return res.status(200).json({ processed: true, results });

    } catch (error) {
        console.error('[Reconciliation Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
