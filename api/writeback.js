const { postRecoveryToEHR } = require('./services/writeback-tunnel');
const { verifyUser } = require('./services/auth');

/**
 * EHR Writeback Gateway v1.0
 * Entry point for posting recovered revenue to external billing systems.
 */

export default async function handler(req, res) {
    const user = await verifyUser(req, res);
    if (!user) return;

    const { leadId, amount } = req.body;

    try {
        console.log(`[Writeback API] Triggering financial reconciliation for Lead ${leadId}...`);
        
        const result = await postRecoveryToEHR(leadId, amount);

        return res.status(200).json({
            status: 'Success',
            transactionId: result.transactionId,
            postedAmount: amount
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
