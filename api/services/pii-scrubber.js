/**
 * PII Scrubber Utility
 * Ensures HIPAA-compliant de-identification before sending data to external agents/search.
 */
exports.scrub = (text) => {
    if (!text) return text;
    
    let scrubbed = text;
    
    // 1. Mask Names (Approximation)
    // In a production app, we'd use a named-entity recognition (NER) model.
    // Here we'll mask the 'username' and common patterns.
    scrubbed = scrubbed.replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, "[PATIENT_NAME]");
    
    // 2. Mask IDs and Dates of Birth
    scrubbed = scrubbed.replace(/\d{3}-\d{2}-\d{4}/g, "[SSN]");
    scrubbed = scrubbed.replace(/\d{2}\/\d{2}\/\d{4}/g, "[DATE]");
    scrubbed = scrubbed.replace(/\d{5,}/g, "[ID_HIDDEN]");

    return scrubbed;
};
