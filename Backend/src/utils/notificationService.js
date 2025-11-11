// --- NEW & COMPLETE CODE for Backend/src/utils/notificationService.js ---
const twilio = require('twilio');
const nodemailer = require('nodemailer');

console.log('--- notificationService.js file is being loaded ---');

// ===================================
// TWILIO (SMS) SETUP
// ===================================
let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client (SMS) initialized.');
} else {
    console.log('⚠️ Twilio credentials not found or disabled. SMS is disabled.');
}

// Function to send SMS (kept as a mock for the India/DLT issue)
const sendSms = async (toPhoneNumber, message) => {
    if (!twilioClient) {
        console.log(`[SMS MOCK]: Would send SMS to ${toPhoneNumber}. DLT required.`);
        return;
    }
    // Note: If you ever enable this for non-Indian numbers, the full Twilio logic is here.
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

// ===================================
// NODEMAILER (EMAIL) SETUP
// ===================================
let mailTransporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
        mailTransporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE, // Should be 'gmail'
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS, // The App Password
            },
        });
        console.log('✅ Nodemailer client (Email) initialized.');
    } catch (error) {
        console.error('❌ Nodemailer initialization failed:', error.message);
    }
} else {
    console.log('⚠️ Email credentials not found. Email is disabled.');
}

const sendEmail = async (toEmail, subject, textBody, htmlBody) => {
    if (!mailTransporter) {
        console.log(`[EMAIL SKIPPED]: Email client is not initialized. Would send to ${toEmail}.`);
        return;
    }
    
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: subject,
            text: textBody,
            html: htmlBody 
        };

        const info = await mailTransporter.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS]: Message sent to ${toEmail}. Response: ${info.response}`);

    } catch (error) {
        console.error(`[EMAIL FAILED]: Nodemailer returned an error for ${toEmail}:`, error.message);
    }
};

// Export both functions
module.exports = { sendSms, sendEmail };