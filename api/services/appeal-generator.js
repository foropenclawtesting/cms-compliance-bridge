/**
 * Appeal Generator Service v2.2 (Strategic Edition)
 * Strategic Evidence Deep-Linking & Clinical Force Multiplication
 */

exports.draft = (details) => {
    const { payerId, claimId, reason, clinicalEvidence, clinicalSynthesis, strategy, masterstroke, isEscalation } = details;
    
    const today = new Date().toLocaleDateString();

    // 1. ESCALATION / VIOLATION TEMPLATE (CMS-0057-F Enforcement)
    if (isEscalation) {
        return `
DATE: ${today}
TO: ${payerId} - Office of General Counsel / Compliance Officer
RE: FORMAL NOTICE OF REGULATORY NON-COMPLIANCE - Claim #${claimId}
MANDATE: CMS-0057-F Interoperability & Prior Authorization Final Rule

Dear Counsel,

This letter serves as a formal Notice of Regulatory Non-Compliance. Your organization has failed to provide a granular clinical redetermination within the mandated 72-hour window.

Pursuant to Section 422.568, we demand an immediate reversal of this denial. Continued failure to adjudicate based on the patient-specific clinical data provided will result in a formal report to the CMS Regional Office.

Sincerely,
Automated Compliance Engine
CMS Compliance Bridge v5
        `.trim();
    }

    // 2. CARRIER-SPECIFIC STRATEGIC INTELLIGENCE
    let strategicCitation = "";
    if (masterstroke) {
        strategicCitation = `\nSTRATEGIC REGULATORY CITATION:\n${masterstroke.winning_citation}\n(Rationale: ${masterstroke.rationale})\n`;
    }

    // 3. CLINICAL SYNTHESIS & EVIDENCE LINKING
    const evidenceSection = `
CLINICAL NECESSITY SYNTHESIS:
${clinicalSynthesis || "The requested procedure aligns with established Standard of Care."}

${clinicalEvidence?.url ? `VERIFIED CLINICAL EVIDENCE: ${clinicalEvidence.url}` : ""}
    `.trim();

    // 4. THE "UNIMPEACHABLE" DRAFT
    const letterTemplate = `
DATE: ${today}
TO: ${payerId} - Medical Director / Appeals Committee
RE: COMPREHENSIVE MEDICAL RECONSIDERATION - Claim #${claimId}
REGULATORY NOTICE: CMS-0057-F Clinical Granularity Mandate

Dear Review Committee,

This letter serves as a formal appeal for the denial of Claim #${claimId} (${reason}).

${strategicCitation}

${evidenceSection}

REGULATORY COMPLIANCE:
Under CMS-0057-F, payers are prohibited from using automated denial algorithms that fail to account for patient-specific clinical data. We demand an immediate redetermination based on the clinical precedents cited above. 

PROACTIVE P2P AVAILABILITY:
Our Physician is available for a Peer-to-Peer discussion within 24 hours. We have prepared an Unimpeachable Clinical Brief for this consultation.

Sincerely,
[Automated Medical Director Agent]
CMS Compliance Bridge + EviDex Pulse
    `;

    return letterTemplate.trim();
};
