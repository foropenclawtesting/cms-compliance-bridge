const supabase = require('./services/supabaseClient');
const { verifyUser } = require('./services/auth');

/**
 * Patient Advocacy Engine v1.0
 * Generates a formal Member Grievance letter to supplement clinical appeals.
 */

export default async function handler(req, res) {
    const { leadId } = req.body;

    try {
        const { data: lead } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (!lead) throw new Error('Lead not found');

        const letterText = `
DATE: ${new Date().toLocaleDateString()}
TO: ${lead.insurance_type} - Member Grievance & Appeals Department
FROM: ${lead.username} (Policyholder / Patient)
RE: FORMAL GRIEVANCE & DEMAND FOR COVERAGE - Claim #${lead.id}

To whom it may concern,

I am writing to formally protest the denial of coverage for my ${lead.title}. I have reviewed the clinical justification provided by my physician and I fully support the appeal being submitted on my behalf.

REGULATORY DEMAND:
Under the Interoperability and Prior Authorization Final Rule (CMS-0057-F), I am entitled to a granular, clinical explanation for this denial. Your current response fails to meet this standard. 

As the policyholder, I demand that you acknowledge the peer-reviewed evidence cited in my doctor's appeal. Failure to resolve this claim within the regulatory window will result in a formal complaint to the State Department of Insurance and the CMS Regional Office.

I expect a written redetermination within the mandated 72-hour/7-day window.

Sincerely,
${lead.username}
        `.trim();

        return res.status(200).json({ letterText });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
