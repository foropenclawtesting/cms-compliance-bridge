const supabase = require('../services/supabaseClient');
const appealGenerator = require('../services/appeal-generator');

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        // 1. Fetch pending leads (L1) OR Level 2 escalations (L2)
        // We look for Drafted (new) or Level 2 Pending (from Outcome Tracker)
        const { data: leads, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .or('status.eq.Drafted,status.eq.Level 2 Pending')
            .is('drafted_appeal', null);

        if (fetchError) throw fetchError;

        console.log(`[Auto-Appealer] Processing ${leads.length} cases (L1 + L2)...`);

        const results = [];

        for (const lead of leads) {
            // 2. Resolve Strategy and Outcome Decision
            const adjudication = await apiPoller.checkDenials(lead.insurance_type, `AUTO-${lead.id}`);
            
            // 3. Calculate CMS-0057-F Deadline
            const createdDate = new Date(lead.created_at);
            const deadlineHours = lead.priority === 'High Priority' ? 72 : (7 * 24);
            const dueAt = new Date(createdDate.getTime() + (deadlineHours * 60 * 60 * 1000));

            // 4. Generate Draft (using Adjudication Strategy)
            const appealText = appealGenerator.draft({
                payerId: lead.insurance_type,
                claimId: `AUTO-${lead.id}`,
                reason: lead.pain_point,
                timestamp: lead.created_at,
                clinicalSynthesis: lead.clinical_synthesis,
                strategy: adjudication.strategy,
                level: lead.status === 'Level 2 Pending' ? 2 : 1
            });

            // 5. Update Lead Status
            const newStatus = lead.status === 'Level 2 Pending' ? 'Drafted (L2)' : 'Drafted';
            
            const { error: updateError } = await supabase
                .from('healthcare_denial_leads')
                .update({ 
                    drafted_appeal: appealText,
                    status: newStatus,
                    due_at: dueAt.toISOString(),
                    reason_code: adjudication.reasonCode,
                    strategy: adjudication.strategy
                })
                .eq('id', lead.id);

            if (!updateError) {
                results.push({ id: lead.id, status: newStatus });
            }
        }
        
        return res.status(200).json({ processed: true, results, timestamp: new Date().toISOString() });

    } catch (error) {
        console.error('[Auto-Appealer Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
