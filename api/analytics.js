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
        const patterns = {};
        const rootCauses = {
            'Clinical': { count: 0, value: 0, color: '#3182ce' },
            'Administrative': { count: 0, value: 0, color: '#f6ad55' },
            'Regulatory': { count: 0, value: 0, color: '#e53e3e' }
        };

        leads.forEach(lead => {
            const payer = lead.insurance_type || "Unknown";
            const procedure = lead.title || "Unknown Procedure";
            const val = parseFloat(lead.estimated_value) || 0;

            // 1. Root Cause Categorization
            const code = lead.reason_code || "";
            if (code.startsWith('CO-') || code === '197') {
                rootCauses['Administrative'].count++;
                rootCauses['Administrative'].value += val;
            } else if (lead.status === 'CMS Escalated') {
                rootCauses['Regulatory'].count++;
                rootCauses['Regulatory'].value += val;
            } else {
                rootCauses['Clinical'].count++;
                rootCauses['Clinical'].value += val;
            }

            // 2. Payer Benchmarking
            if (!payerStats[payer]) {
                payerStats[payer] = { name: payer, count: 0, totalValue: 0, wins: 0, processed: 0, violations: 0, totalTatMs: 0 };
            }
            const p = payerStats[payer];
            p.count++;
            p.totalValue += val;
            if (lead.status === 'Settled') {
                p.processed++;
                if (lead.final_outcome === 'Approved') p.wins++;
            }

            // 3. Systemic Patterns
            const patternKey = `${payer}|${procedure}`;
            if (!patterns[patternKey]) patterns[patternKey] = { payer, procedure, count: 0, value: 0 };
            patterns[patternKey].count++;
            patterns[patternKey].value += val;
        });

        const payers = Object.values(payerStats).map(p => ({
            ...p,
            winRate: p.processed > 0 ? Math.round((p.wins / p.processed) * 100) : 65,
            riskScore: Math.min(100, Math.round((p.violations * 20) + (100 - (p.processed > 0 ? (p.wins/p.processed)*100 : 65)))),
            avgTatDays: 5
        })).sort((a, b) => b.riskScore - a.riskScore);

        return res.status(200).json({
            payers,
            rootCauses: Object.entries(rootCauses).map(([name, data]) => ({ name, ...data })),
            trends: Object.values(patterns).filter(p => p.count >= 2).sort((a, b) => b.value - a.value),
            forecast: {
                totalPendingValue: leads.filter(l => l.status !== 'Settled').reduce((s, l) => s + (parseFloat(l.estimated_value) || 0), 0),
                weightedForecast: Math.round(leads.filter(l => l.status !== 'Settled').reduce((s, l) => s + ((parseFloat(l.estimated_value) || 0) * 0.65), 0)),
                avgWinRate: 65
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
