const scrubber = require('./api/services/pii-scrubber.js');

const leads = [
    {
        id: "1rgswmv",
        title: "Colorado Newborn Mandate Confusion",
        original: "I had a baby at the end of July. I have AnthemBCBS through my employer... Anthem starts recoupment for payments... $13k in claims... Anthem cited a Colorado-specific mandate...",
        value: 13000
    },
    {
        id: "1rl4owz",
        title: "Experimental Test Appeal",
        original: "I had a test done late last year (larger claim). At first it was denied due to being considered 'experimental/investigative.'... The claim for the provider who performed the test is still denied.",
        value: 2500
    },
    {
        id: "1rmjmzo",
        title: "Aetna Spinal Fusion Denial",
        original: "Aetna denied my spinal fusion surgery citing it was not medically necessary despite my chronic back pain and failed conservative treatments.",
        value: 50000
    }
];

const scrubbedLeads = leads.map(l => ({
    ...l,
    scrubbed: scrubber.scrub(l.original)
}));

console.log(JSON.stringify(scrubbedLeads, null, 2));
