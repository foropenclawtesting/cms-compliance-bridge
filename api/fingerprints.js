const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Payer Behavior Fingerprinting v1.0
 * Analyzes rejection patterns to identify "Shadow Rules" used by specific payers.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    try {
        const { data: leads } = await supabase
            .from('healthcare_denial_leads')
            .select('insurance_type, pain_point, status, reason_code')
            .not('pain_point', 'is', null);

        const fingerprints = {};

        leads.forEach(lead => {
            const payer = lead.insurance_type;
            if (!fingerprints[payer]) fingerprints[payer] = { 
                name: payer, 
                shadow_rules: [], 
                common_denials: {},
                ignore_patterns: []
            };

            const fp = fingerprints[payer];
            const reason = lead.pain_point.toLowerCase();

            // Detect common "Shadow Rules" (e.g., ignoring specific types of evidence)
            if (reason.includes('experimental') || reason.includes('investigational')) {
                fp.shadow_rules.push('Strict SOC Interpretation');
            }
            if (reason.includes('step therapy')) {
                fp.shadow_rules.push('Aggressive Step-1 Enforcement');
            }

            fp.common_denials[lead.reason_code] = (fp.common_denials[lead.reason_code] || 0) + 1;
        });

        // Unique shadow rules only
        const result = Object.values(fingerprints).map(f => ({
            ...f,
            shadow_rules: [...new Set(f.shadow_rules)]
        }));

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
