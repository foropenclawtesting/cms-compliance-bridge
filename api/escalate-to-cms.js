const supabase = require('../services/supabaseClient');
const complaintGen = require('./services/complaint-generator');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId } = req.body;

    try {
        const { data: lead, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error || !lead) throw new Error('Lead not found');

        const complaintText = complaintGen.draftComplaint(lead);

        // Mark as formally escalated to CMS
        await supabase
            .from('healthcare_denial_leads')
            .update({ 
                status: 'CMS Escalated',
                submission_log: `Formal CMS Complaint Drafted on ${new Date().toISOString()}.`
            })
            .eq('id', lead.id);

        return res.status(200).json({ success: true, complaintText });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
