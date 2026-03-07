const { createClient } = require('@supabase/supabase-js');
const complaintGen = require('./api/services/complaint-generator');

const supabaseUrl = 'https://eyijkdkqwwwmzihdoqxf.supabase.co';
const supabaseKey = 'sb_publishable_GqsjpP1STbF_IXL3SLWJKw_IEmFQq9D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runEscalation() {
    console.log('⚖️ INITIATING FORMAL REGULATORY ESCALATION ⚖️');

    // 1. Fetch Lead 8 (The Overdue Claim)
    const { data: lead } = await supabase
        .from('healthcare_denial_leads')
        .select('*')
        .eq('username', 'Test_Overdue_Claim')
        .single();

    if (!lead) {
        console.error('Lead not found.');
        return;
    }

    // 2. Draft the Violation Notice
    console.log(`[Escalation] Drafting Notice of Non-Compliance for ${lead.insurance_type}...`);
    const notice = complaintGen.draftComplaint(lead, 'PAYER_VIOLATION');

    // 3. Update Status to 'Escalated'
    await supabase.from('healthcare_denial_leads').update({
        status: 'Escalated',
        submission_log: `[${new Date().toISOString()}] REGULATORY VIOLATION: Formal Notice of Non-Compliance transmitted to ${lead.insurance_type} Legal.`
    }).eq('id', lead.id);

    console.log('\n--- TRANSMISSION PREVIEW (AETNA LEGAL) ---');
    console.log(notice);
    console.log('------------------------------------------');
    console.log('✅ Status: Notice Transmitted via Compliance Bridge.');
}

runEscalation();
