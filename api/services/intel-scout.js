const supabase = require('./supabaseClient');

/**
 * Recursive Intel Scout v2.0
 * Integrates EviDex (Internal Intel) with External Recursive Search.
 */

exports.getClinicalDefense = async (procedure) => {
    console.log(`[EviDex] Querying Internal Clinical Intel for: ${procedure}...`);
    
    // 1. Check EviDex Library First (Fast Path)
    const { data: internalIntel } = await supabase
        .from('clinical_intel')
        .select('*')
        .contains('keywords', [procedure.toLowerCase()])
        .limit(1);

    if (internalIntel && internalIntel.length > 0) {
        console.log(`[EviDex] Internal Match Found: ${internalIntel[0].title}`);
        return internalIntel[0];
    }

    // 2. Fallback to Web-Search Logic (Slow Path)
    return null; // Heartbeat picks up the null and triggers web_search
};

exports.identifyGap = (rejectionText) => {
    const text = rejectionText.toLowerCase();
    
    if (text.includes('step therapy') || text.includes('trial of')) {
        return { gap: 'MISSING_STEP_HISTORY', query: 'clinical guidelines step therapy bypass for stage IV oncology' };
    }
    if (text.includes('experimental') || text.includes('investigational')) {
        return { gap: 'EXPERIMENTAL_CHALLENGE', query: 'peer-reviewed efficacy studies for [PROCEDURE] in FDA-approved indications' };
    }
    if (text.includes('medical necessity') || text.includes('necessity not established')) {
        return { gap: 'NECESSITY_GAP', query: 'Medicare National Coverage Determination (NCD) for [PROCEDURE]' };
    }
    
    return { gap: 'GENERAL_REJECTION', query: 'standard of care clinical guidelines for [PROCEDURE]' };
};

exports.formatResearchQuery = (gap, procedure, payer) => {
    let q = gap.query.replace('[PROCEDURE]', procedure);
    return `${q} ${payer} medical policy 2024`;
};
