const axios = require('axios');

/**
 * API Poller Service
 * Enhanced for SMART on FHIR Sandbox Integrations (Epic/Cerner/Logica)
 */
exports.checkDenials = async (payerId, claimId = '12345') => {
    // 1. Check for Real FHIR Credentials in Env
    const FHIR_BASE_URL = process.env.FHIR_BASE_URL; // e.g. https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
    const FHIR_TOKEN = process.env.FHIR_BEARER_TOKEN;

    if (FHIR_BASE_URL && FHIR_TOKEN) {
        console.log(`[FHIR] Initiating REAL fetch from: ${FHIR_BASE_URL}`);
        try {
            const response = await axios.get(`${FHIR_BASE_URL}/ExplanationOfBenefit`, {
                params: { identifier: claimId },
                headers: { 
                    'Authorization': `Bearer ${FHIR_TOKEN}`,
                    'Accept': 'application/fhir+json'
                }
            });
            
            // Extracting denial from real FHIR response
            const eob = response.data.entry?.[0]?.resource;
            if (eob) {
                return formatFHIRResult(eob, payerId, claimId, 'REAL_FHIR');
            }
        } catch (error) {
            console.error('[FHIR Error] Real-world fetch failed, falling back to mock:', error.message);
        }
    }

    // 2. Fallback to Mock Data (Safe for Testing)
    console.log(`[FHIR] Falling back to MOCK adjudication for payer: ${payerId}`);
    return getMockResult(payerId, claimId);
};

function formatFHIRResult(eob, payerId, claimId, source) {
    const outcome = eob.outcome || 'unknown';
    // Deep dive into adjudication reasons
    const reasonDisplay = eob.item?.[0]?.adjudication?.[0]?.reason?.coding?.[0]?.display 
        || eob.adjudication?.[0]?.reason?.coding?.[0]?.display 
        || "Referral/Authorization required.";

    return {
        status: 'success',
        source: source,
        payerId: eob.insurer?.display || payerId,
        claimId,
        denialFound: outcome === 'rejected' || outcome === 'partial',
        reason: reasonDisplay,
        timestamp: new Date().toISOString(),
        raw: eob
    };
}

function getMockResult(payerId, claimId) {
    return {
        status: 'success',
        source: 'MOCK_ENGINE',
        payerId,
        claimId,
        denialFound: true,
        reason: "Service requires prior authorization per CMS-0057-F guidelines.",
        timestamp: new Date().toISOString(),
        raw: { outcome: "rejected", id: claimId }
    };
}
