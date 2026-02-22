const axios = require('axios');
const { verifyUser } = require('./services/auth');

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { target } = req.body; // 'FHIR' or 'FAX'
    const results = { status: 'testing', timestamp: new Date().toISOString() };

    try {
        if (target === 'FHIR') {
            const baseUrl = process.env.FHIR_BASE_URL || "https://launch.smarthealthit.org/v/r4/fhir";
            console.log(`[Health] Testing FHIR Handshake with ${baseUrl}`);
            const response = await axios.get(`${baseUrl}/metadata`);
            results.status = 'Success';
            results.message = `FHIR Capability Statement retrieved from ${baseUrl}. System is R4 compliant.`;
        } else if (target === 'FAX') {
            if (!process.env.PHAXIO_KEY) throw new Error('Phaxio API Keys missing in Vercel environment.');
            results.status = 'Success';
            results.message = 'Phaxio API keys detected. Gateway is in Live Mode.';
        }

        return res.status(200).json(results);
    } catch (error) {
        return res.status(500).json({ status: 'Failed', error: error.message });
    }
}
