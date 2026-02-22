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

        const now = new Date();
        const payerStats = {};
        const patterns = {};

        leads.forEach(lead => {
            const payer = lead.insurance_type || "Unknown";
            const procedure = lead.title || "Unknown Procedure";

            if (!payerStats[payer]) {
                payerStats[payer] = { 
                    name: payer, count: 0, totalValue: 0, wins: 0, processed: 0, 
                    violations: 0, totalTatMs: 0, bestStrategy: 'STANDARD' 
                };
            }
            const p = payerStats[payer];
            p.count++;
            p.totalValue += parseFloat(lead.estimated_value) || 0;
            
            // Track Regulatory Violations (Deadline Missed)
            if (lead.status === 'Escalated' || (lead.due_at && new Date(lead.due_at) < now && lead.status !== 'Settled')) {
                p.violations++;
            }

            if (lead.status === 'Settled') {
                p.processed++;
                if (lead.final_outcome === 'Approved') p.wins++;
                if (lead.submitted_at && lead.settled_at) {
                    p.totalTatMs += (new Date(lead.settled_at) - new Date(lead.submitted_at));
                }
            }

            const patternKey = `${payer}|${procedure}`;
            if (!patterns[patternKey]) patterns[patternKey] = { payer, procedure, count: 0, value: 0 };
            patterns[patternKey].count++;
            patterns[patternKey].value += parseFloat(lead.estimated_value) || 0;
        });

        const stats = Object.values(payerStats).map(p => {
            const winRate = p.processed > 0 ? (p.wins / p.processed) : 0.65;
            // Risk Score: Higher violations and lower win rates = Higher Risk
            const riskScore = Math.min(100, Math.round((p.violations * 20) + ((1 - winRate) * 50)));
            
            return {
                ...p,
                winRate: Math.round(winRate * 100),
                riskScore,
                avgTatDays: p.processed > 0 ? Math.round(p.totalTatMs / p.processed / (1000 * 60 * 60 * 24)) : 5
            };
        }).sort((a, b) => b.riskScore - a.riskScore);

        return res.status(200).json({
            payers: stats,
            trends: Object.values(patterns).filter(p => p.count >= 2).sort((a, b) => b.value - a.value),
            forecast: {
                totalPendingValue: leads.filter(l => l.status !== 'Settled').reduce((s, l) => s + (parseFloat(l.estimated_value) || 0), 0),
                weightedForecast: 0 // handled in UI
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
