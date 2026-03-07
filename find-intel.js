const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyijkdkqwwwmzihdoqxf.supabase.co';
const supabaseKey = 'sb_publishable_GqsjpP1STbF_IXL3SLWJKw_IEmFQq9D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findIntel() {
    console.log('Searching Clinical Intel Library...');
    try {
        const { data, error } = await supabase
            .from('clinical_intel')
            .select('*')
            .or('summary.ilike.%Pembrolizumab%,summary.ilike.%Stage IV%')
            .limit(1);

        if (error) throw error;
        console.log('Intel Found:');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Search Error:', err.message);
    }
}

findIntel();
