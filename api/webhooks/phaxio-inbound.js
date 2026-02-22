const supabase = require('../services/supabaseClient');

/**
 * Phaxio Inbound Webhook v1.0
 * Handles paper rejections via Vision-AI parsing.
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { fax, direction } = req.body;

    if (direction !== 'received') return res.status(200).json({ status: 'ignored' });

    console.log(`[Inbound Gateway] Paper rejection received from ${fax.from_number}. Fax ID: ${fax.id}`);

    try {
        // 1. Identify the associated lead via the Payer's fax number
        const { data: lead, error } = await supabase
            .from('healthcare_denial_leads')
            .select('id, username')
            .eq('insurance_type', fax.from_number) // Placeholder: Real logic matches metadata or OCR'd claim IDs
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();

        // 2. Mark for Vision Parsing
        // The heartbeat will pick this up and spawn a vision-enabled sub-agent
        if (lead) {
            await supabase
                .from('healthcare_denial_leads')
                .update({ 
                    status: 'OCR Required',
                    submission_log: `Inbound Fax Received (${fax.id}). Awaiting Vision-AI Clinical Parsing.`
                })
                .eq('id', lead.id);
        }

        return res.status(200).json({ success: true, faxId: fax.id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
