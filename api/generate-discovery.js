const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Clinical Discovery Engine v1.0
 * Generates formal information demands for proprietary denial algorithms.
 */

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

        const discoveryText = `
DATE: ${new Date().toLocaleDateString()}
TO: ${lead.insurance_type} - Legal Department / Compliance Office
RE: FORMAL DISCOVERY REQUEST & INFORMATION DEMAND
Claim ID: ${lead.id} | Procedure: ${lead.title}
MANDATE: CMS-0057-F & ERISA Section 503

Dear Legal Counsel,

Despite multiple clinical appeals and verified evidence-based defenses, you have failed to provide a granular clinical justification for the denial of the above-referenced claim.

Pursuant to the Interoperability and Prior Authorization Final Rule (CMS-0057-F), we hereby demand the immediate production of the following:

1. THE COMPLETE CLINICAL RECORD used for this determination.
2. THE SPECIFIC ALGORITHMIC CRITERIA or "Shadow Rules" applied to this procedure.
3. THE CREDENTIALS OF THE REVIEWING PHYSICIAN (if any) who performed the medical necessity audit.

Failure to produce these documents within 72 hours will be interpreted as a bad-faith denial and will result in an immediate formal report to the CMS Regional Office and state insurance regulators.

Respectfully,
Department of Revenue Integrity
CMS Compliance Bridge - Litigation Support
        `.trim();

        // Mark lead as in 'Legal Discovery' phase
        await supabase
            .from('healthcare_denial_leads')
            .update({ 
                status: 'Discovery Phase',
                submission_log: `Litigation Discovery Demand Drafted on ${new Date().toISOString()}.`
            })
            .eq('id', lead.id);

        return res.status(200).json({ discoveryText });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
