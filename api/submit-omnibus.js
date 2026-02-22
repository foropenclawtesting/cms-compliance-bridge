const supabase = require('../services/supabaseClient');
const payerRouter = require('../services/payer-router');
const axios = require('axios');
const FormData = require('form-data');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    if (req.method !== 'POST') return res.status(405).end();

    const { payer, procedure, appealText } = req.body;

    try {
        // 1. Resolve Payer Compliance Dept Fax
        const routing = await payerRouter.lookup(payer);
        const targetFax = routing.fax;

        console.log(`[Omnibus Gateway] Initiating Systemic Escalation for ${payer} to ${targetFax}...`);

        let logEntry = `Omnibus notice sent to ${targetFax} for procedure: ${procedure}.`;

        // 2. Real Transmission (Phaxio)
        if (process.env.PHAXIO_KEY && process.env.PHAXIO_SECRET) {
            const form = new FormData();
            form.append('to', targetFax);
            form.append('string_data', appealText);
            form.append('string_data_type', 'text');

            const response = await axios.post('https://api.phaxio.com/v2/faxes', form, {
                headers: form.getHeaders(),
                auth: { username: process.env.PHAXIO_KEY, password: process.env.PHAXIO_SECRET }
            });
            logEntry = `Omnibus Fax Transmitted. ID: ${response.data.data.id}`;
        }

        // 3. Bulk Update all associated leads to 'Escalated' status
        const { error: updateError } = await supabase
            .from('healthcare_denial_leads')
            .update({ 
                status: 'Escalated',
                submission_log: logEntry
            })
            .eq('insurance_type', payer)
            .eq('title', procedure)
            .not('status', 'eq', 'Settled');

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, log: logEntry });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
