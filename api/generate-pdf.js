const PDFDocument = require('pdfkit');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { type, appealText, claimId, clinicalResearch, synthesis, priority } = req.body;

    try {
        const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
        res.setHeader('Content-Type', 'application/pdf');
        
        if (type === 'BRIEF') {
            // --- PHYSICIAN P2P CHEAT SHEET ---
            res.setHeader('Content-Disposition', `attachment; filename=P2P_Brief_${claimId}.pdf`);
            doc.pipe(res);

            doc.fillColor('#2d3748').fontSize(22).text('PHYSICIAN P2P BRIEFING', { align: 'center' });
            doc.fontSize(10).text('CONFIDENTIAL CLINICAL STRATEGY', { align: 'center', color: '#718096' });
            doc.moveDown(2);

            // Summary Section
            doc.rect(40, doc.y, 530, 80).fill('#edf2f7');
            doc.fillColor('#2d3748').fontSize(12).text(`  CLAIM ID: ${claimId}`, 50, doc.y + 15, { bold: true });
            doc.text(`  URGENCY: ${priority === 'High Priority' ? 'CRITICAL (72h Window)' : 'Standard'}`);
            doc.text(`  TARGET: Insurance Medical Director (Peer-to-Peer)`);
            doc.moveDown(3);

            // Talking Point 1: Clinical
            doc.fillColor('#2b6cb0').fontSize(14).text('1. THE CLINICAL ARGUMENT (EviDex Synthesis)', 40);
            doc.moveDown(0.5);
            doc.fillColor('#4a5568').fontSize(11).text(synthesis || "Adhere to the gold standard treatment cited in the clinical package.", { lineGap: 3 });
            doc.moveDown();

            // Talking Point 2: Regulatory
            doc.fillColor('#c53030').fontSize(14).text('2. THE REGULATORY LEVERAGE (CMS-0057-F)', 40);
            doc.moveDown(0.5);
            doc.fillColor('#4a5568').fontSize(11).text(`Mention that this denial lacks "actionable justification" via FHIR API. Under CMS-0057-F, the payer is mandated to provide granular denial reasons. Failure to approve this today results in a formal Regulatory Notice of Violation.`);
            doc.moveDown();

            // Talking Point 3: Policy
            doc.fillColor('#2d3748').fontSize(14).text('3. PAYER POLICY ADHERENCE', 40);
            doc.moveDown(0.5);
            doc.fontSize(11).text(`The patient meets the specific criteria outlined in the Payer's Medical Policy for this procedure. The denial is a misapplication of their own published coverage standards.`);
        } else {
            // --- STANDARD APPEAL PACKAGE ---
            res.setHeader('Content-Disposition', `attachment; filename=Appeal_Package_${claimId}.pdf`);
            doc.pipe(res);
            doc.fontSize(18).text('FORMAL MEDICAL APPEAL', { align: 'center' });
            doc.moveDown();
            doc.fontSize(11).text(appealText, { align: 'left', lineGap: 4 });
        }

        doc.end();
    } catch (error) {
        res.status(500).json({ error: 'PDF Generation failed' });
    }
}
