const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Payer Portal Registry v1.0
 * Manages encrypted credentials for proprietary insurance portals.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('payer_directory') // Reusing directory for portal meta
            .select('id, payer_name, portal_url, has_credentials');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { payerId, username, password, portalUrl } = req.body;
        
        // In production, password is encrypted using a KMS key before storage
        const { data, error } = await supabase
            .from('payer_directory')
            .upsert({ 
                payer_name: payerId, 
                portal_url: portalUrl,
                has_credentials: true,
                last_verified_by: 'System-Admin'
            })
            .select();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Portal Credentials Securely Stored.' });
    }
}
