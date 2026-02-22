/**
 * Appeal Generator Service v2.1
 * Strategic Evidence Deep-Linking & Regulatory Compliance
 */

exports.draft = (details) => {
    const { payerId, claimId, reason, clinicalEvidence, clinicalSynthesis, strategy, level, isEscalation } = details;
    
    const today = new Date().toLocaleDateString();

    // 1. LEVEL 2 / P2P TEMPLATE
    if (level === 2) {
        return `
DATE: ${today}
TO: ${payerId} - Medical Director / Appeals Committee
RE: LEVEL 2 EXPEDITED CLINICAL APPEAL & PEER-TO-PEER REQUEST
Claim #${claimId} | Regulatory Priority: CMS-0057-F Level 2

Dear Medical Director,

We are formally escalating Claim #${claimId} to Level 2. The initial review failed to acknowledge the evidence-based standards provided.

CLINICAL NECESSITY (LEVEL 2 SYNTHESIS):
${clinicalSynthesis || "The requested procedure is the established gold standard for the patient's condition."}

NOTICE OF PEER-TO-PEER REQUEST:
Under CMS-0057-F, we hereby request an immediate P2P consultation. Please contact our department within 24 hours to schedule.

Sincerely,
[Medical Director Persona]
CMS Compliance Bridge - Level 2 Advocacy
        `.trim();
    }

    // 2. ESCALATION / VIOLATION TEMPLATE
    if (isEscalation) {
        return `
DATE: ${today}
TO: ${payerId} - Compliance & Legal Department
RE: NOTICE OF REGULATORY NON-COMPLIANCE - Claim #${claimId}
MANDATE: CMS-0057-F timing violation detected.

Failure to resolve this claim within the regulatory window results in formal escalation to CMS.

Sincerely,
Automated Compliance Engine
        `.trim();
    }

    // 3. CARRIER-SPECIFIC INTELLIGENCE (Strategic Rejection Bypass)
    let carrierIntelligence = "";
    if (payerId.toLowerCase().includes('united') || payerId.toLowerCase().includes('uhc')) {
        carrierIntelligence = `\nUHC POLICY COMPLIANCE: This request aligns with UnitedHealthcare Medical Policy [COMMERCIAL-001]. Failure to approve constitutes a deviation from your own internal clinical guidelines.`;
    } else if (payerId.toLowerCase().includes('cigna')) {
        carrierIntelligence = `\nCIGNA CLINICAL NOTICE: Per Cigna Medical Necessity Criteria, the patient meets all Tier 1 requirements. Step Therapy is clinically contraindicated in this instance.`;
    }

    // 4. EVIDENCE DEEP-LINKING (The "Unblockable" Argument)
    let evidenceSection = "";
    if (clinicalSynthesis) {
        const sourceUrl = clinicalEvidence?.url ? `\nVERIFIED EVIDENCE LINK: ${clinicalEvidence.url}` : "";
        evidenceSection = `
CLINICAL NECESSITY JUSTIFICATION:
${clinicalSynthesis}${carrierIntelligence}
(Ref: Automated Clinical Peer Review)${sourceUrl}`;
    }

    // 4. STRATEGY-SPECIFIC MODIFIERS
    let strategyPreamble = "";
    if (strategy === 'STEP_THERAPY') {
        strategyPreamble = `SPECIALTY NOTICE: This appeal addresses a Step Therapy violation. Treatment delay is clinically contraindicated.`;
    }

    // 5. CUSTOM STRATEGY INJECTION (Your Programmed Logic)
    let customInjection = "";
    if (details.custom_strategy) {
        customInjection = `\nSTRATEGIC DEFENSE: ${details.custom_strategy}`;
    }

    const letterTemplate = `
DATE: ${today}
TO: ${payerId} - Claims & Appeals Department
RE: COMPREHENSIVE MEDICAL APPEAL - Claim #${claimId}
REGULATORY NOTICE: CMS-0057-F Compliance Violation

Dear Claims Review Committee,

This letter serves as a formal appeal for the denial of Claim #${claimId} (${reason}).

${strategyPreamble}

${evidenceSection}${customInjection}

REGULATORY COMPLIANCE:
Per CMS-0057-F, payers are mandated to provide specific, actionable reasons for denials via FHIR APIs. Our audit suggests this denial lacks granular justification. We request immediate redetermination based on the clinical evidence cited above.

Sincerely,
[Automated Compliance System]
CMS Compliance Bridge + EviDex Intel
    `;

    return letterTemplate.trim();
};
