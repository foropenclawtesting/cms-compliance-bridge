const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyijkdkqwwwmzihdoqxf.supabase.co';
const supabaseKey = 'sb_publishable_GqsjpP1STbF_IXL3SLWJKw_IEmFQq9D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function injectViolation() {
    console.log('Injecting Regulatory Violation Test Case...');
    
    // Set due_at to 48 hours ago
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 48);

    const violationLead = {
        username: "Test_Overdue_Claim",
        status: "Submitted",
        insurance_type: "Aetna",
        estimated_value: 45000,
        title: "Biologic Pre-Auth",
        due_at: pastDate.toISOString(),
        url: "https://test.com/violation1",
        pain_point: "Payer has failed to adjudicate within the 72h CMS-0057-F window."
    };

    try {
        const { data, error } = await supabase
            .from('healthcare_denial_leads')
            .insert([violationLead]);

        if (error) throw error;
        console.log('✅ Violation Lead Injected Successfully!');
    } catch (err) {
        console.error('Injection Error:', err.message);
    }
}

injectViolation();
