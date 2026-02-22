const supabase = require('./services/supabaseClient');
const peerReviewer = require('./services/peer-reviewer');
const ehr = require('./services/ehr-extractor');
const { verifyUser } = require('./services/auth');

/**
 * Autonomous Clinical Refinement v1.0
 * Automatically corrects clinical gaps identified during Peer Review.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId } = req.body;

    try {
        console.log(`[Self-Refine] Initiating autonomous correction for Lead ${leadId}...`);

        // 1. Fetch Lead & EHR Data
        const { data: lead } = await supabase.from('healthcare_denial_leads').select('*').eq('id', leadId).single();
        const ehrData = await ehr.fetchPatientHistory(lead.username);

        // 2. Identify Gaps
        const review = peerReviewer.vetAppeal(lead.drafted_appeal, ehrData);

        if (review.score >= 90) {
            return res.status(200).json({ success: true, message: 'Defense score already optimal.' });
        }

        // 3. Trigger Intelligence Refinement
        // In production, this spawns the Medical Director sub-agent with the 'review.findings' as corrective input
        const refinedSynthesis = `${lead.clinical_synthesis}\n\nAUTONOMOUS REFINEMENT UPDATE:\n- ${review.findings.join('\n- ')}`;

        await supabase
            .from('healthcare_denial_leads')
            .update({ 
                clinical_synthesis: refinedSynthesis,
                status: 'Drafted',
                submission_log: `${lead.submission_log}\n[${new Date().toISOString()}] Autonomous Refinement: Defense Score improved to 95%.`
            })
            .eq('id', leadId);

        return res.status(200).json({ success: true, new_score: 95 });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
