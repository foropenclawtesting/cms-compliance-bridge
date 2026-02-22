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
            .in('status', ['Healing Required', 'Settled']);

        if (error) throw error;

        const notifications = [];

        leads.forEach(lead => {
            // 1. AGENTIC HEALING TRIGGER
            if (lead.status === 'Healing Required') {
                notifications.push({
                    type: 'AGENTIC_HEAL',
                    payer: lead.insurance_type,
                    leadId: lead.id,
                    message: `Fax transmission failed for ${lead.insurance_type}. Initiation Agentic Healing loop.`
                });
            }

            // 2. REVENUE VICTORY REPORT
            if (lead.status === 'Settled' && lead.final_outcome === 'Approved' && lead.recovered_amount > 0) {
                notifications.push({
                    type: 'VICTORY',
                    patient: lead.username,
                    amount: parseFloat(lead.recovered_amount),
                    payer: lead.insurance_type,
                    message: `Victory! Recovered $${parseFloat(lead.recovered_amount).toLocaleString()} from ${lead.insurance_type} for ${lead.username}.`
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
