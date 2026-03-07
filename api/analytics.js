const supabase = require('../services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Enterprise Analytics & Compliance Engine v1.2
 * Calculates risk-adjusted forecasts and CMS-0057-F compliance scores.
 */

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

            // 2. Payer Benchmarking & Compliance
            if (!payerStats[payer]) {
                payerStats[payer] = { 
                    name: payer, 
                    count: 0, 
                    totalValue: 0, 
                    wins: 0, 
                    processed: 0, 
                    violations: 0, 
                    avgTatDays: 5.2 
                };
            }
            const p = payerStats[payer];
            p.count++;
            p.totalValue += val;
            if (lead.status === 'Settled' || lead.status === 'CMS Escalated') {
                p.processed++;
                if (lead.status === 'Settled') p.wins++;
                if (lead.status === 'CMS Escalated') p.violations++;
            }

            // 3. Systemic Patterns
            const patternKey = `${payer}|${procedure}`;
            if (!patterns[patternKey]) patterns[patternKey] = { payer, procedure, count: 0, value: 0 };
            patterns[patternKey].count++;
            patterns[patternKey].value += val;
        });

        const payers = Object.values(payerStats).map(p => {
            const winRate = p.processed > 0 ? Math.round((p.wins / p.processed) * 100) : 65;
            // Compliance Score: Higher is better. Penalized by violations and long TAT.
            const complianceScore = Math.max(0, 100 - (p.violations * 15) - (p.avgTatDays * 2));
            
            return {
                ...p,
                winRate,
                compliance_score: complianceScore,
                avg_response_hours: Math.round(p.avgTatDays * 24)
            };
        }).sort((a, b) => a.compliance_score - b.compliance_score);

        // Calculate Risk-Adjusted Weighted Forecast
        let totalPendingValue = 0;
        let weightedForecast = 0;

        leads.filter(l => l.status !== 'Settled').forEach(l => {
            const val = parseFloat(l.estimated_value) || 0;
            const payerData = payers.find(p => p.name === l.insurance_type);
            const prob = payerData ? payerData.winRate : 65;
            
            totalPendingValue += val;
            weightedForecast += (val * (prob / 100));
        });

        return res.status(200).json({
            payers,
            rootCauses: Object.entries(rootCauses).map(([name, data]) => ({ name, ...data })),
            trends: Object.values(patterns).filter(p => p.count >= 2).sort((a, b) => b.value - a.value),
            forecast: {
                totalPendingValue,
                weightedForecast: Math.round(weightedForecast),
                avgWinRate: payers.length > 0 ? Math.round(payers.reduce((s, p) => s + p.winRate, 0) / payers.length) : 65
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
