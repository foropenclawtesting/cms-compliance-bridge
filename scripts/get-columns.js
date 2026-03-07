const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
const supabaseKey = env.match(/SUPABASE_ANON_KEY=["']?([^"'\s]+)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('healthcare_denial_leads').select('*').limit(1);
    if (error) {
        console.error('Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('COLUMNS_FOUND:', JSON.stringify(Object.keys(data[0])));
    } else {
        console.log('TABLE_EMPTY');
    }
}
run();
