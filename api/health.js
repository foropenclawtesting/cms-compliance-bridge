const supabase = require('./services/supabaseClient');
const axios = require('axios');

export default async function handler(req, res) {
    const checks = {
        database: 'Disconnected',
        fhir_gateway: 'Offline',
        fax_gateway: 'Offline',
        schema: 'Out of Sync'
    };

    try {
        // 1. Check Supabase
        const { data, error } = await supabase.from('healthcare_denial_leads').select('id').limit(1);
        if (!error) {
            checks.database = 'Connected';
            // Check for modern columns (due_at)
            const { error: columnError } = await supabase.from('healthcare_denial_leads').select('due_at').limit(1);
            if (!columnError) checks.schema = 'Synchronized';
        }

        // 2. Check FHIR Gateway (SmartHealth Sandbox)
        try {
            const fhirUrl = process.env.FHIR_BASE_URL || "https://launch.smarthealthit.org/v/r4/fhir";
            await axios.get(`${fhirUrl}/metadata`, { timeout: 3000 });
            checks.fhir_gateway = 'Active (R4)';
        } catch (e) {
            checks.fhir_gateway = 'Timeout/Auth Error';
        }

        // 3. Check Fax Gateway (Phaxio)
        if (process.env.PHAXIO_KEY) {
            checks.fax_gateway = 'Live';
        } else {
            checks.fax_gateway = 'Mock Mode (Keys Missing)';
        }

        return res.status(200).json({
            status: checks.database === 'Connected' ? 'Healthy' : 'Degraded',
            checks,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({ status: 'Error', message: error.message });
    }
}
