const supabase = require('../services/supabaseClient');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    try {
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*');

        if (error) throw error;

        const payerStats = {};
        const strategyStats = {};
        const patterns = {};

        leads.forEach(lead => {
            const payer = lead.insurance_type || "Unknown";
            const procedure = lead.title || "Unknown Procedure";
            const strategy = lead.strategy || "STANDARD";

            // 1. Payer Benchmarking
            if (!payerStats[payer]) {
                payerStats[payer] = { name: payer, count: 0, totalValue: 0, wins: 0, processed: 0, totalTatMs: 0 };
            }
            payerStats[payer].count++;
            payerStats[payer].totalValue += parseFloat(lead.estimated_value) || 0;
            
            // 2. Strategy Effectiveness
            if (!strategyStats[strategy]) {
                strategyStats[strategy] = { name: strategy, attempts: 0, wins: 0 };
            }

            if (lead.status === 'Settled') {
                payerStats[payer].processed++;
                strategyStats[strategy].attempts++;
                
                if (lead.final_outcome === 'Approved') {
                    payerStats[payer].wins++;
                    strategyStats[strategy].wins++;
                }

                if (lead.submitted_at && lead.settled_at) {
                    payerStats[payer].totalTatMs += (new Date(lead.settled_at) - new Date(lead.submitted_at));
                }
            }

            // 3. Systemic Patterns
            const patternKey = `${payer}|${procedure}`;
            if (!patterns[patternKey]) patterns[patternKey] = { payer, procedure, count: 0, value: 0 };
            patterns[patternKey].count++;
            patterns[patternKey].value += parseFloat(lead.estimated_value) || 0;
        });

        const systemicTrends = Object.values(patterns)
            .filter(p => p.count >= 2)
            .sort((a, b) => b.value - a.value);

        const payers = Object.values(payerStats).map(p => ({
            ...p,
            winRate: p.processed > 0 ? Math.round((p.wins / p.processed) * 100) : 0,
            avgTatDays: p.processed > 0 ? Math.round(p.totalTatMs / p.processed / (1000 * 60 * 60 * 24)) : 5
        })).sort((a, b) => b.totalValue - a.totalValue);

        const strategies = Object.values(strategyStats).map(s => ({
            ...s,
            winRate: s.attempts > 0 ? Math.round((s.wins / s.attempts) * 100) : 0
        })).sort((a, b) => b.winRate - a.winRate);

        const totalPendingValue = leads.filter(l => l.status !== 'Settled').reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);

        return res.status(200).json({
            payers,
            strategies,
            trends: systemicTrends,
            forecast: {
                totalPendingValue,
                weightedForecast: Math.round(totalPendingValue * 0.65),
                avgWinRate: 65
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
