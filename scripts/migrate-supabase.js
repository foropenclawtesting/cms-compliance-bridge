const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
const supabaseKey = env.match(/SUP[A-Z_]*ANON_KEY[:=]\s*["']?([^"'\s]+)/)?.[1];

async function migrate() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials in .env');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Starting Supabase Migration...');

    // Note: The Supabase JS client doesn't support raw SQL execution for schema changes 
    // through the standard API for security reasons. 
    // We will use the REST API or provide the SQL block.
    
    const schemaSql = `
    -- 1. Healthcare Denial Leads Table
    CREATE TABLE IF NOT EXISTS healthcare_denial_leads (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        username TEXT,
        title TEXT,
        url TEXT UNIQUE,
        pain_point TEXT,
        insurance_type TEXT,
        priority TEXT DEFAULT 'Normal',
        status TEXT DEFAULT 'New',
        estimated_value NUMERIC DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        due_at TIMESTAMPTZ,
        drafted_appeal TEXT,
        edited_appeal TEXT,
        clinical_synthesis TEXT,
        submission_status TEXT DEFAULT 'Pending',
        submitted_at TIMESTAMPTZ,
        submission_log TEXT,
        final_outcome TEXT DEFAULT 'Pending',
        settled_at TIMESTAMPTZ,
        recovered_amount NUMERIC DEFAULT 0
    );

    -- 2. Clinical Intelligence Table
    CREATE TABLE IF NOT EXISTS clinical_intel (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        title TEXT,
        category TEXT,
        snippet TEXT,
        url TEXT UNIQUE,
        keywords TEXT[]
    );
    `;

    console.log('✅ Migration Logic Prepared.');
    console.log('⚠️  IMPORTANT: Please paste the following SQL block into your Supabase SQL Editor to finalize the schema:');
    console.log('--------------------------------------------------');
    console.log(schemaSql);
    console.log('--------------------------------------------------');

    // Seeding some initial Payer data if needed could go here
    console.log('✨ Seeding initial test data...');
    const { error: seedError } = await supabase
        .from('healthcare_denial_leads')
        .upsert({
            username: 'Suitable-Plankton-52',
            title: 'Cigna kidney surgery delay',
            insurance_type: 'Cigna',
            priority: 'High Priority',
            pain_point: 'Patient requires urgent renal surgery; payer requesting additional clinical documentation.',
            estimated_value: 85200.00,
            status: 'New'
        }, { onConflict: 'url' });

    if (seedError) console.error('Seed Error:', seedError.message);
    else console.log('🎉 Seed Successful: Suitable-Plankton-52 is live.');
}

migrate();
