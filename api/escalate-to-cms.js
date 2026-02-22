const supabase = require('../services/supabaseClient');
const complaintGen = require('./services/complaint-generator');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId, type } = req.body;

    try {
        const { data: lead, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error || !lead) throw new Error('Lead not found');

        const complaintText = complaintGen.draftComplaint(lead, type || 'CMS');

        // Mark as formally escalated
        const newStatus = type === 'PAYER_VIOLATION' ? 'Escalated' : 'CMS Escalated';
        
        await supabase
            .from('healthcare_denial_leads')
            .update({ 
                status: newStatus,
                submission_log: `${lead.submission_log}\n[${new Date().toISOString()}] Formal Notice (${newStatus}) Drafted.`
            })
            .eq('id', lead.id);

        return res.status(200).json({ success: true, complaintText });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
