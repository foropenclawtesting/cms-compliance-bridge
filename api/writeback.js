const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId, outcome } = req.body;

    console.log(`[EHR Writeback] Syncing final adjudication for lead ${leadId} to Billing System...`);

    try {
        // Simulate an external API call to the hospital's Epic/Cerner Billing module
        // In production, this would use a secure HL7 or FHIR write operation
        const syncStatus = outcome === 'Approved' ? 'REVENUE_POSTED' : 'CLAIM_VOIDED';

        const { error } = await supabase
            .from('healthcare_denial_leads')
            .update({ submission_log: `EHR Sync Complete: ${syncStatus}` })
            .eq('id', leadId);

        if (error) throw error;

        return res.status(200).json({ success: true, status: syncStatus });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
