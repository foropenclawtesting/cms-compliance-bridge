const supabase = require('./services/supabaseClient');
const payerRouter = require('./services/payer-router');
const axios = require('axios');
const FormData = require('form-data');
const { verifyUser } = require('./services/auth');

/**
 * P2P Outreach Gateway v1.0
 * Automates the formal request for Peer-to-Peer scheduling.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    if (req.method !== 'POST') return res.status(405).end();

    const { leadId, availability } = req.body;

    try {
        const { data: lead, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error || !lead) throw new Error('Lead not found');

        // 1. Resolve P2P Scheduling Fax
        const routing = await payerRouter.lookup(lead.insurance_type);
        const targetFax = routing.fax; // Ideally a specific P2P line from payer_directory

        // 2. Draft the Formal Request
        const p2pRequest = `
DATE: ${new Date().toLocaleDateString()}
TO: ${lead.insurance_type} - Medical Director / P2P Scheduling
RE: FORMAL PEER-TO-PEER REQUEST - Claim #${lead.id}
Patient: ${lead.username}

Dear Medical Director,

Pursuant to the clinical denial of ${lead.title}, we hereby request a Peer-to-Peer consultation to discuss the evidence-based medical necessity of this procedure.

PHYSICIAN AVAILABILITY:
${availability || 'Anytime between 8:00 AM - 10:00 AM EST, Monday-Friday.'}

Please confirm the scheduled time via return fax or FHIR status update.

Respectfully,
Department of Clinical Advocacy
CMS Compliance Bridge Outreach Engine
        `.trim();

        console.log(`[P2P Gateway] Dispatching scheduling request to ${targetFax}...`);

        // 3. Transmit via Phaxio
        if (process.env.PHAXIO_KEY && process.env.PHAXIO_SECRET) {
            const form = new FormData();
            form.append('to', targetFax);
            form.append('string_data', p2pRequest);
            form.append('string_data_type', 'text');

            await axios.post('https://api.phaxio.com/v2/faxes', form, {
                headers: form.getHeaders(),
                auth: { username: process.env.PHAXIO_KEY, password: process.env.PHAXIO_SECRET }
            });
        }

        // 4. Log the Outreach
        await supabase
            .from('healthcare_denial_leads')
            .update({ 
                status: 'P2P Requested',
                submission_log: `P2P Scheduling Request transmitted to ${targetFax} on ${new Date().toISOString()}.`
            })
            .eq('id', lead.id);

        return res.status(200).json({ success: true, target: targetFax });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
