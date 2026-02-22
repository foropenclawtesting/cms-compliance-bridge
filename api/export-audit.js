const supabase = require('../services/supabaseClient');

export default async function handler(req, res) {
    try {
        // 1. Fetch all settled/submitted leads
        const { data: leads, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .order('settled_at', { ascending: false });

        if (error) throw error;

        // 2. Generate CSV Header
        const headers = ["Lead ID", "Patient/User", "Insurance", "Priority", "Status", "Outcome", "Estimated Value", "Recovered Amount", "Settled At", "Submission Log"];
        const csvRows = [headers.join(",")];

        // 3. Populate Rows
        leads.forEach(l => {
            const row = [
                l.id,
                `"${l.username}"`,
                `"${l.insurance_type}"`,
                l.priority,
                l.status,
                l.final_outcome || "Pending",
                l.estimated_value || 0,
                l.recovered_amount || 0,
                l.settled_at || "",
                `"${(l.submission_log || "").replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\n");

        // 4. Stream as File
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=CMS_Bridge_Audit_${new Date().toISOString().split('T')[0]}.csv`);
        return res.status(200).send(csvString);

    } catch (error) {
        console.error('[Export Error]:', error.message);
        return res.status(500).json({ error: 'Export failed' });
    }
}
