const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '/Users/server/.openclaw/workspace/projects/cms-compliance-bridge/.env';
let supabaseUrl, supabaseKey;

try {
    const env = fs.readFileSync(envPath, 'utf8');
    supabaseUrl = env.match(/SUPABASE_URL=["']?([^"'\s]+)/)?.[1];
    supabaseKey = env.match(/SUP[A-Z_]*ANON_KEY[:=]\s*["']?([^"'\s]+)/)?.[1];
} catch (e) {
    console.error('Could not load .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const leads = [
    {
        username: "Reddit_User_Aetna_OON",
        title: "Out-of-Network Claim Denial (Pre-Auth Reversal)",
        url: "https://www.reddit.com/r/HealthInsurance/comments/1r984o5/advice_on_appeal_for_oon_with_aetna/",
        pain_point: "Claim denied post-service despite pre-authorization approval. Aetna citing OON deficiency.",
        insurance_type: "Aetna",
        status: "Drafted",
        estimated_value: 15000,
        clinical_synthesis: `### CASE 1: Aetna – Out-of-Network (OON) Appeal
Subject: Formal Appeal of Denied Claim – Denial of Pre-Authorized Out-of-Network Services

Clinical Narrative:
This appeal is submitted to contest the retrospective denial of services for which a formal pre-authorization was obtained and verified. The reversal of this authorization post-service creates an undue clinical and financial burden and disregards the established principle of clinical continuity.

At the time of authorization, it was determined that the specific clinical expertise required was not available within the local in-network (INN) provider directory. The patient has an established longitudinal relationship with the provider, and the requested services were integral to a multi-phase treatment plan already in progress. 

Aetna’s retrospective "OON deficiency" finding contradicts its own prior clinical determination. Under the principles of continuity of care, maintaining the provider-patient dyad is essential to prevent fragmentation of care. We request that Aetna honor the original pre-authorization agreement and process this claim at the INN benefit level.`,
        strategy: "PRE_AUTH_REVERSAL"
    },
    {
        username: "Reddit_User_Medicare_SNF",
        title: "SNF Discharge Appeal (NWB Femur Fracture)",
        url: "https://www.reddit.com/r/HealthInsurance/comments/1r699ak/how_do_i_appeal_an_unwanted_discharge_from_a/",
        pain_point: "Facility attempting discharge while patient is still Non-Weight Bearing (NWB). High fall risk.",
        insurance_type: "Medicare Advantage",
        status: "Drafted",
        estimated_value: 45000,
        clinical_synthesis: `### CASE 2: Medicare Advantage – SNF Discharge Appeal
Subject: Expedited Appeal of Discharge Plan – Preservation of Skilled Nursing Facility (SNF) Level of Care

Clinical Narrative:
As Medical Director, I am formally contesting the proposed discharge. The patient is currently recovering from a complex femur fracture with a strict "Non-Weight Bearing" (NWB) status as mandated by the orthopedic surgeon. 

Discharge at this stage is clinically premature and violates Medicare "Skilled Need" criteria. The patient requires skilled nursing and rehabilitative services to manage:
1. Safe Functional Mobility: The NWB status renders the patient unable to perform basic ADLs or pivot transfers safely. 
2. Complex Wound/Anticoagulation Management: Skilled monitoring is required to prevent DVT.
3. Surgeon Follow-Up: A safe discharge cannot be coordinated until the orthopedic surgeon evaluates the patient to potentially transition to partial weight-bearing.

The patient lacks the physical capacity for a safe community-based discharge. Until the NWB restriction is lifted, the patient meets the criteria for SNF level of care to prevent avoidable hospital readmission.`,
        strategy: "SKILLED_NEED_NWB"
    },
    {
        username: "Reddit_User_BCBS_GAS",
        title: "Thoracic Nerve Block Denial (Exploratory Status)",
        url: "https://www.reddit.com/r/HealthInsurance/comments/1rab66q/claim_denial_next_steps/",
        pain_point: "Anesthesia code 64466 denied as exploratory during gender-affirming mastectomy.",
        insurance_type: "Independence Administrators (BCBS)",
        status: "Drafted",
        estimated_value: 8500,
        clinical_synthesis: `### CASE 3: BCBS/Independence Administrators – Gender Affirming Surgery (GAS)
Subject: Clinical Justification for CPT 64466 – Refutation of 'Exploratory' Status

Clinical Narrative:
This narrative defends the medical necessity of CPT 64466 (Paravertebral Block, Thoracic) performed in conjunction with a medically necessary mastectomy (F64.9). The denial of this code as "exploratory" reflects a fundamental misunderstanding of the procedure's role.

CPT 64466 is not an exploratory procedure; it is a targeted, ultrasound-guided regional anesthetic intervention. In the context of Gender Affirming Surgery (GAS), a thoracic nerve block is the standard-of-care for multi-modal analgesia. Its clinical purpose is twofold:
1. Opioid Sparing: It significantly reduces the requirement for systemic opioids, decreasing the risk of respiratory depression and ileus.
2. Enhanced Recovery: By providing superior pain control at the surgical site, it allows for earlier mobilization. 

The designation of 64466 as 'exploratory' is clinically incorrect; it is a well-established anesthesia technique. We request an immediate re-evaluation of this claim based on its status as a medically necessary component of the primary surgical encounter.`,
        strategy: "CPT_64466_JUSTIFICATION"
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
        data.forEach(l => console.log(` - [${l.insurance_type}] $${l.estimated_value} : ${l.title}`));
    }
}

run();
