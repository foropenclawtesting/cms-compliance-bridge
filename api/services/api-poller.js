const fhirGateway = require('./fhir-gateway');

/**
 * API Poller Service
 * Maps FHIR Reason Codes to Specialized Appeal Strategies
 */
exports.checkDenials = async (payerId, claimId) => {
    let result = await fhirGateway.fetchEOB(claimId, 'EPIC');
    if (!result) result = await fhirGateway.fetchEOB(claimId, 'SMART_HEALTH');

    if (result) {
        // Extract Denial Category from FHIR Reason Codes
        // e.g. Code 197 = Pre-auth required, Code 50 = Medical Necessity
        const reasonCode = result.adjudication?.[0]?.reason?.coding?.[0]?.code || 'GENERAL';
        const strategy = getStrategy(reasonCode);

        return {
            status: 'success',
            source: `FHIR_${result.source}`,
            payerId: result.raw.insurer?.display || payerId,
            claimId,
            denialFound: result.outcome === 'rejected' || result.outcome === 'partial',
            reason: result.disposition,
            reasonCode,
            strategy,
            timestamp: new Date().toISOString()
        };
    }

    // MOCK Fallback with randomized intelligence
    const mockCodes = ['NECESSITY', 'STEP_THERAPY', 'ADMIN', 'CODING'];
    const randomCode = mockCodes[Math.floor(Math.random() * mockCodes.length)];

    return {
        status: 'success',
        source: 'MOCK_ENGINE',
        payerId,
        claimId,
        denialFound: !claimId.endsWith('99'),
        reason: "Claim requires specialized clinical justification.",
        reasonCode: randomCode,
        strategy: getStrategy(randomCode),
        timestamp: new Date().toISOString()
    };
};

function getStrategy(code) {
    const strategies = {
        'NECESSITY': 'CLINICAL_PEER_REVIEW',
        'STEP_THERAPY': 'TREATMENT_FAILURE_LOG',
        'ADMIN': 'REGULATORY_TIMING_STRIKE',
        'CODING': 'NPI_VERIFICATION_AUDIT',
        'GENERAL': 'STANDARD_CMS_COMPLIANCE'
    };
    return strategies[code] || strategies.GENERAL;
}
