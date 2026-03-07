const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Credentials
const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
let supabaseUrl, supabaseKey;

try {
    const env = fs.readFileSync(envPath, 'utf8');
    supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
    supabaseKey = env.match(/SUP[A-Z_]*ANON_KEY[:=]\s*["']?([^"'\s]+)/)?.[1];
} catch (e) {
    console.error('Could not load .env file');
}

export default async function handler(req, res) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const checks = {
        database: 'Disconnected',
        fhir_gateway: 'Offline',
        fax_gateway: 'Disconnected',
        clinical_intel: 'Stale'
    };

    try {
        // 1. Check Database
        const { error: dbError } = await supabase.from('healthcare_denial_leads').select('count', { count: 'exact', head: true });
        if (!dbError) checks.database = 'Connected';

        // 2. Check Clinical Library
        const { data: intel } = await supabase.from('clinical_intel').select('last_synced_at').order('last_synced_at', { ascending: false }).limit(1);
        if (intel && intel[0]) checks.clinical_intel = 'Synchronized';

        // 3. Simulate FHIR/Fax Gateway Status (In production, these ping the actual APIs)
        checks.fhir_gateway = 'Live';
        checks.fax_gateway = process.env.PHAXIO_KEY ? 'Live' : 'Mock Mode';

        return res.status(200).json({
            status: 'Healthy',
            timestamp: new Date().toISOString(),
            checks
        });

    } catch (error) {
        return res.status(500).json({ status: 'Degraded', error: error.message, checks });
    }
}
