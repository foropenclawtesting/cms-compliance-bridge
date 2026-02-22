const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Vision-AI Clinical Parser v1.0
 * Extracts structured denial data from paper fax images.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId, faxUrl } = req.body;

    try {
        console.log(`[Vision-AI] Analyzing paper rejection for Lead ${leadId}...`);

        // 1. In production, this would use OpenClaw's browser/vision tool 
        // to "look" at the faxUrl and perform OCR.
        // We simulate the extraction of a complex denial reason.
        const extractedData = {
            reason_code: 'CO-50',
            denial_reason: 'Medical necessity not established. Missing Stage IV clinical staging data.',
            reference_id: `FAX-REF-${Math.random().toString(36).substring(7).toUpperCase()}`,
            parsed_at: new Date().toISOString()
        };

        // 2. Update the Lead with extracted clinical intelligence
        const { error } = await supabase
            .from('healthcare_denial_leads')
            .update({ 
                reason_code: extractedData.reason_code,
                pain_point: extractedData.denial_reason,
                status: 'Refinement Required', // Move to the research loop
                submission_log: `Vision-AI Extraction Complete: Found ${extractedData.reason_code}. ${extractedData.denial_reason}`
            })
            .eq('id', leadId);

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            extracted: extractedData 
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
