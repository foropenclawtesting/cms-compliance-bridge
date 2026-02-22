const supabase = require('../services/supabaseClient');

export default async function handler(req, res) {
    try {
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*');

        if (error) throw error;

        // 1. Group by Payer for Performance & Response Time Benchmarking
        const payerStats = leads.reduce((acc, lead) => {
            const payer = lead.insurance_type || "Unknown";
            if (!acc[payer]) {
                acc[payer] = { name: payer, count: 0, totalValue: 0, wins: 0, processed: 0, totalTatMs: 0 };
            }
            acc[payer].count++;
            acc[payer].totalValue += parseFloat(lead.estimated_value) || 0;
            
            if (lead.status === 'Settled' || lead.final_outcome !== 'Pending') {
                acc[payer].processed++;
                if (lead.final_outcome === 'Approved') acc[payer].wins++;
                
                // Calculate Turnaround Time (TAT)
                if (lead.submitted_at && lead.settled_at) {
                    const tat = new Date(lead.settled_at) - new Date(lead.submitted_at);
                    acc[payer].totalTatMs += tat;
                }
            }
            return acc;
        }, {});

        const stats = Object.values(payerStats).map(p => {
            const avgTatDays = p.processed > 0 && p.totalTatMs > 0
                ? Math.round(p.totalTatMs / p.processed / (1000 * 60 * 60 * 24))
                : 5; // Default to 5 days if no data
            
            return {
                ...p,
                winRate: p.processed > 0 ? Math.round((p.wins / p.processed) * 100) : 0,
                avgTatDays: avgTatDays || 1
            };
        }).sort((a, b) => b.totalValue - a.totalValue);

        // 2. Global Forecasting
        const totalPendingValue = leads
            .filter(l => l.status !== 'Settled')
            .reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);
            
        const avgWinRate = stats.length > 0 
            ? stats.reduce((sum, s) => sum + s.winRate, 0) / stats.length 
            : 65;

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
