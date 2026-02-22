const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Credentials (handling the typo in the .env file if necessary)
const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
const supabaseKey = env.match(/SUP[A-Z_]*ANON_KEY[:=]\s*["']?([^"'\s]+)/)?.[1];

const STATE_FILE = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/notified_leads.json';

async function monitor() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials.');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Load local notification state
    let notifiedIds = [];
    if (fs.existsSync(STATE_FILE)) {
        notifiedIds = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }

    try {
        // Fetch High Priority leads with an existing draft
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('id, username, insurance_type, drafted_appeal')
            .eq('priority', 'High Priority')
            .not('drafted_appeal', 'is', null);

        if (error) throw error;

        const newLeads = leads.filter(l => !notifiedIds.includes(l.id));

        if (newLeads.length > 0) {
            console.log(`FOUND ${newLeads.length} NEW HIGH-PRIORITY APPEALS.`);
            
            // Output for the agent to catch in the heartbeat turn
            newLeads.forEach(lead => {
                console.log(`---NOTIFICATION_START---`);
                console.log(`URGENT: New High Priority Appeal drafted for ${lead.username} (${lead.insurance_type}).`);
                console.log(`Action Required: Review draft for Claim AUTO-${lead.id}.`);
                console.log(`---NOTIFICATION_END---`);
                notifiedIds.push(lead.id);
            });

            // Save state
            fs.writeFileSync(STATE_FILE, JSON.stringify(notifiedIds));
        } else {
            console.log('No new high-priority appeals detected.');
        }
    } catch (err) {
        console.error('Monitor Error:', err.message);
    }
}

monitor();
