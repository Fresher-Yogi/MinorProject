// Backend/src/utils/notificationService.js
const twilio = require('twilio');

console.log('--- notificationService.js file is being loaded ---'); // <-- DEBUGGING LINE

let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client has been initialized.');
} else {
    console.log('⚠️ Twilio credentials not found. SMS will be disabled.');
}

exports.sendSms = async (toPhoneNumber, message) => {
    console.log('--- sendSms function has been called ---'); // <-- DEBUGGING LINE

    // We will now check the status of twilioClient INSIDE the function
    if (!twilioClient) {
        console.log('[SMS SKIPPED]: The twilioClient variable is NOT valid at this time.'); // <-- DEBUGGING LINE
        return;
    }
    if (!toPhoneNumber) {
        console.log('[SMS SKIPPED]: The toPhoneNumber parameter is missing.'); // <-- DEBUGGING LINE
        return;
    }

    console.log(`[SMS ATTEMPT]: Trying to send to ${toPhoneNumber}`); // <-- DEBUGGING LINE

    try {
        await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: toPhoneNumber
        });
        console.log(`[SMS SUCCESS]: Message sent to ${toPhoneNumber}.`);
    } catch (error) {
        console.error(`[SMS FAILED]: Twilio API returned an error:`, error.message);
    }
};