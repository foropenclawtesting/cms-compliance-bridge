const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Clinical Audit Exporter v1.0
 * Generates a comprehensive evidence package for legal/regulatory review.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId } = req.query;

    try {
        const { data: lead, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error || !lead) throw new Error('Lead not found');

        const auditPackage = {
            clinical_file: {
                patient: lead.username,
                procedure: lead.title,
                value: lead.estimated_value,
                outcome: lead.final_outcome
            },
            regulatory_trail: {
                submitted_at: lead.submitted_at,
                due_at: lead.due_at,
                settled_at: lead.settled_at,
                compliance_status: lead.status === 'Settled' ? 'PASSED' : 'UNDER_REVIEW'
            },
            evidence_locker: {
                synthesis: lead.clinical_synthesis,
                internal_rules_applied: lead.strategy,
                payer_rejection_parsed: lead.submission_log
            },
            transmission_log: lead.submission_log
        };

        // In production, this generates a formatted PDF/ZIP stream
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=AUDIT_PACKAGE_${leadId}.json`);
        
        return res.status(200).send(JSON.stringify(auditPackage, null, 2));

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
