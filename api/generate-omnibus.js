const supabase = require('../services/supabaseClient');
const PDFDocument = require('pdfkit');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { payer, procedure } = req.body;

    try {
        // 1. Fetch all leads associated with this systemic trend
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .eq('insurance_type', payer)
            .eq('title', procedure)
            .not('status', 'eq', 'Settled');

        if (error || !leads.length) throw new Error('No active denials found for this trend.');

        const totalValue = leads.reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);

        // 2. Generate the Omnibus PDF
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Omnibus_Appeal_${payer.replace(/\s/g, '_')}.pdf`);
        doc.pipe(res);

        doc.fillColor('#c53030').fontSize(22).text('NOTICE OF SYSTEMIC REGULATORY NON-COMPLIANCE', { align: 'center' });
        doc.moveDown();
        doc.fillColor('#2d3748').fontSize(10).text(`FOR ATTENTION OF: ${payer.toUpperCase()} COMPLIANCE & LEGAL DEPT`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12).text(`This document constitutes a consolidated appeal and formal Notice of Violation regarding a identified systemic denial pattern for:`, { lineGap: 3 });
        doc.moveDown();
        doc.fillColor('#2b6cb0').fontSize(14).text(`PROCEDURE: ${procedure}`, { bold: true });
        doc.fillColor('#2d3748').fontSize(12).text(`TOTAL AGGREGATE IMPACT: $${totalValue.toLocaleString()}`);
        doc.moveDown(2);

        doc.fontSize(13).text('PATTERN ANALYSIS:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).text(`Our internal compliance audit has identified ${leads.length} separate instances where ${payer} has denied ${procedure} without providing actionable, granular clinical justification as mandated by CMS-0057-F.`, { lineGap: 3 });
        doc.moveDown();

        doc.text('AFFECTED CLAIMS SUMMARY:');
        leads.forEach((l, i) => {
            doc.fontSize(10).text(`${i+1}. Claim ID: AUTO-${l.id} | Patient Ref: ${l.username} | Value: $${parseFloat(l.estimated_value).toLocaleString()}`);
        });

        doc.moveDown(2);
        doc.fontSize(13).text('REGULATORY DEMAND:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).text(`Failure to resolve this systemic denial pattern within 72 hours will result in an immediate escalation to the Centers for Medicare & Medicaid Services (CMS) and the relevant State Department of Insurance. We request a global redetermination for the claims listed above.`, { lineGap: 3 });

        doc.end();

    } catch (error) {
        console.error('[Omnibus Error]:', error.message);
        res.status(500).json({ error: error.message });
    }
}
