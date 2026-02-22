const fs = require('fs');
const path = require('path');

const LEADS_PATH = '/Users/server/openclaw/data/leads.json';

console.log('⚡ Lead Watcher started. Monitoring for new healthcare denials...');

// Simple polling-based watcher for production stability
let lastLeadsCount = 0;

function watchLeads() {
    if (!fs.existsSync(LEADS_PATH)) return;

    try {
        const data = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8'));
        
        if (data.length > lastLeadsCount) {
            const newLeads = data.slice(lastLeadsCount);
            newLeads.forEach(lead => {
                if (lead.priority === 'High Priority') {
                    console.log(`🚨 ALERT: New High Priority Lead found for ${lead.user} (${lead.insurance_type})`);
                    console.log(`💡 AUTOMATION: Preparing compliance audit for: ${lead.pain_point}`);
                } else {
                    console.log(`📝 LOG: New lead identified: ${lead.user}`);
                }
            });
            lastLeadsCount = data.length;
        }
    } catch (err) {
        console.error('Error reading leads for watcher:', err.message);
    }
}

// Initial check
watchLeads();

// Watch every 30 seconds
setInterval(watchLeads, 30000);
