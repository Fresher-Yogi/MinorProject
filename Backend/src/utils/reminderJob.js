// Backend/src/utils/reminderJob.js - NEW FILE

const { Op } = require('sequelize');
const Appointment = require('../models/Appointment');
const User = require('../models/user');
const Branch = require('../models/Branch');
const { sendEmail, sendSms } = require('./notificationService');

// This is the main function that will be called by our scheduler
const sendAppointmentReminders = async () => {
    console.log(`[Scheduler] Running job: Sending Appointment Reminders at ${new Date().toLocaleString()}`);

    try {
        // --- 1. Define the Time Window: "Tomorrow" ---
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        
        // Get the date string in "YYYY-MM-DD" format
        const tomorrowDateString = tomorrow.toISOString().split('T')[0];

        // --- 2. Find All Relevant Appointments ---
        // Find all appointments that are:
        // - Scheduled for tomorrow
        // - Still 'pending'
        // - Have NOT had a reminder sent yet
        const upcomingAppointments = await Appointment.findAll({
            where: {
                appointmentDate: tomorrowDateString,
                status: 'pending',
                reminderSent: false
            },
            include: [ // We need to include User and Branch to get their details for the email
                { model: User, attributes: ['name', 'email', 'phone'] },
                { model: Branch, attributes: ['name', 'location'] }
            ]
        });

        if (upcomingAppointments.length === 0) {
            console.log('[Scheduler] No upcoming appointments found for tomorrow that need a reminder.');
            return;
        }

        console.log(`[Scheduler] Found ${upcomingAppointments.length} appointments to remind.`);

        // --- 3. Loop Through and Send Notifications ---
        for (const appointment of upcomingAppointments) {
            const user = appointment.User;
            const branch = appointment.Branch;
            const date = new Date(appointment.appointmentDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            // --- Email Content ---
            const emailSubject = `Appointment Reminder: ${appointment.serviceType} tomorrow at ${appointment.timeSlot}`;
            const emailHtmlBody = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Hi ${user.name},</h2>
                    <p>This is a friendly reminder for your upcoming appointment.</p>
                    <h3 style="color: #3b82f6;">Appointment Details:</h3>
                    <ul>
                        <li><strong>Service:</strong> ${appointment.serviceType}</li>
                        <li><strong>Branch:</strong> ${branch.name}</li>
                        <li><strong>Location:</strong> ${branch.location}</li>
                        <li><strong>Date:</strong> ${date}</li>
                        <li><strong>Time:</strong> ${appointment.timeSlot}</li>
                    </ul>
                    <p>If you need to cancel or reschedule, please log in to your dashboard.</p>
                    <p>We look forward to seeing you!</p>
                    <br>
                    <p><em>- The QMS Team</em></p>
                </div>
            `;
            const emailTextBody = `Hi ${user.name},\nThis is a reminder for your appointment tomorrow.\nDetails:\n- Service: ${appointment.serviceType}\n- Branch: ${branch.name}\n- Date: ${date}\n- Time: ${appointment.timeSlot}\n\nWe look forward to seeing you!`;

            // --- Send the Email and SMS ---
            await sendEmail(user.email, emailSubject, emailTextBody, emailHtmlBody);
            // You can uncomment SMS if you have it configured
            // await sendSms(user.phone, `Reminder: Your appointment for ${appointment.serviceType} is tomorrow at ${appointment.timeSlot} at ${branch.name}.`);

            // --- 4. Mark as Sent to Prevent Duplicates ---
            // This is the most important step to avoid spamming users.
            appointment.reminderSent = true;
            await appointment.save();
            
            console.log(`[Scheduler] Reminder sent successfully for appointment ID: ${appointment.id} to user: ${user.email}`);
        }

    } catch (error) {
        console.error('[Scheduler] CRITICAL ERROR while sending reminders:', error);
    }
};

// Export the function so we can use it in server.js
module.exports = { sendAppointmentReminders };