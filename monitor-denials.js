const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Credentials from .env
const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
let supabaseUrl, supabaseKey;

try {
    const env = fs.readFileSync(envPath, 'utf8');
    supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
    supabaseKey = env.match(/SUP[A-Z_]*ANON_KEY[:=]\s*["']?([^"'\s]+)/)?.[1];
} catch (e) {
    console.error('Could not load .env file');
}

async function monitor() {
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .not('status', 'eq', 'Settled');

        if (error) throw error;

        const notifications = [];

        leads.forEach(lead => {
            // 1. AUTONOMOUS P2P OPPORTUNITY (High Value > $10k)
            if (parseFloat(lead.estimated_value) >= 10000 && lead.status === 'Submitted') {
                notifications.push({
                    type: 'P2P_OPPORTUNITY',
                    leadId: lead.id,
                    patient: lead.username,
                    amount: lead.estimated_value,
                    message: `HIGH-VALUE P2P OPPORTUNITY: $${parseFloat(lead.estimated_value).toLocaleString()} claim for ${lead.username} is eligible for Peer-to-Peer. Pre-briefing generated.`
                });
            }

            // 2. DEADLINE VIOLATION DETECTION
            if (lead.due_at && new Date(lead.due_at) < new Date() && lead.status === 'Submitted') {
                notifications.push({ type: 'REGULATORY_VIOLATION', leadId: lead.id, payer: lead.insurance_type });
            }

            // 3. AGENTIC HEALING & VISION TRIGGERS
            if (lead.status === 'Healing Required') notifications.push({ type: 'AGENTIC_HEAL', leadId: lead.id, payer: lead.insurance_type });
            if (lead.status === 'OCR Required') notifications.push({ type: 'VISION_OCR', leadId: lead.id });
            if (lead.status === 'New' && (!lead.defense_audit || lead.defense_audit.score < 70)) {
                notifications.push({ type: 'SELF_REFINE', leadId: lead.id });
            }
        });

        if (notifications.length > 0) {
            console.log(JSON.stringify(notifications, null, 2));
        }
    } catch (err) { 
        console.error('Monitor Error:', err.message); 
    }
}

monitor();
