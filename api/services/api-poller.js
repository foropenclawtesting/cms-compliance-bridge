const fhirGateway = require('./fhir-gateway');

/**
 * API Poller Service
 * Balanced between Real FHIR and High-Fidelity Mock for Edge Cases
 */
exports.checkDenials = async (payerId, claimId) => {
    // 1. Try Real FHIR Sandboxes first (Epic then SmartHealth)
    let result = await fhirGateway.fetchEOB(claimId, 'EPIC');
    
    if (!result) {
        result = await fhirGateway.fetchEOB(claimId, 'SMART_HEALTH');
    }

    if (result) {
        return {
            status: 'success',
            source: `FHIR_${result.source}`,
            payerId: result.raw.insurer?.display || payerId,
            claimId,
            denialFound: result.outcome === 'rejected' || result.outcome === 'partial',
            reason: result.disposition,
            timestamp: new Date().toISOString()
        };
    }

    // 2. Fallback to High-Fidelity Mock if no sandbox is reachable
    console.log(`[FHIR] Falling back to Mock Engine for Claim ${claimId}`);
    return {
        status: 'success',
        source: 'MOCK_ENGINE',
        payerId,
        claimId,
        denialFound: true,
        reason: "Claim requires clinical documentation supporting Medical Necessity (CMS-0057-F Section 4.2).",
        timestamp: new Date().toISOString()
    };
};
