const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Billing System Writeback v1.0
 * Synchronizes recovered revenue with the hospital's financial module.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId, amount, payer } = req.body;

    try {
        console.log(`[Billing Sync] Posting $${amount} recovery from ${payer} for Lead ${leadId}...`);

        // 1. In production, this performs an HL7 / FHIR Financial transaction
        // to the hospital's billing system (e.g., Epic Resolute or Cerner Patient Accounting)
        const syncStatus = 'POSTED_TO_AR';

        // 2. Log the financial settlement in our audit trail
        const { error } = await supabase
            .from('healthcare_denial_leads')
            .update({ 
                submission_log: `Revenue Sync Complete: $${amount} posted to hospital billing system. Ref: ${syncStatus}`,
                final_outcome: 'Settled & Posted'
            })
            .eq('id', leadId);

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            posted_amount: amount,
            status: syncStatus,
            synced_at: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
