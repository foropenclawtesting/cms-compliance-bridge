const supabase = require('../services/supabaseClient');
const payerRouter = require('../services/payer-router');
const axios = require('axios');
const FormData = require('form-data');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { leadId, appealText, insuranceName } = req.body;

    if (!leadId || !appealText) {
        return res.status(400).json({ error: 'leadId and appealText are required' });
    }

    try {
        // 1. Resolve Recipient via Routing Engine
        const routing = payerRouter.lookup(insuranceName);
        const targetFax = routing.fax;

        console.log(`[Submission Gateway] Routing appeal for ${insuranceName} to ${targetFax} (${routing.department})`);

        let submissionId = `MOCK-${Date.now()}`;
        let logEntry = `Simulated submission to ${targetFax} (No Fax API keys).`;

        // 2. Execute Real Transmission if keys exist
        if (process.env.PHAXIO_KEY && process.env.PHAXIO_SECRET) {
            const form = new FormData();
            form.append('to', targetFax);
            form.append('string_data', appealText);
            form.append('string_data_type', 'text');

            const response = await axios.post('https://api.phaxio.com/v2/faxes', form, {
                headers: form.getHeaders(),
                auth: {
                    username: process.env.PHAXIO_KEY,
                    password: process.env.PHAXIO_SECRET
                }
            });

            submissionId = response.data.data.id;
            logEntry = `Phaxio Fax Sent to ${targetFax}. ID: ${submissionId}.`;
        }

        // 3. Update Supabase
        const { error: updateError } = await supabase
            .from('healthcare_denial_leads')
            .update({ 
                status: 'Submitted',
                submission_status: 'Sent',
                submitted_at: new Date().toISOString(),
                submission_log: logEntry
            })
            .eq('id', leadId);

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            submissionId,
            recipient: routing.name,
            fax: targetFax
        });

    } catch (error) {
        console.error('[Submission Error]:', error.message);
        return res.status(500).json({ error: 'Transmission failed', details: error.message });
    }
}
