/**
 * Appeal Generator Service
 * Enhanced with Clinical Reason Intelligence and Regulatory Compliance (CMS-0057-F)
 */

exports.draft = (details) => {
    const { payerId, claimId, reason, timestamp, clinicalEvidence, clinicalSynthesis, strategy, level, isEscalation } = details;
    
    console.log(`Generating strategic ${strategy || 'Standard'} appeal for Claim: ${claimId}...`);

    const today = new Date().toLocaleDateString();

    // 1. LEVEL 2 / PEER-TO-PEER TEMPLATE
    if (level === 2) {
        return `
DATE: ${today}
TO: ${payerId} - Medical Director / Appeals Committee
RE: LEVEL 2 EXPEDITED CLINICAL APPEAL & PEER-TO-PEER REQUEST
Claim #${claimId} | Regulatory Priority: CMS-0057-F Level 2 Redetermination

Dear Medical Director,

We are formally escalating the denial of Claim #${claimId} to a Level 2 Clinical Review. The initial denial failed to acknowledge the significant medical necessity and evidence-based standards provided in our previous submission.

CLINICAL NECESSITY (LEVEL 2 SYNTHESIS):
${clinicalSynthesis || "The requested procedure is the established gold standard for the patient's condition."}

NOTICE OF PEER-TO-PEER REQUEST:
Under the transparency requirements of the CMS-0057-F mandate, we hereby request an immediate Peer-to-Peer (P2P) consultation between our treating physician and a board-certified reviewer of the same specialty within your organization. 

Sincerely,
[Medical Director Persona]
CMS Compliance Bridge - Level 2 Advocacy Division
        `.trim();
    }

    // 2. ESCALATION TEMPLATE (Notice of Violation)
    if (isEscalation) {
        return `
DATE: ${today}
TO: ${payerId} - Compliance & Legal Department
RE: NOTICE OF REGULATORY NON-COMPLIANCE - Claim #${claimId}
MANDATE: CMS-0057-F Interoperability & Prior Authorization Violation

Dear Compliance Officer,

This letter serves as a formal Notice of Violation regarding Claim #${claimId}. Under the CMS-0057-F Rule, your organization is mandated to provide a decision within the regulatory window. Failure to resolve this results in formal escalation to CMS.

Sincerely,
[Automated Compliance Enforcement Engine]
CMS Compliance Bridge
        `.trim();
    }

    // 3. STRATEGY-SPECIFIC MODIFIERS (The "Scalpel")
    let strategyPreamble = "";
    if (strategy === 'TREATMENT_FAILURE_LOG' || strategy === 'STEP_THERAPY') {
        strategyPreamble = `
SPECIALTY NOTICE (STEP THERAPY VIOLATION):
This appeal addresses a "Fail First" (Step Therapy) protocol violation. Forcing a delay in the prescribed treatment is clinically contraindicated given the patient's acute status. We request an immediate override based on clinical peer-reviewed standards.
        `.trim();
    } else if (strategy === 'CLINICAL_PEER_REVIEW') {
        strategyPreamble = `
CLINICAL NOTICE (MEDICAL NECESSITY):
This denial for Medical Necessity is being appealed with a formal request for an expedited clinical review by a board-certified specialist of the same specialty.
        `.trim();
    }

    let evidenceSection = "";
    if (clinicalSynthesis) {
        evidenceSection = `
CLINICAL NECESSITY JUSTIFICATION & POLICY ADHERENCE:
${clinicalSynthesis}
(Ref: Automated Clinical Peer Review & Payer Medical Policy Analysis)`;
    } else if (clinicalEvidence) {
        evidenceSection = `
CLINICAL EVIDENCE SUPPORT:
"${clinicalEvidence.snippet.substring(0, 300)}..."
Source: ${clinicalEvidence.title}`;
    }

    // 4. FINAL ASSEMBLY
    const letterTemplate = `
DATE: ${today}
TO: ${payerId} - Claims & Appeals Department
RE: COMPREHENSIVE MEDICAL APPEAL - Claim #${claimId}
REGULATORY NOTICE: CMS-0057-F Compliance Violation & Clinical Evidence Submission

Dear Claims Review Committee,

This letter serves as a formal appeal for the denial of Claim #${claimId} (${reason}).

${strategyPreamble}

${evidenceSection}

REGULATORY COMPLIANCE:
Per the CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F), payers are mandated to provide specific, actionable reasons for prior authorization denials via standardized HL7 FHIR APIs. Our audit suggests this denial lacks the granular justification mandated by the current CMS framework.

We request an immediate redetermination based on the clinical evidence cited above and the transparency requirements of CMS-0057-F.

Sincerely,

[Provider Name / Automated Compliance System]
CMS Compliance Bridge + EviDex Intel Engine
    `;

    return letterTemplate.trim();
};
