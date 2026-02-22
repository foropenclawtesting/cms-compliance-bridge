const axios = require('axios');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    if (req.method !== 'POST') return res.status(405).end();

    const { leadIds } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: 'leadIds array is required' });
    }

    console.log(`[Batch Gateway] Initiating transmission for ${leadIds.length} appeals...`);

    const results = { successful: [], failed: [] };

    // Process batch in parallel
    const transmissions = leadIds.map(async (id) => {
        try {
            const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/submit-appeal`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization 
                },
                body: JSON.stringify({ leadId: id })
            });

            if (response.ok) {
                results.successful.push(id);
            } else {
                results.failed.push({ id, error: await response.text() });
            }
        } catch (err) {
            results.failed.push({ id, error: err.message });
        }
    });

    await Promise.all(transmissions);

    return res.status(200).json(results);
}
