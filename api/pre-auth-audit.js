const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Pre-Authorization Guard v1.0
 * Audits clinical evidence against Hive Mind precedents BEFORE submission.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { payer, procedure, clinicalEvidence } = req.body;

    try {
        console.log(`[Pre-Auth Guard] Auditing ${procedure} for ${payer}...`);

        // 1. Fetch the latest Winning Precedents from the Hive Mind
        const { data: precedents } = await supabase
            .from('clinical_intel')
            .select('*')
            .ilike('keywords', `%${procedure.toLowerCase()}%`)
            .limit(3);

        // 2. Simulate Payer Scrutiny
        // In production, this uses an LLM to find "Gaps" in the provided evidence.
        const audit = {
            score: 82,
            status: 'CAUTION',
            gaps: [
                "Missing explicit mention of 'Stage IV' staging in the primary narrative.",
                "Step Therapy (Drug X) documentation is present but needs clearer failure dates."
            ],
            winning_moves: precedents.map(p => p.summary),
            recommendation: "Inject Section 422.568 clinical granularity citation to prevent algorithmic auto-rejection."
        };

        if (clinicalEvidence.toLowerCase().includes('stage iv')) {
            audit.score = 98;
            audit.status = 'READY';
            audit.gaps = [];
        }

        return res.status(200).json(audit);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
