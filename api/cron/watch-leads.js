const supabase = require('../services/supabaseClient');
const appealGenerator = require('../services/appeal-generator');
const apiPoller = require('../services/api-poller');

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        // 1. Fetch pending leads (L1 or L2)
        const { data: leads, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .or('status.eq.New,status.eq.Level 2 Pending')
            .is('drafted_appeal', null);

        if (fetchError) throw fetchError;
        console.log(`[Strategic-Appealer] Processing ${leads.length} cases...`);

        // 2. Fetch Historical Win-Rate Data for Strategy Selection
        const { data: history } = await supabase
            .from('healthcare_denial_leads')
            .select('insurance_type, strategy, final_outcome')
            .eq('final_outcome', 'Approved');

        // Create a lookup of "Winningest Strategy" per Payer
        const winningTactics = (history || []).reduce((acc, curr) => {
            const key = curr.insurance_type;
            if (!acc[key]) acc[key] = {};
            acc[key][curr.strategy] = (acc[key][curr.strategy] || 0) + 1;
            return acc;
        }, {});

        const results = [];

        for (const lead of leads) {
            // 3. Select Strategy: Check history, else fallback to Reason Code mapping
            const payerHistory = winningTactics[lead.insurance_type] || {};
            let bestStrategy = Object.keys(payerHistory).reduce((a, b) => payerHistory[a] > payerHistory[b] ? a : b, null);
            
            if (!bestStrategy) {
                const adjudication = await apiPoller.checkDenials(lead.insurance_type, `AUTO-${lead.id}`);
                bestStrategy = adjudication.strategy;
            }

            console.log(`[Strategy Engine] Selected ${bestStrategy} for ${lead.insurance_type} (Based on historical wins)`);

            // 4. Calculate Deadline
            const createdDate = new Date(lead.created_at);
            const deadlineHours = lead.priority === 'High Priority' ? 72 : (7 * 24);
            const dueAt = new Date(createdDate.getTime() + (deadlineHours * 60 * 60 * 1000));

            // 5. Generate Draft
            const appealText = appealGenerator.draft({
                payerId: lead.insurance_type,
                claimId: `AUTO-${lead.id}`,
                reason: lead.pain_point,
                timestamp: lead.created_at,
                clinicalSynthesis: lead.clinical_synthesis,
                strategy: bestStrategy,
                level: lead.status === 'Level 2 Pending' ? 2 : 1
            });

            // 6. Persist to Supabase
            const newStatus = lead.status === 'Level 2 Pending' ? 'Drafted (L2)' : 'Drafted';
            await supabase
                .from('healthcare_denial_leads')
                .update({ 
                    drafted_appeal: appealText,
                    status: newStatus,
                    due_at: dueAt.toISOString(),
                    strategy: bestStrategy
                })
                .eq('id', lead.id);

            results.push({ id: lead.id, strategy: bestStrategy });
        }
        
        return res.status(200).json({ processed: true, results });

    } catch (error) {
        console.error('[Strategic-Appealer Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
