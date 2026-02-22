const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    try {
        const last7Days = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Fetch total recovered on this specific day
            const { data, error } = await supabase
                .from('healthcare_denial_leads')
                .select('recovered_amount')
                .eq('status', 'Settled')
                .gte('settled_at', `${dateStr}T00:00:00Z`)
                .lte('settled_at', `${dateStr}T23:59:59Z`);

            if (error) throw error;

            const dailyTotal = data.reduce((sum, lead) => sum + (parseFloat(lead.recovered_amount) || 0), 0);
            
            last7Days.push({
                date: dateStr,
                amount: dailyTotal
            });
        }

        return res.status(200).json(last7Days);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
