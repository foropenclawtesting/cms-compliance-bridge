const supabase = require('../services/supabaseClient');
const appealGenerator = require('../services/appeal-generator');

export default async function handler(req, res) {
    // Basic Cron Auth check
    const authHeader = req.headers['authorization'];
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        // 1. Fetch pending high-priority leads that don't have a draft yet
        const { data: leads, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('priority', 'High Priority')
            .is('drafted_appeal', null);

        if (fetchError) throw fetchError;

        console.log(`[Auto-Appealer] Found ${leads.length} pending high-priority cases.`);

        const results = [];

        // 2. Loop through and generate drafts
        for (const lead of leads) {
            console.log(`[Auto-Appealer] Drafting appeal for ${lead.username} / Claim ${lead.id}...`);
            
            const appealText = appealGenerator.draft({
                payerId: lead.insurance_type,
                claimId: `AUTO-${lead.id}`,
                reason: lead.pain_point,
                timestamp: lead.created_at
            });

            // 3. Save the draft back to Supabase and mark as 'Drafted'
            const { error: updateError } = await supabase
                .from('healthcare_denial_leads')
                .update({ 
                    drafted_appeal: appealText,
                    status: 'Drafted' 
                })
                .eq('id', lead.id);

            if (updateError) {
                console.error(`Failed to update lead ${lead.id}:`, updateError.message);
            } else {
                results.push({ id: lead.id, user: lead.username, status: 'Success' });
            }
        }
        
        return res.status(200).json({
            processed: true,
            totalFound: leads.length,
            results: results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Auto-Appealer Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
