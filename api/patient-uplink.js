const supabase = require('./services/supabaseClient');

/**
 * Patient Evidence Uplink v1.0
 * Allows patients to inject personal clinical narratives into their appeals.
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { leadId, patientNarrative } = req.body;

    try {
        console.log(`[Patient Portal] Receiving supporting evidence for lead ${leadId}...`);

        // 1. Fetch the existing synthesis
        const { data: lead } = await supabase
            .from('healthcare_denial_leads')
            .select('clinical_synthesis, submission_log')
            .eq('id', leadId)
            .single();

        if (!lead) throw new Error('Lead not found');

        // 2. Append the Patient's Narrative to the Synthesis
        const enhancedSynthesis = `${lead.clinical_synthesis}\n\nPATIENT-SUPPLIED EVIDENCE:\n"${patientNarrative}"`;

        const { error } = await supabase
            .from('healthcare_denial_leads')
            .update({ 
                clinical_synthesis: enhancedSynthesis,
                submission_log: `${lead.submission_log}\n[${new Date().toISOString()}] Patient-supplied evidence integrated.`
            })
            .eq('id', leadId);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Evidence successfully integrated into clinical package.' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
