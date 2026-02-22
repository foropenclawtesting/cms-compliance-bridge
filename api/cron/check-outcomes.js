const supabase = require('../services/supabaseClient');
const apiPoller = require('../services/api-poller');

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        // 1. Fetch claims that are 'Submitted' but not yet 'Settled'
        const { data: claims, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('status', 'Submitted')
            .eq('final_outcome', 'Pending');

        if (fetchError) throw fetchError;

        console.log(`[Outcome Tracker] Checking status for ${claims.length} active appeals...`);

        const results = [];

        for (const claim of claims) {
            // 2. Poll FHIR/Mock for the ClaimResponse
            const result = await apiPoller.checkDenials(claim.insurance_type, `AUTO-${claim.id}`);

            // 3. If a new decision is found (outcome is no longer rejected/denied)
            if (result.status === 'success' && !result.denialFound) {
                console.log(`[Victory] Claim AUTO-${claim.id} has been APPROVED.`);
                
                await supabase
                    .from('healthcare_denial_leads')
                    .update({ 
                        status: 'Settled',
                        final_outcome: 'Approved',
                        settled_at: new Date().toISOString(),
                        recovered_amount: claim.estimated_value // Assume full recovery for now
                    })
                    .eq('id', claim.id);

                results.push({ id: claim.id, outcome: 'Approved' });
            }
        }
        
        return res.status(200).json({ processed: true, results });

    } catch (error) {
        console.error('[Outcome Tracker Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
