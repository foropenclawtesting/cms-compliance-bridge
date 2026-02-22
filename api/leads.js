const fs = require('fs');

export default async function handler(req, res) {
    // Note: On Vercel, /Users/server/... won't exist. 
    // This is for local testing or if the path is symlinked in a hybrid setup.
    const LEADS_PATH = '/Users/server/openclaw/data/leads.json';

    try {
        if (fs.existsSync(LEADS_PATH)) {
            const leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8'));
            return res.status(200).json(leads);
        } else {
            return res.status(404).json({ error: 'Leads file not found. Ensure path accessibility.' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
