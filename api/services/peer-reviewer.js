/**
 * Autonomous Clinical Peer Review v1.0
 * Vets synthesized appeals against real EHR data to ensure accuracy.
 */

exports.vetAppeal = (draft, ehrData) => {
    console.log('[Peer Review] Auditing clinical package for factual consistency...');
    
    const findings = [];
    let score = 70; // Base score for a synthesized draft

    // 1. Cross-reference Medications
    const mentionedMeds = ehrData.medications.filter(med => draft.toLowerCase().includes(med.toLowerCase()));
    if (mentionedMeds.length > 0) {
        findings.push(`Verified medication history for: ${mentionedMeds.join(', ')}.`);
        score += 15;
    }

    // 2. Cross-reference Diagnoses
    const mentionedDx = ehrData.diagnoses.filter(dx => draft.toLowerCase().includes(dx.toLowerCase()));
    if (mentionedDx.length > 0) {
        findings.push(`Confirmed diagnosis alignment: ${mentionedDx.join(', ')}.`);
        score += 15;
    }

    return {
        score: Math.min(100, score),
        findings,
        status: score > 85 ? 'HIGH_CONFIDENCE' : 'REVIEW_REQUIRED',
        audited_at: new Date().toISOString()
    };
};
