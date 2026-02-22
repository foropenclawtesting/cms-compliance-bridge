const supabase = require('../services/supabaseClient');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { leadId, appealText } = req.body;

    if (!leadId || !appealText) {
        return res.status(400).json({ error: 'leadId and appealText are required' });
    }

    try {
        console.log(`[Draft Editor] Saving human-refined appeal for Lead ${leadId}...`);

        const { error: updateError } = await supabase
            .from('healthcare_denial_leads')
            .update({ 
                edited_appeal: appealText,
                status: 'Drafted' // Keep as drafted until transmitted
            })
            .eq('id', leadId);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, timestamp: new Date().toISOString() });

    } catch (error) {
        console.error('[Draft Editor Error]:', error.message);
        return res.status(500).json({ error: 'Failed to save draft', details: error.message });
    }
}
