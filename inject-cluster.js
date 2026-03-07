const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eyijkdkqwwwmzihdoqxf.supabase.co';
const supabaseKey = 'sb_publishable_GqsjpP1STbF_IXL3SLWJKw_IEmFQq9D';
const supabase = createClient(supabaseUrl, supabaseKey);

async function injectCluster() {
    console.log('Injecting BlueCross Denial Cluster (Systemic Pattern)...');
    
    const cluster = [
        { username: "Cluster_Lead_A", status: "Submitted", insurance_type: "BlueCross", estimated_value: 35000, title: "Genetic Sequencing", url: "https://test.com/a", pain_point: "Experimental classification." },
        { username: "Cluster_Lead_B", status: "Submitted", insurance_type: "BlueCross", estimated_value: 35000, title: "Genetic Sequencing", url: "https://test.com/b", pain_point: "Experimental classification." },
        { username: "Cluster_Lead_C", status: "Submitted", insurance_type: "BlueCross", estimated_value: 35000, title: "Genetic Sequencing", url: "https://test.com/c", pain_point: "Experimental classification." }
    ];

    try {
        const { data, error } = await supabase.from('healthcare_denial_leads').insert(cluster);
        if (error) throw error;
        console.log('✅ Denial Cluster Injected Successfully!');
    } catch (err) {
        console.error('Injection Error:', err.message);
    }
}

injectCluster();
