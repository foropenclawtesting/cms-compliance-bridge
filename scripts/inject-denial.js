const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Credentials from .env
const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
let supabaseUrl, supabaseKey;

try {
    const env = fs.readFileSync(envPath, 'utf8');
    supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
    supabaseKey = env.match(/SUP[A-Z_]*ANON_KEY[:=]\s*["']?([^"'\s]+)/)?.[1];
} catch (e) {
    console.error('Could not load .env file');
}

async function inject() {
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const mockDenial = {
        username: "Patient_Sim_99",
        title: "Pembrolizumab (Keytruda) Infusion",
        url: "https://example-ehr.com/claims/99",
        pain_point: "Denial Code: CO-197 (Pre-certification/authorization absent). Payer indicates Step Therapy required despite stage IV diagnosis.",
        insurance_type: "UnitedHealthcare (UHC)",
        priority: "High Priority",
        status: "New",
        estimated_value: 18500.00,
        due_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72h Urgent window
        reason_code: "CO-197",
        strategy: "STEP_THERAPY"
    };

    console.log(`[Simulator] Injecting Strategic Denial for ${mockDenial.insurance_type}...`);

    const { data, error } = await supabase
        .from('healthcare_denial_leads')
        .insert([mockDenial])
        .select();

    if (error) {
        console.error('Injection Error:', error.message);
    } else {
        console.log('---SIMULATION_STARTED---');
        console.log(`LEAD_ID: ${data[0].id}`);
        console.log(`STAKE: $${mockDenial.estimated_value}`);
        console.log('Next Step: Run the local Scout to synthesize the appeal.');
        console.log('---SIMULATION_END---');
    }
}

inject();
