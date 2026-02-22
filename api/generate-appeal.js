const appealGenerator = require('./services/appeal-generator');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    try {
        const { payerId, claimId, reason, timestamp } = req.body;
        if (!payerId || !claimId || !reason) {
            return res.status(400).json({ error: 'payerId, claimId, and reason are required' });
        }
        
        const appeal = appealGenerator.draft({ payerId, claimId, reason, timestamp: timestamp || new Date() });
        return res.status(200).json({ appeal });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
