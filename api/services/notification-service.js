/**
 * Patient Notification Service v1.0
 * Handles multi-channel status updates (Email/SMS)
 */

exports.sendUpdate = async (lead, type) => {
    const patientName = lead.username || lead.user;
    const payer = lead.insurance_type;
    const amount = lead.estimated_value;

    let message = "";

    switch(type) {
        case 'SUBMITTED':
            message = `Hello ${patientName}, your clinical appeal for ${lead.title} has been officially transmitted to ${payer}. Our medical directors are advocating for your coverage.`;
            break;
        case 'VICTORY':
            message = `Great news ${patientName}! Your appeal with ${payer} was successful. Coverage for ${lead.title} ($${parseFloat(amount).toLocaleString()}) has been approved.`;
            break;
        case 'REFINEMENT':
            message = `Hello ${patientName}, we are performing an advanced clinical review of your claim with ${payer} to ensure all evidence is correctly presented. No action needed.`;
            break;
    }

    console.log(`[Notification Bridge] Dispatching ${type} alert to ${patientName}...`);
    console.log(`[Content]: "${message}"`);

    // In production, integrate with SendGrid or Twilio here:
    // await twilio.messages.create({ body: message, to: lead.patient_phone, from: process.env.TWILIO_NUMBER });

    return { success: true, channel: 'SMS/Email', dispatched_at: new Date().toISOString() };
};
