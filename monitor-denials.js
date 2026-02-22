const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Credentials
const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
const supabaseKey = env.match(/SUP[A-Z_]*ANON_KEY[:=]\s*["']?([^"'\s]+)/)?.[1];

async function monitor() {
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .in('status', ['Healing Required', 'Settled']);

        if (error) throw error;

        leads.forEach(lead => {
            // 1. TRIGGER AGENTIC HEALING
            if (lead.status === 'Healing Required') {
                console.log(`---COMMAND_START---`);
                console.log(`TYPE: AGENTIC_HEAL`);
                console.log(`PAYER: ${lead.insurance_type}`);
                console.log(`LEAD_ID: ${lead.id}`);
                console.log(`INSTRUCTION: Search for the verified "Clinical Appeals & Grievances" fax number for ${lead.insurance_type}. Update the 'payer_rules' table or lead record with the result and reset status to 'Drafted' for re-transmission.`);
                console.log(`---COMMAND_END---`);
            }

            // 2. REPORT REVENUE VICTORIES
            if (lead.status === 'Settled' && lead.final_outcome === 'Approved' && lead.recovered_amount > 0) {
                // This is picked up by the message tool in the main session
                console.log(`URGENT: Victory for ${lead.username}. Recovered $${parseFloat(lead.recovered_amount).toLocaleString()}.`);
            }
        });
    } catch (err) { console.error('Monitor Error:', err.message); }
}

monitor();
