const supabase = require('../services/supabaseClient');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    try {
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('settled_at, recovered_amount')
            .eq('final_outcome', 'Approved')
            .not('settled_at', 'is', null)
            .order('settled_at', { ascending: true });

        if (error) throw error;

        // Group by day to create a time-series chart
        const velocity = leads.reduce((acc, lead) => {
            const date = new Date(lead.settled_at).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + parseFloat(lead.recovered_amount);
            return acc;
        }, {});

        const chartData = Object.entries(velocity).map(([date, amount]) => ({
            date,
            amount
        }));

        return res.status(200).json(chartData);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
