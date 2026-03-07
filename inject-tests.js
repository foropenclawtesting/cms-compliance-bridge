const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyijkdkqwwwmzihdoqxf.supabase.co';
const supabaseKey = 'sb_publishable_GqsjpP1STbF_IXL3SLWJKw_IEmFQq9D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function injectTestLeads() {
    console.log('Injecting High-Value Test Leads...');
    
    const testLeads = [
        {
            username: "Test_High_Value_Patient",
            status: "Submitted",
            insurance_type: "UnitedHealthcare",
            estimated_value: 155000,
            title: "Immunotherapy Denial",
            pain_point: "Experimental classification for FDA-approved indication.",
            url: "https://test.com/claim1"
        },
        {
            username: "Test_Paper_Rejection",
            status: "OCR Required",
            insurance_type: "Cigna",
            estimated_value: 12000,
            title: "Step Therapy Violation",
            pain_point: "Claim rejected via paper fax; needs Vision-AI parsing.",
            url: "https://test.com/claim2"
        }
    ];

    try {
        const { data, error } = await supabase
            .from('healthcare_denial_leads')
            .insert(testLeads);

        if (error) throw error;
        console.log('Test Leads Injected Successfully!');
    } catch (err) {
        console.error('Injection Error:', err.message);
    }
}

injectTestLeads();
