const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyijkdkqwwwmzihdoqxf.supabase.co';
const supabaseKey = 'sb_publishable_GqsjpP1STbF_IXL3SLWJKw_IEmFQq9D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    console.log('Testing Supabase Connection...');
    try {
        const { data, error } = await supabase
            .from('healthcare_denial_leads')
            .select('id, username, status, insurance_type, estimated_value')
            .limit(5);

        if (error) {
            console.error('Supabase Error:', error.message);
            process.exit(1);
        }

        console.log('Connection Successful!');
        console.log('Current Leads Snapshot:');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Unexpected Error:', err.message);
        process.exit(1);
    }
}

checkLeads();
