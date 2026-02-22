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
        const patterns = {};

        leads.forEach(lead => {
            // 1. SYSTEMIC PATTERN DETECTION (Autonomous Escalation)
            const patternKey = `${lead.insurance_type}|${lead.title}`;
            if (!patterns[patternKey]) patterns[patternKey] = { payer: lead.insurance_type, procedure: lead.title, count: 0, value: 0, ids: [] };
            patterns[patternKey].count++;
            patterns[patternKey].value += parseFloat(lead.estimated_value) || 0;
            patterns[patternKey].ids.push(lead.id);

            // 2. INDIVIDUAL STATUS TRIGGERS
            if (lead.status === 'Healing Required') {
                notifications.push({ type: 'AGENTIC_HEAL', payer: lead.insurance_type, leadId: lead.id, message: `Fax failure for ${lead.insurance_type}.` });
            }
            if (lead.status === 'OCR Required') {
                notifications.push({ type: 'VISION_OCR', leadId: lead.id, message: `Paper rejection received for ${lead.username}.` });
            }
            if (lead.status === 'New' && (!lead.defense_audit || lead.defense_audit.score < 70)) {
                notifications.push({ type: 'SELF_REFINE', leadId: lead.id, message: `Low defense score for ${lead.username}.` });
            }
        });

        // 3. TRIGGER OMNIBUS ESCALATION FOR HIGH-STAKES PATTERNS (>$100k)
        Object.values(patterns).forEach(p => {
            if (p.value >= 100000 && p.count >= 5) {
                notifications.push({
                    type: 'OMNIBUS_AUTO_TRANSMIT',
                    payer: p.payer,
                    procedure: p.procedure,
                    value: p.value,
                    count: p.count,
                    message: `SYSTEMIC LEAK DETECTED: $${p.value.toLocaleString()} in ${p.payer} denials for ${p.procedure}. Triggering autonomous Omnibus demand.`
                });
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
