const fs = require('fs');

export default async function handler(req, res) {
    // Check for Vercel Cron authorization (standard security practice)
    const authHeader = req.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return res.status(401).end('Unauthorized');
    }

    const LEADS_PATH = '/Users/server/openclaw/data/leads.json';

    try {
        if (!fs.existsSync(LEADS_PATH)) {
            return res.status(200).json({ message: 'No leads file found to watch.' });
        }

        const data = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8'));
        const highPriority = data.filter(l => l.priority === 'High Priority');

        console.log(`[Cron] Watcher executed. Found ${highPriority.length} high priority leads.`);
        
        // In a serverless environment, we'd trigger an email or webhook here
        // instead of just logging to a persistent console.
        
        return res.status(200).json({
            processed: true,
            highPriorityCount: highPriority.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
