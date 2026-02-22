const apiPoller = require('./services/api-poller');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    try {
        const { payerId, claimId } = req.body;
        if (!payerId) return res.status(400).json({ error: 'payerId is required' });
        
        const result = await apiPoller.checkDenials(payerId, claimId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
