const supabase = require('./services/supabaseClient');

export default async function handler(req, res) {
    try {
        const { data, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map Supabase fields to the UI's expected format if they differ
        const leads = data.map(lead => ({
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
            estimated_value: lead.estimated_value,
            due_at: lead.due_at,
            final_outcome: lead.final_outcome,
            recovered_amount: lead.recovered_amount,
            settled_at: lead.settled_at,
            submission_status: lead.submission_status,
            clinical_evidence: lead.clinical_intel // Assuming a join or stored object
        }));

        return res.status(200).json(leads);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
