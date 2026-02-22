const supabase = require('./services/supabaseClient');

/**
 * Production Health Check
 * Verifies DB connectivity, Schema state, and Gateway presence.
 */
export default async function handler(req, res) {
    const health = {
        status: 'Healthy',
        timestamp: new Date().toISOString(),
        checks: {
            database: 'Unknown',
            schema: 'Unknown',
            fax_gateway: process.env.PHAXIO_KEY ? 'Connected' : 'Mock Mode',
            fhir_gateway: process.env.FHIR_BASE_URL ? 'Connected' : 'Mock Mode'
        }
    };

    try {
        // Test DB Connection
        const { data, error } = await supabase.from('healthcare_denial_leads').select('count', { count: 'exact', head: true });
        
        if (error) {
            health.status = 'Degraded';
            health.checks.database = 'Error';
            health.checks.schema = error.message.includes('column') ? 'Schema Out of Sync' : 'Error';
        } else {
            health.checks.database = 'Connected';
            health.checks.schema = 'Synchronized';
        }

        return res.status(200).json(health);
    } catch (error) {
        return res.status(500).json({ status: 'Unhealthy', error: error.message });
    }
}
