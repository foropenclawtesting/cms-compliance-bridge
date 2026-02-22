const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Audit Trail API v1.0
 * Provides a time-series log of all regulatory events.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    try {
        const { data, error } = await supabase
            .from('healthcare_denial_leads')
            .select('id, username, insurance_type, status, submitted_at, settled_at, submission_log')
            .not('submitted_at', 'is', null)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        // Transform log into regulatory event stream
        const events = data.map(lead => ({
            timestamp: lead.submitted_at,
            patient: lead.username,
            payer: lead.insurance_type,
            action: lead.status === 'Settled' ? 'REVENUE_RECOVERED' : 'APPEAL_TRANSMITTED',
            details: lead.submission_log?.split('\n').pop()
        }));

        return res.status(200).json(events);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
