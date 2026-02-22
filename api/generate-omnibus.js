const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Omnibus Defense Engine v1.0
 * Aggregates systemic denials into a single regulatory demand.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { payer, procedure } = req.body;

    try {
        // 1. Fetch all associated leads for this systemic pattern
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('insurance_type', payer)
            .eq('title', procedure)
            .not('status', 'eq', 'Settled');

        if (error || !leads.length) throw new Error('No active denials found for this pattern.');

        const totalValue = leads.reduce((s, l) => s + (parseFloat(l.estimated_value) || 0), 0);
        const claimIds = leads.map(l => l.id).join(', ');

        // 2. Draft the Systemic Regulatory Demand
        const omnibusText = `
DATE: ${new Date().toLocaleDateString()}
TO: ${payer} - Office of the Chief Medical Officer / Regulatory Affairs
RE: SYSTEMIC REGULATORY DEMAND - BATCH APPEAL
MANDATE: CMS-0057-F Interoperability & Prior Authorization Final Rule
Total Claims: ${leads.length} | Aggregate Value: $${totalValue.toLocaleString()}

Dear Chief Medical Officer,

This letter serves as an Omnibus Regulatory Demand regarding a systemic denial pattern identified for ${procedure}. 

Our clinical audit system has detected ${leads.length} concurrent denials for this procedure, all of which align with established Standards of Care and your own published Medical Policies. 

CLAIMS INCLUDED IN THIS DEMAND:
${leads.map(l => `- Claim #${l.id}: ${l.username} ($${l.estimated_value})`).join('\n')}

REGULATORY NOTICE:
Under CMS-0057-F, payers are prohibited from using automated denial algorithms that fail to account for patient-specific clinical data. The lack of granular justification for these ${leads.length} denials suggests a systemic compliance failure.

We request an immediate systemic redetermination of all claims listed above within 72 hours. Failure to respond will result in a formal report to the CMS Regional Office regarding algorithmic bias and timing violations.

Respectfully,
Department of Revenue Integrity
CMS Compliance Bridge - Omnibus Division
        `.trim();

        return res.status(200).json({ 
            text: omnibusText,
            count: leads.length,
            totalValue
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
