const supabase = require('./services/supabaseClient');
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

        // Synthesize the "Cheat Sheet" for the Physician
        const briefing = `
⚡ PHYSICIAN P2P BRIEFING: ${lead.username}
--------------------------------------------------
PAYER: ${lead.insurance_type}
STAKE: $${parseFloat(lead.estimated_value).toLocaleString()}
DEADLINE: ${new Date(lead.due_at).toLocaleString()}

DEFENSE STRATEGY: ${lead.strategy || 'Clinical Necessity'}

KEY TALKING POINTS FOR MEDICAL DIRECTOR:
1. ${lead.title} is the established SOC (Standard of Care).
2. The denial for "${lead.pain_point}" contradicts Payer Policy.
3. ${lead.clinical_synthesis || 'Awaiting Medical Director Synthesis...'}

REGULATORY LEVERAGE:
Mention CMS-0057-F. Remind the reviewer that a lack of granular 
clinical justification in the FHIR response is a compliance violation.
--------------------------------------------------
CONFIDENTIAL - CLINICAL USE ONLY
        `.trim();

        return res.status(200).json({ briefing });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
