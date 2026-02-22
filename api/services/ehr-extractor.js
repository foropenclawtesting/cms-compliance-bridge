const axios = require('axios');

/**
 * EHR Clinical Tunnel v1.0
 * Deep-fetches patient clinical data via FHIR R4.
 */

exports.fetchPatientHistory = async (patientId, fhirBase) => {
    const baseUrl = fhirBase || "https://launch.smarthealthit.org/v/r4/fhir";
    console.log(`[EHR Tunnel] Extracting verified clinical data for Patient: ${patientId}...`);

    try {
        // Parallel fetch of Conditions (Diagnoses) and MedicationRequests (History)
        const [conditionsRes, medsRes] = await Promise.all([
            axios.get(`${baseUrl}/Condition?patient=${patientId}`),
            axios.get(`${baseUrl}/MedicationRequest?patient=${patientId}`)
        ]);

        const diagnoses = (conditionsRes.data.entry || [])
            .map(e => e.resource.code?.text || e.resource.code?.coding?.[0]?.display)
            .filter(Boolean);

        const medications = (medsRes.data.entry || [])
            .map(e => e.resource.medicationCodeableConcept?.text || e.resource.medicationCodeableConcept?.coding?.[0]?.display)
            .filter(Boolean);

        return {
            diagnoses: diagnoses.slice(0, 5), // Top 5 relevant conditions
            medications: medications.slice(0, 5), // Top 5 relevant meds for Step Therapy defense
            verified_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('[EHR Error]:', error.message);
        return { diagnoses: [], medications: [], error: error.message };
    }
};
