const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
const supabaseKey = env.match(/SUPABASE_ANON_KEY=["']?([^"'\s]+)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking columns for project:', supabaseUrl);
    const { data, error } = await supabase.from('healthcare_denial_leads').select('*').limit(1);
    if (error) {
        console.error('Fetch Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]).join(', '));
    } else if (data) {
        console.log('Table exists but is empty. Testing a trial insert...');
        const { error: insertError } = await supabase.from('healthcare_denial_leads').insert([{ 
            username: 'Schema-Test', 
            title: 'Test', 
            url: 'https://test.com/' + Date.now(),
            pain_point: 'Test',
            insurance_type: 'Test'
        }]).select();
        
        if (insertError) console.error('Insert Error:', insertError.message);
        else console.log('Insert succeeded with base columns.');
    }
}
check();
