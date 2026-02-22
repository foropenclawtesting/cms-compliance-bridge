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
        // Fetch leads that are Drafted but not yet Submitted
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('id, username, insurance_type, priority, due_at, status')
            .eq('status', 'Drafted')
            .not('due_at', 'is', null);

        if (error) throw error;

        const now = new Date();
        const urgentThreshold = 24 * 60 * 60 * 1000; // 24 hours

        leads.forEach(lead => {
            const timeLeft = new Date(lead.due_at) - now;
            
            // 1. Alert on New High Priority Drafts
            if (lead.priority === 'High Priority' && !notifiedIds.includes(`new-${lead.id}`)) {
                console.log(`---NOTIFICATION_START---`);
                console.log(`URGENT: New High-Priority Draft ready for ${lead.username}.`);
                console.log(`Action: Review and Transmit to ${lead.insurance_type}.`);
                console.log(`---NOTIFICATION_END---`);
                notifiedIds.push(`new-${lead.id}`);
            }

            // 2. Alert on Approaching Deadlines (< 24h)
            if (timeLeft > 0 && timeLeft < urgentThreshold && !notifiedIds.includes(`deadline-${lead.id}`)) {
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                console.log(`---NOTIFICATION_START---`);
                console.log(`⚠️ DEADLINE ALERT: Appeal for ${lead.username} expires in ${hoursLeft} hours!`);
                console.log(`Regulatory: CMS-0057-F window closing for ${lead.insurance_type}.`);
                console.log(`---NOTIFICATION_END---`);
                notifiedIds.push(`deadline-${lead.id}`);
            }
        });

        fs.writeFileSync(STATE_FILE, JSON.stringify(notifiedIds));
    } catch (err) {
        console.error('Monitor Error:', err.message);
    }
}

monitor();
