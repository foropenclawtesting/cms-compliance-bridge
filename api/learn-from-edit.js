const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Physician Learning Engine v1.0
 * Extracts strategic clinical defenses from manual physician edits.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId, originalText, editedText } = req.body;

    try {
        // 1. Identify the Lead to get Payer/Procedure context
        const { data: lead } = await supabase
            .from('healthcare_denial_leads')
            .select('insurance_type, title, reason_code')
            .eq('id', leadId)
            .single();

        if (!lead) throw new Error('Lead not found');

        console.log(`[Learning Engine] Analyzing physician edits for ${lead.title}...`);

        // 2. Logic: In a production environment, we would use an LLM here 
        // to summarize the 'improvement'. For this demo, we treat the 
        // entire edited synthesis as the new 'Gold Standard'.
        
        const strategyInsight = `Physician-Verified Defense: ${editedText.substring(0, 500)}...`;

        // 3. Upsert into Payer Rules (Auto-Programming the Strategy)
        await supabase
            .from('payer_rules')
            .upsert({ 
                payer_name: lead.insurance_type,
                reason_code: lead.reason_code,
                strategy: strategyInsight
            }, { onConflict: 'payer_name,reason_code' });

        return res.status(200).json({ success: true, learned: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
