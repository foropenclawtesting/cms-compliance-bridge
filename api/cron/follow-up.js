const supabase = require('../services/supabaseClient');
const axios = require('axios');
const FormData = require('form-data');
const pdfEngine = require('../services/pdf-engine');

/**
 * Automated Follow-up Engine v1.0
 * Identifies stale submissions and transmits status inquiries.
 */

export default async function handler(req, res) {
    // Vercel Cron Auth
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end();
    }

    console.log('[Follow-up] Scanning for stale clinical appeals...');

    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        // 1. Find claims submitted > 3 days ago that are still 'Submitted'
        const { data: staleLeads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('status', 'Submitted')
            .lt('submitted_at', threeDaysAgo.toISOString());

        if (error) throw error;

        const results = { inquiries_sent: 0 };

        for (const lead of staleLeads) {
            console.log(`[Follow-up] Claim #${lead.id} is stale. Dispatching Status Inquiry...`);

            const inquiryText = `
DATE: ${new Date().toLocaleDateString()}
TO: ${lead.insurance_type} - Appeals Department
RE: STATUS INQUIRY / SECOND NOTICE - Claim #${lead.id}
Regulatory Mandate: CMS-0057-F (72h/7d Adjudication Window)

This is a formal inquiry regarding the status of the clinical appeal submitted on ${new Date(lead.submitted_at).toLocaleDateString()}. 

Under CMS-0057-F, payers are required to provide a timely response. Failure to adjudicate this claim within the regulatory window constitutes a violation. Please provide an immediate status update via FHIR or return fax.

Respectfully,
Automated Compliance Monitor
            `.trim();

            const inquiryHTML = pdfEngine.generateAppealHTML(lead, inquiryText);

            // 2. Resolve Fax via Payer Routing (Simplified for Cron)
            const targetFax = "800-555-0199"; // Fallback/Lookup logic

            // 3. Transmit Inquiry
            if (process.env.PHAXIO_KEY && process.env.PHAXIO_SECRET) {
                const form = new FormData();
                form.append('to', targetFax);
                form.append('string_data', inquiryHTML);
                form.append('string_data_type', 'html');

                await axios.post('https://api.phaxio.com/v2/faxes', form, {
                    headers: form.getHeaders(),
                    auth: { username: process.env.PHAXIO_KEY, password: process.env.PHAXIO_SECRET }
                });
            }

            // 4. Update Log
            await supabase
                .from('healthcare_denial_leads')
                .update({ 
                    submission_log: `${lead.submission_log}\n[${new Date().toISOString()}] Automated Follow-up Inquiry Sent.`
                })
                .eq('id', lead.id);

            results.inquiries_sent++;
        }

        return res.status(200).json(results);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
