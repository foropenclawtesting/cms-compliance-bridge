const supabase = require('../services/supabaseClient');
const payerRouter = require('../services/payer-router');
const axios = require('axios');
const FormData = require('form-data');

const pdfEngine = require('./services/pdf-engine');
const notify = require('./services/notification-service');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { leadId, insuranceName } = req.body;

    if (!leadId) {
        return res.status(400).json({ error: 'leadId is required' });
    }

    try {
        // 1. Fetch the lead to get the most recent appeal text (Priority: Edited > Drafted)
        const { data: lead, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (fetchError || !lead) throw new Error('Lead not found');

        const finalAppealText = lead.edited_appeal || lead.drafted_appeal;

        if (!finalAppealText) {
            return res.status(400).json({ error: 'No appeal text found to transmit.' });
        }

        // 2. Wrap in Professional PDF Layout
        const professionalHTML = pdfEngine.generateAppealHTML(lead, finalAppealText);

        // 3. Resolve Recipient via Routing Engine
        const routing = payerRouter.lookup(insuranceName || lead.insurance_type);
        const targetFax = routing.fax;

        console.log(`[Submission Gateway] Transmitting appeal for ${lead.username} to ${targetFax}...`);

        let submissionId = `MOCK-${Date.now()}`;
        let logEntry = `Simulated submission to ${targetFax} (No Fax API keys).`;

        // 3. Execute Real Transmission if keys exist
        if (process.env.PHAXIO_KEY && process.env.PHAXIO_SECRET) {
            const form = new FormData();
            form.append('to', targetFax);
            form.append('string_data', professionalHTML);
            form.append('string_data_type', 'html'); // Upgraded to HTML for professional PDF rendering

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

        // 4. Update Supabase
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

        // 5. Proactive Patient Notification
        await notify.sendUpdate(lead, 'SUBMITTED');

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
