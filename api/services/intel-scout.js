/**
 * Recursive Intel Scout v1.0
 * Identifies clinical gaps in payer rejections and triggers new evidence search.
 */

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
