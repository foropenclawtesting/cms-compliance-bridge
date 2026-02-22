const supabase = require('../services/supabaseClient');
const appealGenerator = require('../services/appeal-generator');

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }

    try {
        // 1. Fetch pending high-priority leads
        const { data: leads, error: fetchError } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('priority', 'High Priority')
            .is('drafted_appeal', null);

        if (fetchError) throw fetchError;
        console.log(`[Auto-Appealer] Found ${leads.length} pending high-priority cases.`);

        const results = [];

        for (const lead of leads) {
            // 2. CLINICAL CROSS-REFERENCE: Look for matching intel
            // We search for research findings that mention keywords in the lead's pain point
            const keywords = ['cancer', 'mri', 'surgery', 'medication', 'biopsy'];
            const matchedKeyword = keywords.find(k => 
                lead.pain_point.toLowerCase().includes(k) || 
                lead.title.toLowerCase().includes(k)
            );

            let evidence = null;
            if (matchedKeyword) {
                const { data: intel } = await supabase
                    .from('clinical_intel')
                    .select('*')
                    .contains('keywords', [matchedKeyword])
                    .limit(1)
                    .single();
                evidence = intel;
                if (evidence) console.log(`[Auto-Appealer] Clinical Match Found: "${matchedKeyword}" -> ${evidence.title}`);
            }

            // 3. Calculate CMS-0057-F Deadline
            // 72 hours for High Priority (Urgent), 7 days for Standard
            const createdDate = new Date(lead.created_at);
            const deadlineHours = lead.priority === 'High Priority' ? 72 : (7 * 24);
            const dueAt = new Date(createdDate.getTime() + (deadlineHours * 60 * 60 * 1000));

            // 4. Generate Draft with Evidence & Synthesis
            const appealText = appealGenerator.draft({
                payerId: lead.insurance_type,
                claimId: `AUTO-${lead.id}`,
                reason: lead.pain_point,
                timestamp: lead.created_at,
                clinicalEvidence: evidence,
                clinicalSynthesis: lead.clinical_synthesis
            });

            // 5. Save back to Supabase
            await supabase
                .from('healthcare_denial_leads')
                .update({ 
                    drafted_appeal: appealText,
                    status: 'Drafted',
                    due_at: dueAt.toISOString()
                })
                .eq('id', lead.id);

            results.push({ id: lead.id, user: lead.username, matched: !!evidence });
        }
        
        return res.status(200).json({ processed: true, results, timestamp: new Date().toISOString() });

    } catch (error) {
        console.error('[Auto-Appealer Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
