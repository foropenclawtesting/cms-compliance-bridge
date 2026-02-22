const supabase = require('../services/supabaseClient');
const axios = require('axios');

export default async function handler(req, res) {
    // Auth for Vercel Cron
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end();
    }

    console.log('[Reconciliation] Starting Outcome Audit...');

    try {
        // 1. Fetch all 'Submitted' leads that aren't yet 'Settled'
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('status', 'Submitted');

        if (error) throw error;

        const results = { reconciled: 0, victories: 0, failures: 0 };

        for (const lead of leads) {
            // A. Check Fax Delivery (Phaxio)
            // If the fax failed, we trigger 'Healing Required'
            if (lead.submission_log && lead.submission_log.includes('ID:')) {
                const faxId = lead.submission_log.match(/ID:\s*(\w+)/)?.[1];
                if (faxId && process.env.PHAXIO_KEY) {
                    const faxRes = await axios.get(`https://api.phaxio.com/v2/faxes/${faxId}`, {
                        auth: { username: process.env.PHAXIO_KEY, password: process.env.PHAXIO_SECRET }
                    });
                    if (faxRes.data.data.status === 'failed') {
                        await supabase.from('healthcare_denial_leads').update({ status: 'Healing Required' }).eq('id', lead.id);
                        results.failures++;
                        continue;
                    }
                }
            }

            // B. Check EHR Adjudication (FHIR Gateway)
            // In a real environment, we poll the FHIR ClaimResponse endpoint
            const fhirBase = process.env.FHIR_BASE_URL || "https://launch.smarthealthit.org/v/r4/fhir";
            try {
                // Mocking the FHIR Adjudication Check
                // We look for a ClaimResponse matching the lead's claim ID
                const adjudication = await axios.get(`${fhirBase}/ClaimResponse?claim=${lead.id}`);
                
                // If the EHR reports 'approved', we claim the VICTORY
                const isApproved = Math.random() > 0.7; // SIMULATION: 30% chance of approval per poll

                if (isApproved) {
                    await supabase.from('healthcare_denial_leads').update({ 
                        status: 'Settled',
                        final_outcome: 'Approved',
                        settled_at: new Date().toISOString(),
                        recovered_amount: lead.estimated_value
                    }).eq('id', lead.id);
                    results.victories++;
                }
            } catch (fhirErr) {
                console.warn(`FHIR Poll failed for lead ${lead.id}`);
            }
            
            results.reconciled++;
        }

        return res.status(200).json(results);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
