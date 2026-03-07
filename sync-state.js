const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyijkdkqwwwmzihdoqxf.supabase.co';
const supabaseKey = 'sb_publishable_GqsjpP1STbF_IXL3SLWJKw_IEmFQq9D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncState() {
    console.log('🔄 Syncing Autonomous State Machine...');

    // 1. Move Lead 6 to P2P Scheduled (Handled)
    const { error: err6 } = await supabase
        .from('healthcare_denial_leads')
        .update({ status: 'P2P Scheduled' })
        .eq('username', 'Test_High_Value_Patient');
    
    if (!err6) console.log('✅ Lead 6: Moved to P2P Scheduled.');

    // 2. Move Lead 7 to Refinement Required (Vision Complete)
    const { error: err7 } = await supabase
        .from('healthcare_denial_leads')
        .update({ status: 'Refinement Required' })
        .eq('username', 'Test_Paper_Rejection');

    if (!err7) console.log('✅ Lead 7: Moved to Refinement Required.');
}

syncState();
