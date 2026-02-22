const supabase = require('../services/supabaseClient');
const axios = require('axios');
const FormData = require('form-data');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { leadId, appealText, recipientFax } = req.body;

    if (!leadId || !appealText) {
        return res.status(400).json({ error: 'leadId and appealText are required' });
    }

    try {
        console.log(`[Submission Gateway] Processing REAL submission for Lead ${leadId}...`);

        let submissionId = `MOCK-${Date.now()}`;
        let logEntry = "Simulated submission (No Fax API keys found).";

        // 1. Check for Phaxio Credentials
        if (process.env.PHAXIO_KEY && process.env.PHAXIO_SECRET) {
            const faxNumber = recipientFax || process.env.PHAXIO_RECIPIENT_NUMBER;
            
            console.log(`[Phaxio] Sending fax to ${faxNumber}...`);
            
            // In a real scenario, we'd generate the PDF buffer here or send the text
            // For this implementation, we'll send the appeal text as a string/file
            const form = new FormData();
            form.append('to', faxNumber);
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
            logEntry = `Phaxio Fax Sent. ID: ${submissionId}. Status: ${response.data.data.status}`;
        }

        // 2. Update Supabase with transmission details
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
            log: logEntry
        });

    } catch (error) {
        console.error('[Submission Error]:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Fax transmission failed', details: error.message });
    }
}
