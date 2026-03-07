const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * P2P War Room Simulator v1.0
 * Simulates a hostile payer medical director for clinical combat training.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId, messages } = req.body;

    try {
        const { data: lead } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        console.log(`[War Room] Simulating ${lead.insurance_type} for Lead ${leadId}...`);

        // In production, this uses an LLM with the Payer's Behavioral Fingerprint.
        // We simulate a common "Trap" question for oncology staging.
        const lastMessage = messages[messages.length - 1].text.toLowerCase();
        
        let response = "I hear you, doctor. But our policy is clear: we require 30 days of Step Therapy before we can approve this biologic. Why wasn't Drug X attempted first?";

        if (lastMessage.includes('stage iv') || lastMessage.includes('soc')) {
            response = "While JAMA might suggest that for Stage IV, our internal adjudication algorithm classifies this as 'Experimental' for this specific diagnosis code. Do you have peer-reviewed data that explicitly overrides NCD 210.3?";
        }

        if (lastMessage.includes('210.3') || lastMessage.includes('cms-0057-f')) {
            response = "Wait... you're citing 0057-F? (Internal Payer Note: Physician is informed on Interoperability Rule). Okay, if you can confirm the medication failure dates for Drug X, we might have a path to reversal.";
        }

        return res.status(200).json({
            role: 'Hostile Reviewer',
            text: response,
            counter_move: "Cite the CMS-0057-F 'Granular Justification' requirement now to force a reversal."
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
