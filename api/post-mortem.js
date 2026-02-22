const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Victory Playbook Engine v1.0
 * Analyzes successful appeals to extract winning clinical strategies.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId } = req.body;

    try {
        console.log(`[Post-Mortem] Analyzing winning clinical defense for Lead ${leadId}...`);

        // 1. Fetch the full history of the winning lead
        const { data: lead } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        // 2. Extract the "Winning Narrative"
        // In production, this would use an LLM to identify the specific 
        // citation that deviated from the initial draft.
        const winningStrategy = `PROVEN WINNER: ${lead.edited_appeal ? 'Physician-refined' : 'AI-synthesized'} defense citing ${lead.title} standards.`;

        // 3. Update the Payer Rules to "Lock In" the victory
        await supabase
            .from('payer_rules')
            .upsert({ 
                payer_name: lead.insurance_type,
                reason_code: lead.reason_code,
                strategy: winningStrategy
            }, { onConflict: 'payer_name,reason_code' });

        return res.status(200).json({ success: true, playbook_updated: true });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
