const supabase = require('../services/supabaseClient');

export default async function handler(req, res) {
    try {
        // 1. Fetch denial data for analytics
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('insurance_type, estimated_value, status, final_outcome');

        if (error) throw error;

        // 2. Group by Payer
        const payerStats = leads.reduce((acc, lead) => {
            const payer = lead.insurance_type || "Unknown";
            if (!acc[payer]) {
                acc[payer] = { name: payer, count: 0, totalValue: 0, winRate: 0, wins: 0, processed: 0 };
            }
            acc[payer].count++;
            acc[payer].totalValue += parseFloat(lead.estimated_value) || 0;
            if (lead.status === 'Submitted' || lead.status === 'Settled') {
                acc[payer].processed++;
                if (lead.final_outcome === 'Approved') acc[payer].wins++;
            }
            return acc;
        }, {});

        // 3. Finalize Win Rates
        const stats = Object.values(payerStats).map(p => ({
            ...p,
            winRate: p.processed > 0 ? Math.round((p.wins / p.processed) * 100) : 0
        })).sort((a, b) => b.totalValue - a.totalValue);

        return res.status(200).json(stats);
    } catch (error) {
        console.error('[Analytics Error]:', error.message);
        return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
}
