const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('payer_rules')
            .select('*')
            .order('payer_name');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { payer_name, reason_code, strategy } = req.body;
        const { data, error } = await supabase
            .from('payer_rules')
            .upsert({ payer_name, reason_code, strategy }, { onConflict: 'payer_name,reason_code' })
            .select();
        
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }
}
