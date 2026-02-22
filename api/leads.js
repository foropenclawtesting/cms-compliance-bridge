const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');
const ehr = require('./services/ehr-extractor');

export default async function handler(req, res) {
    // 1. Auth Check
    const user = await verifyUser(req, res);
    if (!user) return;

    try {
        // 2. Fetch leads
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 3. Fetch all clinical research findings to perform matching
        const { data: intel } = await supabase
            .from('clinical_intel')
            .select('*');

        // 3. Fetch Payer-Specific Programmable Rules
        const { data: rules } = await supabase
            .from('payer_rules')
            .select('*');

        const enrichedLeads = leads.map(lead => {
            // A. Match Clinical Intel (Research)
            const match = (intel || []).find(finding => {
                const keywords = finding.keywords || [];
                return keywords.some(k => 
                    lead.title?.toLowerCase().includes(k.toLowerCase()) || 
                    lead.pain_point?.toLowerCase().includes(k.toLowerCase())
                );
            });

            // B. Match Strategic Rules (Your Programmed Logic)
            const customRule = (rules || []).find(r => 
                r.payer_name?.toLowerCase() === lead.insurance_type?.toLowerCase() &&
                r.reason_code === lead.reason_code
            );

            // C. Calculate Success Probability
            const winRate = 65; 
            const strategyMultiplier = customRule ? 1.25 : 1.0; // Rules increase win probability by 25%
            const urgencyMultiplier = lead.priority === 'High Priority' ? 1.15 : 1.0;
            const probability = Math.min(98, Math.round(winRate * urgencyMultiplier * strategyMultiplier));

            return {
                id: lead.id,
                user: lead.username,
                title: lead.title,
                url: lead.url,
                pain_point: lead.pain_point,
                insurance_type: lead.insurance_type,
                priority: lead.priority,
                status: lead.status,
                drafted_appeal: lead.drafted_appeal,
                edited_appeal: lead.edited_appeal,
                clinical_synthesis: lead.clinical_synthesis,
                estimated_value: lead.estimated_value,
                due_at: lead.due_at,
                final_outcome: lead.final_outcome,
                recovered_amount: lead.recovered_amount,
                submission_status: lead.submission_status,
                submission_log: lead.submission_log,
                success_probability: probability,
                custom_strategy: customRule?.strategy || null,
                clinical_evidence: match || null
            };
        });

        return res.status(200).json(enrichedLeads);
    } catch (error) {
        console.error('[Leads API Error]:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
