const supabase = require('./api/services/supabaseClient.js');

const leads = [
  {
    external_id: "1rgswmv",
    title: "Colorado Newborn Mandate Confusion",
    estimated_value: 13000,
    insurance_type: "Anthem BCBS",
    status: "New",
    pain_point: "I had a baby at the end of July. I have AnthemBCBS through my employer... Anthem starts recoupment for payments... $13k in claims... Anthem cited a Colorado-specific mandate...",
    clinical_synthesis: "This appeal contests the denial of coverage for newborn services based on 'Birthday Rule' secondary payer logic. Pursuant to Colorado Revised Statute § 10-16-104, all health benefit plans must provide coverage for newborn children from the moment of birth, extending for 31 days..."
  },
  {
    external_id: "1rl4owz",
    title: "Experimental Test Appeal",
    estimated_value: 2500,
    insurance_type: "Unknown",
    status: "New",
    pain_point: "I had a test done late last year (larger claim). At first it was denied due to being considered 'experimental/investigative.'... The claim for the provider who performed the test is still denied.",
    clinical_synthesis: "The denial of [Test Name] as 'experimental or investigational' is inconsistent with both clinical evidence and the payer’s own prior adjudications. We note that a larger, concurrent claim for the exact same diagnostic profile was previously overturned and paid by the plan..."
  },
  {
    external_id: "1rmjmzo",
    title: "Aetna Spinal Fusion Denial",
    estimated_value: 75000,
    insurance_type: "Aetna",
    status: "New",
    pain_point: "Aetna denied my spinal fusion surgery citing it was not medically necessary despite my chronic back pain and failed conservative treatments.",
    clinical_synthesis: "The request for lumbar spinal fusion for this patient meets all clinical criteria outlined in Aetna CPB 0016. A comprehensive review of the patient’s medical record confirms the following: 1. Duration of Symptoms (>3 months), 2. Conservative Therapy (>6 weeks failed), 3. Imaging Support..."
  }
];

async function upsertLeads() {
    for (const lead of leads) {
        console.log(`Upserting lead: ${lead.external_id}`);
        const { data, error } = await supabase
            .from('healthcare_denial_leads')
            .upsert(lead, { onConflict: 'url' }); // Note: I should use a unique field like 'url' or 'id' if 'external_id' isn't in schema
        
        if (error) {
            console.error(`Error upserting ${lead.external_id}:`, error.message);
        } else {
            console.log(`Successfully upserted ${lead.external_id}`);
        }
    }
}

upsertLeads();
