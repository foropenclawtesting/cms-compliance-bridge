const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyijkdkqwwwmzihdoqxf.supabase.co';
const supabaseKey = 'sb_publishable_GqsjpP1STbF_IXL3SLWJKw_IEmFQq9D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('Fetching Supabase Schema Info...');
    try {
        // Querying the RPC or checking a common table to see what's available
        const { data, error } = await supabase
            .from('healthcare_denial_leads')
            .select('*')
            .limit(1);

        if (error) throw error;
        
        console.log('Leads table exists. Checking for other common tables...');
        
        // Try common names
        const tables = ['clinical_intel', 'clinical_precedents', 'payer_rules', 'compliance_logs'];
        for (const table of tables) {
            const { error: tableError } = await supabase.from(table).select('count', { count: 'exact', head: true });
            if (!tableError) {
                console.log(`- Table Found: ${table}`);
            } else {
                console.log(`- Table Missing: ${table} (${tableError.message})`);
            }
        }

    } catch (err) {
        console.error('Schema Error:', err.message);
    }
}

listTables();
