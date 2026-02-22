const supabase = require('../services/supabaseClient');

export default async function handler(req, res) {
    try {
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*');

        if (error) throw error;

        // 1. Group by Payer for Performance Benchmarking
        const payerStats = leads.reduce((acc, lead) => {
            const payer = lead.insurance_type || "Unknown";
            if (!acc[payer]) {
                acc[payer] = { name: payer, count: 0, totalValue: 0, wins: 0, processed: 0 };
            }
            acc[payer].count++;
            acc[payer].totalValue += parseFloat(lead.estimated_value) || 0;
            if (lead.status === 'Settled') {
                acc[payer].processed++;
                if (lead.final_outcome === 'Approved') acc[payer].wins++;
            }
            return acc;
        }, {});

        const stats = Object.values(payerStats).map(p => ({
            ...p,
            winRate: p.processed > 0 ? Math.round((p.wins / p.processed) * 100) : 0
        })).sort((a, b) => b.totalValue - a.totalValue);

        // 2. Global Forecasting
        const totalPendingValue = leads
            .filter(l => l.status !== 'Settled')
            .reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);
            
        const avgWinRate = stats.length > 0 
            ? stats.reduce((sum, s) => sum + s.winRate, 0) / stats.length 
            : 65; // Default to 65% industry avg for new installs

        return res.status(200).json({
            payers: stats,
            forecast: {
                totalPendingValue,
                weightedForecast: Math.round(totalPendingValue * (avgWinRate / 100)),
                avgWinRate: Math.round(avgWinRate)
            }
        });
    } catch (error) {
        console.error('[Analytics Error]:', error.message);
        return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
}
