/**
 * Appeal Generator Service
 * Enhanced with Clinical Evidence (EviDex) and Regulatory Compliance (CMS-0057-F)
 */

exports.draft = (details) => {
    const { payerId, claimId, reason, timestamp, clinicalEvidence, clinicalSynthesis } = details;
    
    console.log(`Generating comprehensive clinical/regulatory appeal for Claim: ${claimId}...`);

    const today = new Date().toLocaleDateString();

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

    const letterTemplate = `
DATE: ${today}
TO: ${payerId} - Claims & Appeals Department
RE: COMPREHENSIVE MEDICAL APPEAL - Claim #${claimId}
REGULATORY NOTICE: CMS-0057-F Compliance Violation & Clinical Evidence Submission

Dear Claims Review Committee,

This letter serves as a formal appeal for the denial of Claim #${claimId} (${reason}).

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
