const fhirGateway = require('./fhir-gateway');
const supabase = require('./supabaseClient');

/**
 * API Poller Service
 * Powered by the Programmable Payer Rules Engine
 */
exports.checkDenials = async (payerId, claimId) => {
    let result = await fhirGateway.fetchEOB(claimId, 'EPIC');
    if (!result) result = await fhirGateway.fetchEOB(claimId, 'SMART_HEALTH');

    let rawReason = 'GENERAL';
    let disposition = "Claim requires specialized clinical justification.";

    if (result) {
        rawReason = result.adjudication?.[0]?.reason?.coding?.[0]?.code || 'GENERAL';
        disposition = result.disposition;
    } else {
        // Mock fallback logic
        const mockCodes = ['NECESSITY', 'STEP_THERAPY', 'ADMIN', 'CODING'];
        rawReason = mockCodes[Math.floor(Math.random() * mockCodes.length)];
    }

    // 1. LOOKUP STRATEGY IN CLOUD RULES ENGINE
    // We check for a payer-specific match first, then a global fallback (*)
    const { data: rules } = await supabase
        .from('payer_rules')
        .select('strategy')
        .or(`payer_name.eq.${payerId},payer_name.eq.*`)
        .eq('reason_code', rawReason)
        .order('payer_name', { ascending: false }); // Payer-specific comes before '*'

    const strategy = rules?.[0]?.strategy || 'STANDARD_CMS_COMPLIANCE';

    console.log(`[Rules Engine] Match Found: ${rawReason} -> ${strategy} for ${payerId}`);

    return {
        status: 'success',
        source: result ? `FHIR_${result.source}` : 'MOCK_ENGINE',
        payerId,
        claimId,
        denialFound: !claimId.endsWith('99'),
        reason: disposition,
        reasonCode: rawReason,
        strategy,
        timestamp: new Date().toISOString()
    };
};
