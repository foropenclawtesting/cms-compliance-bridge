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

        leads.forEach(lead => {
            const payer = lead.insurance_type || "Unknown";
            const strategy = lead.strategy || "STANDARD";
            const outcome = lead.final_outcome;

            if (!payerStats[payer]) {
                payerStats[payer] = { 
                    name: payer, count: 0, wins: 0, processed: 0, 
                    strategies: {}, bestStrategy: 'STANDARD_CMS_COMPLIANCE' 
                };
            }
            const p = payerStats[payer];
            p.count++;

            if (lead.status === 'Settled') {
                p.processed++;
                if (!p.strategies[strategy]) p.strategies[strategy] = { attempts: 0, wins: 0 };
                p.strategies[strategy].attempts++;
                
                if (outcome === 'Approved') {
                    p.wins++;
                    p.strategies[strategy].wins++;
                }
            }
        });

        // Determine Best Strategy per Payer based on Win Rate
        const payers = Object.values(payerStats).map(p => {
            let topWinRate = -1;
            let bestStr = 'STANDARD_CMS_COMPLIANCE';

            Object.entries(p.strategies).forEach(([name, stats]) => {
                const wr = stats.wins / stats.attempts;
                if (wr > topWinRate) {
                    topWinRate = wr;
                    bestStr = name;
                }
            });

            return {
                ...p,
                winRate: p.processed > 0 ? Math.round((p.wins / p.processed) * 100) : 0,
                bestStrategy: bestStr
            };
        }).sort((a, b) => b.count - a.count);

        return res.status(200).json({ payers });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
