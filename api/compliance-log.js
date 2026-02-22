const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    try {
        const { data, error } = await supabase
            .from('healthcare_denial_leads')
            .select('id, username, insurance_type, submitted_at, due_at, status, submission_log')
            .not('submitted_at', 'is', null)
            .order('submitted_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
