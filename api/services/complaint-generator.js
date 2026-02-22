/**
 * Regulatory Enforcement Engine v1.1
 * Generates formal Notices of Violation for missed CMS-0057-F deadlines.
 */

exports.draftComplaint = (lead, type = 'CMS') => {
    const today = new Date().toLocaleDateString();
    const deadline = new Date(lead.due_at).toLocaleDateString();
    
    if (type === 'PAYER_VIOLATION') {
        return `
DATE: ${today}
TO: ${lead.insurance_type} - Office of General Counsel / Compliance Officer
RE: NOTICE OF REGULATORY NON-COMPLIANCE - Claim #${lead.id}
MANDATE: CMS-0057-F Interoperability & Prior Authorization Final Rule
DEADLINE MISSED: ${deadline}

Dear Counsel,

This letter serves as a formal Notice of Regulatory Non-Compliance regarding the adjudication of Claim #${lead.id}.

Pursuant to CMS-0057-F, your organization was mandated to provide a granular clinical redetermination for this appeal by ${deadline}. As of today, ${today}, the deadline has been exceeded by over 24 hours without the required FHIR-based clinical justification.

Pursuant to Section 422.568, failure to adjudicate within the mandated window constitutes a violation. We hereby demand immediate approval of the claim based on the unrefuted clinical evidence provided in our submission. 

Continued failure to resolve this claim within 24 hours will result in a formal escalation to the CMS Regional Office and an audit request regarding your organization's prior authorization automated systems.

Respectfully,
Automated Compliance Engine
CMS Compliance Bridge v5
        `.trim();
    }

    // Default CMS Regional Office Complaint
    return `
DATE: ${today}
TO: Centers for Medicare & Medicaid Services (CMS) - Regional Office
RE: FORMAL REGULATORY COMPLAINT - SECTION 422.568 (CMS-0057-F)
Payer: ${lead.insurance_type} | Claim ID: ${lead.id}

The Payer referenced above has failed to provide a timely redetermination for a clinical appeal submitted on ${new Date(lead.submitted_at).toLocaleDateString()}. Mandated deadline of ${deadline} was violated.

We request an immediate audit of this Payer's adjudication timelines.
    `.trim();
};
