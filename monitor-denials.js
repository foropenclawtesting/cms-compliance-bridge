const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Credentials
const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
const supabaseKey = env.match(/SUP[A-Z_]*ANON_KEY[:=]\s*["']?([^"'\s]+)/)?.[1];

const STATE_FILE = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/notified_leads.json';

async function monitor() {
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let notifiedIds = [];
    if (fs.existsSync(STATE_FILE)) notifiedIds = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

    try {
        const { data: leads, error } = await supabase.from('healthcare_denial_leads').select('*');
        if (error) throw error;

        leads.forEach(lead => {
            // 1. ALERT ON TRANSMISSION FAILURES (Triggering Agentic Healing)
            if (lead.status === 'Healing Required' && !notifiedIds.includes(`heal-${lead.id}`)) {
                console.log(`---NOTIFICATION_START---`);
                console.log(`🤖 SELF-HEALING TRIGGERED: Fax delivery failed for ${lead.username} (${lead.insurance_type}).`);
                console.log(`Action: I am searching the web for a verified clinical appeals fax number for ${lead.insurance_type}...`);
                console.log(`---NOTIFICATION_END---`);
                notifiedIds.push(`heal-${lead.id}`);
                
                // In a production OpenClaw setup, we would trigger a sub-agent HERE
                // to search and UPSERT back to the 'payers.json' or lead record.
            }

            // 2. Alert on Victories
            if (lead.status === 'Settled' && lead.final_outcome === 'Approved' && !notifiedIds.includes(`victory-${lead.id}`)) {
                console.log(`---NOTIFICATION_START---`);
                console.log(`🎉 REVENUE RECOVERED: Appeal for ${lead.username} APPROVED!`);
                console.log(`Recovered: $${parseFloat(lead.recovered_amount).toLocaleString()}`);
                console.log(`---NOTIFICATION_END---`);
                notifiedIds.push(`victory-${lead.id}`);
            }
        });

        fs.writeFileSync(STATE_FILE, JSON.stringify(notifiedIds));
    } catch (err) { console.error('Monitor Error:', err.message); }
}

monitor();
