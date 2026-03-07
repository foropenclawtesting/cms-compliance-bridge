const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Clinical Identity API v1.0
 * Manages physician credentials and signatures for autonomous signing.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('clinical_identities')
            .select('*')
            .order('physician_name');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { physician_name, npi, title, signature_data } = req.body;
        const { data, error } = await supabase
            .from('clinical_identities')
            .upsert({ physician_name, npi, title, signature_data }, { onConflict: 'npi' })
            .select();
        
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }
}
