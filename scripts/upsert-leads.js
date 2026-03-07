const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Credentials from .env
const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
const supabaseKey = env.match(/SUPABASE_ANON_KEY=["']?([^"'\s]+)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

const leads = [
    {
        username: "Reddit_User_Aetna_OON",
        title: "Aetna OON Appeal (Stake: $15,000)",
        url: "https://www.reddit.com/r/HealthInsurance/comments/1r984o5/advice_on_appeal_for_oon_with_aetna/",
        pain_point: "Claim denied post-service despite pre-authorization approval. Aetna citing OON deficiency. Estimated Value: $15,000.",
        insurance_type: "Aetna",
        status: "Drafted",
        priority: "High Priority",
        drafted_appeal: `### CASE 1: Aetna – Out-of-Network (OON) Appeal
Subject: Formal Appeal of Denied Claim – Denial of Pre-Authorized Out-of-Network Services

Clinical Narrative:
This appeal is submitted to contest the retrospective denial of services for [Patient Name], for which a formal pre-authorization (Auth # [Number]) was obtained and verified on [Date]. The reversal of this authorization post-service creates an undue clinical and financial burden and disregards the established principle of clinical continuity.

At the time of authorization, it was determined that the specific clinical expertise required for [Condition/Procedure] was not available within the local in-network (INN) provider directory, or that a transition of care at that juncture would have posed a significant risk to the patient’s clinical outcome. The patient has an established longitudinal relationship with the provider, and the requested services were integral to a multi-phase treatment plan already in progress. 

Aetna’s retrospective "OON deficiency" finding contradicts its own prior clinical determination. Under the principles of continuity of care, particularly for complex or ongoing treatments, maintaining the provider-patient dyad is essential to prevent fragmentation of care, medication errors, and sub-optimal surgical outcomes. We request that Aetna honor the original pre-authorization agreement and process this claim at the INN benefit level as previously committed.`
    },
    {
        username: "Reddit_User_Medicare_SNF",
        title: "Medicare SNF Discharge (Stake: $45,000)",
        url: "https://www.reddit.com/r/HealthInsurance/comments/1r699ak/how_do_i_appeal_an_unwanted_discharge_from_a/",
        pain_point: "Facility attempting discharge while patient is still Non-Weight Bearing (NWB). High fall risk. Estimated Value: $45,000.",
        insurance_type: "Medicare Advantage",
        status: "Drafted",
        priority: "High Priority",
        drafted_appeal: `### CASE 2: Medicare Advantage – SNF Discharge Appeal
Subject: Expedited Appeal of Discharge Plan – Preservation of Skilled Nursing Facility (SNF) Level of Care

Clinical Narrative:
As Medical Director, I am formally contesting the proposed discharge of [Patient Name] from [Facility Name]. The patient is currently recovering from a complex femur fracture with a strict "Non-Weight Bearing" (NWB) status as mandated by the orthopedic surgeon. 

Discharge at this stage is clinically premature and violates Medicare "Skilled Need" criteria. The patient requires skilled nursing and rehabilitative services to manage:
1.  Safe Functional Mobility: The NWB status renders the patient unable to perform basic Activities of Daily Living (ADLs) or "pivot" transfers safely. Attempting these at home without 24/7 skilled supervision poses an immediate risk of falls, hardware failure, and surgical site dehiscence.
2.  Complex Wound/Anticoagulation Management: Skilled monitoring is required to prevent Deep Vein Thrombosis (DVT) and ensure the integrity of the surgical site.
3.  Surgeon Follow-Up: A safe discharge cannot be coordinated until the orthopedic surgeon evaluates the patient on [Date] to potentially transition to partial weight-bearing.

The patient lacks the physical capacity for a safe "community-based" discharge. Until the NWB restriction is lifted or modified, the patient meets the criteria for SNF level of care to prevent avoidable hospital readmission and permanent disability.`
    },
    {
        username: "Reddit_User_BCBS_GAS",
        title: "BCBS Nerve Block Denial (Stake: $8,500)",
        url: "https://www.reddit.com/r/HealthInsurance/comments/1rab66q/claim_denial_next_steps/",
        pain_point: "Anesthesia code 64466 denied as exploratory during gender-affirming mastectomy. Estimated Value: $8,500.",
        insurance_type: "Independence Administrators (BCBS)",
        status: "Drafted",
        priority: "Normal",
        drafted_appeal: `### CASE 3: BCBS/Independence Administrators – Gender Affirming Surgery (GAS)
Subject: Clinical Justification for CPT 64466 – Refutation of 'Exploratory' Status

Clinical Narrative:
This narrative defends the medical necessity of CPT 64466 (Paravertebral Block, Thoracic) performed in conjunction with a medically necessary mastectomy (F64.9). The denial of this code as "exploratory" reflects a fundamental misunderstanding of the procedure's role in modern perioperative medicine.

CPT 64466 is not an exploratory procedure; it is a targeted, ultrasound-guided regional anesthetic intervention. In the context of Gender Affirming Surgery (GAS), a thoracic nerve block is the **standard-of-care** for multi-modal analgesia. Its clinical purpose is twofold:
1.  Opioid Sparing: It significantly reduces the requirement for systemic opioids, thereby decreasing the risk of respiratory depression, post-operative nausea, and ileus.
2.  Enhanced Recovery: By providing superior dermatomal pain control during the immediate post-operative phase, it allows for earlier mobilization and improved respiratory effort (preventing atelectasis).

Categorizing a regional anesthesia block as "exploratory" is clinically inaccurate. This procedure was performed to ensure the safety and recovery of the patient during a highly invasive chest reconstruction. We request the immediate reversal of this denial and reimbursement for the anesthesia services provided.`
    }
];

async function run() {
    console.log(`[Compliance Bridge] Upserting ${leads.length} leads to Supabase...`);
    const { data, error } = await supabase
        .from('healthcare_denial_leads')
        .upsert(leads, { onConflict: 'url' })
        .select();

    if (error) {
        console.error('Upsert Error:', error.message);
    } else {
        console.log('✅ Success! Leads synchronized.');
        data.forEach(l => console.log(` - [${l.insurance_type}] : ${l.title}`));
    }
}

run();
