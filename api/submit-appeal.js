const supabase = require('../services/supabaseClient');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { leadId, appealText } = req.body;

    if (!leadId || !appealText) {
        return res.status(400).json({ error: 'leadId and appealText are required' });
    }

    try {
        console.log(`[Submission Gateway] Initiating submission for Lead ${leadId}...`);

        // MOCK SUBMISSION (Simulating Fax/Portal API call)
        const submissionId = `FAX-${Math.floor(Math.random() * 1000000)}`;
        
        // Update Supabase with submission details
        const { error: updateError } = await supabase
            .from('healthcare_denial_leads')
            .update({ 
                status: 'Submitted',
                submission_status: 'Success',
                submitted_at: new Date().toISOString(),
                submission_log: `Electronic submission via Gateway ID: ${submissionId}`
            })
            .eq('id', leadId);

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            submissionId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Submission Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
