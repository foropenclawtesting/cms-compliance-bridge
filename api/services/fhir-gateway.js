const axios = require('axios');

/**
 * Multi-Vendor FHIR Gateway
 * Support for Epic, Cerner, and HL7 R4 Standards
 */
const VENDORS = {
    EPIC: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    CERNER: "https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    SMART_HEALTH: "https://launch.smarthealthit.org/v/r4/fhir" // Public Test Sandbox
};

exports.fetchEOB = async (claimId, vendorKey = 'EPIC') => {
    const baseUrl = VENDORS[vendorKey] || VENDORS.SMART_HEALTH;
    const token = process.env[`FHIR_${vendorKey}_TOKEN`];

    console.log(`[FHIR Gateway] Fetching EOB from ${vendorKey} for Claim ${claimId}...`);

    try {
        const headers = { 'Accept': 'application/fhir+json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await axios.get(`${baseUrl}/ExplanationOfBenefit`, {
            params: { identifier: claimId },
            headers
        });

        const entry = response.data.entry?.[0]?.resource;
        if (!entry) throw new Error('No matching EOB found in FHIR sandbox');

        return {
            source: vendorKey,
            outcome: entry.outcome, // 'queued' | 'complete' | 'error' | 'partial'
            disposition: entry.disposition || "Unknown clinical decision",
            adjudication: entry.adjudication || [],
            raw: entry
        };
    } catch (error) {
        console.warn(`[FHIR Gateway Warning] ${vendorKey} fetch failed:`, error.message);
        return null;
    }
};
