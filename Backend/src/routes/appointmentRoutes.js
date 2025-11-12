// Backend/src/routes/appointmentRoutes.js - FINAL VERSION with LIVE STATUS ROUTE

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const authMiddleware = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');
const Branch = require('../models/Branch');
const User = require('../models/user');
const { sendEmail } = require('../utils/notificationService');

// @route   POST /api/appointments
// @desc    Create a new appointment and send confirmation email
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { branchId, serviceType, appointmentDate, timeSlot, notes } = req.body;
    
    if (!branchId || !serviceType || !appointmentDate || !timeSlot) {
        return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const existingSlot = await Appointment.findOne({
      where: { branchId, appointmentDate, timeSlot, status: { [Op.ne]: 'cancelled' } }
    });

    if (existingSlot) {
      return res.status(409).json({ message: 'Sorry, this time slot was just booked. Please select another time.' });
    }

    const todaysAppointments = await Appointment.count({
      where: { branchId: branchId, appointmentDate: appointmentDate }
    });
    const queueNumber = todaysAppointments + 1;

    const newAppointment = await Appointment.create({
      userId: req.user.id, branchId, serviceType, appointmentDate, timeSlot, notes, status: 'pending', queueNumber: queueNumber
    });

    try {
        const detailedAppointment = await Appointment.findByPk(newAppointment.id, {
            include: [
                { model: User, attributes: ['name', 'email'] },
                { model: Branch, attributes: ['name', 'location'] }
            ]
        });

        if (detailedAppointment) {
            const user = detailedAppointment.User;
            const branch = detailedAppointment.Branch;
            const formattedDate = new Date(detailedAppointment.appointmentDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            const emailSubject = `Appointment Confirmed: ${detailedAppointment.serviceType} on ${formattedDate}`;
            const emailHtmlBody = `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><h2>Hi ${user.name},</h2><p>Your appointment has been successfully booked! Please find the details below.</p><h3 style="color: #3b82f6;">Appointment Details:</h3><ul><li><strong>Service:</strong> ${detailedAppointment.serviceType}</li><li><strong>Branch:</strong> ${branch.name}</li><li><strong>Location:</strong> ${branch.location}</li><li><strong>Date:</strong> ${formattedDate}</li><li><strong>Time:</strong> ${detailedAppointment.timeSlot}</li><li><strong>Your Queue Number:</strong> #${detailedAppointment.queueNumber}</li></ul><p>You can view and manage your appointment from your QMS dashboard.</p><p>Thank you for using our system!</p></div>`;
            const emailTextBody = `Hi ${user.name},\nYour appointment is confirmed.\nDetails:\n- Service: ${detailedAppointment.serviceType}\n- Branch: ${branch.name}\n- Date: ${formattedDate}\n- Time: ${detailedAppointment.timeSlot}\n- Queue No: #${detailedAppointment.queueNumber}`;
            
            sendEmail(user.email, emailSubject, emailTextBody, emailHtmlBody);
        }
    } catch (emailError) {
        console.error(`[Email Error] Failed to send confirmation for appointment ID ${newAppointment.id}:`, emailError);
    }
    
    res.status(201).json({ message: 'Appointment created successfully', appointment: newAppointment });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});


// @route   PUT /api/appointments/:id/reschedule
// @desc    Allows a user to reschedule their OWN appointment
router.put('/:id/reschedule', authMiddleware, async (req, res) => {
    try {
        const { newDate, newTimeSlot } = req.body;
        const { id } = req.params;

        if (!newDate || !newTimeSlot) {
            return res.status(400).json({ message: 'New date and time slot are required.' });
        }

        const appointment = await Appointment.findByPk(id);

        if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
        if (appointment.userId !== req.user.id) return res.status(403).json({ message: 'Access Denied. You do not own this appointment.' });
        if (appointment.status !== 'pending') return res.status(400).json({ message: `Cannot reschedule an appointment that is already ${appointment.status}.` });

        const existingSlot = await Appointment.findOne({
            where: {
                id: { [Op.ne]: id },
                branchId: appointment.branchId,
                appointmentDate: newDate,
                timeSlot: newTimeSlot,
                status: { [Op.ne]: 'cancelled' }
            }
        });

        if (existingSlot) {
            return res.status(409).json({ message: 'This time slot is no longer available. Please choose another one.' });
        }

        appointment.appointmentDate = newDate;
        appointment.timeSlot = newTimeSlot;
        appointment.reminderSent = false; 

        await appointment.save();
        
        try {
            const detailedRescheduledAppt = await Appointment.findByPk(appointment.id, {
                include: [
                    { model: User, attributes: ['name', 'email'] },
                    { model: Branch, attributes: ['name', 'location'] }
                ]
            });

            if (detailedRescheduledAppt) {
                const user = detailedRescheduledAppt.User;
                const branch = detailedRescheduledAppt.Branch;
                const newFormattedDate = new Date(detailedRescheduledAppt.appointmentDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                const emailSubject = `Appointment Rescheduled: Your new time for ${detailedRescheduledAppt.serviceType}`;
                const emailHtmlBody = `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><h2>Hi ${user.name},</h2><p>Your appointment has been successfully rescheduled. Here are your new details.</p><h3 style="color: #3b82f6;">New Appointment Details:</h3><ul><li><strong>Service:</strong> ${detailedRescheduledAppt.serviceType}</li><li><strong>Branch:</strong> ${branch.name}</li><li><strong>Date:</strong> ${newFormattedDate}</li><li><strong>Time:</strong> ${detailedRescheduledAppt.timeSlot}</li></ul><p>Please note these changes. You can always view your latest appointment details on your dashboard.</p></div>`;
                const emailTextBody = `Hi ${user.name},\nYour appointment has been rescheduled.\nNew Details:\n- Service: ${detailedRescheduledAppt.serviceType}\n- Branch: ${branch.name}\n- Date: ${newFormattedDate}\n- Time: ${detailedRescheduledAppt.timeSlot}`;
                
                sendEmail(user.email, emailSubject, emailTextBody, emailHtmlBody);
            }
        } catch (emailError) {
            console.error(`[Email Error] Failed to send reschedule notification for appointment ID ${appointment.id}:`, emailError);
        }

        res.json({ message: 'Appointment rescheduled successfully!', appointment });

    } catch (error) {
        console.error('[ERROR] Reschedule Appointment:', error.message);
        res.status(500).json({ message: 'Server error during rescheduling.' });
    }
});


// @route   GET /api/appointments/my-appointments
// @desc    Get appointments for the currently logged-in user
router.get('/my-appointments', authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { userId: req.user.id },
      order: [['appointmentDate', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(appointments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/appointments
// @desc    Get appointments for Admins/Superadmins
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    let whereClause = {};

    if (user.role === 'admin') {
       const branch = await Branch.findOne({ where: { adminId: user.id } });
       if (!branch) return res.json([]);
       whereClause.branchId = branch.id;
    } else if (user.role !== 'superadmin') {
       return res.status(403).json({ message: 'Access Denied.' });
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      order: [['appointmentDate', 'DESC'], ['timeSlot', 'ASC']]
    });
    res.json(appointments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/appointments/:id/status
// @desc    Update an appointment's status (for Admins)
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied.' });
        }
        
        const { status } = req.body;
        if (!['pending', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status.' });
        }
        
        const appointment = await Appointment.findByPk(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (user.role === 'admin') {
            const branch = await Branch.findOne({ where: { adminId: user.id } });
            if (!branch || appointment.branchId !== branch.id) {
                return res.status(403).json({ message: 'You can only update appointments for your own branch.' });
            }
        }

        appointment.status = status;
        await appointment.save();

        if (req.io) {
            // This event tells the tracking page to refresh
            req.io.emit('appointmentUpdated', appointment);
        }

        res.json({ message: `Appointment status updated to ${status}.`, appointment });
    } catch (error) {
        console.error("[Backend Error]", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/appointments/:id/cancel
// @desc    Allows a logged-in user to cancel their OWN appointment.
router.put('/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const appointment = await Appointment.findByPk(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }
        
        if (appointment.userId !== req.user.id) {
            return res.status(403).json({ message: 'Access Denied. You do not own this appointment.' });
        }
        
        if (appointment.status !== 'pending') {
            return res.status(400).json({ message: `Cannot cancel an appointment that is already ${appointment.status}.` });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        if (req.io) {
            req.io.emit('appointmentUpdated', appointment);
        }

        res.json({ message: 'Appointment cancelled successfully.' });

    } catch (error) {
        console.error('[ERROR] User Cancel Appointment:', error.message);
        res.status(500).json({ message: 'Server error during cancellation.' });
    }
});


// ===============================================================
// ✅ NEW LIVE STATUS ROUTE
// ===============================================================
// @route   GET /api/appointments/:id/live-status
// @desc    Gets the complete queue status relative to a specific appointment
router.get('/:id/live-status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get the user's specific appointment
        const userAppointment = await Appointment.findByPk(id, {
            include: [{ model: Branch, attributes: ['name'] }]
        });

        if (!userAppointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        // Security check: Make sure the user requesting this status owns the appointment
        if (userAppointment.userId !== req.user.id) {
            return res.status(403).json({ message: "Access Denied. You can only track your own appointments." });
        }

        // Define the queue: same branch, same day, same service
        const queueDefinition = {
            branchId: userAppointment.branchId,
            appointmentDate: userAppointment.appointmentDate,
            serviceType: userAppointment.serviceType
        };

        // 2. Find who is currently being served (the last completed appointment for this queue)
        const nowServing = await Appointment.findOne({
            where: {
                ...queueDefinition,
                status: 'completed'
            },
            order: [['updatedAt', 'DESC']] // The most recently completed is "now serving"
        });

        // 3. Find everyone who is still waiting in the queue
        const waitingList = await Appointment.findAll({
            where: {
                ...queueDefinition,
                status: 'pending'
            },
            order: [['timeSlot', 'ASC']] // Order the waiting list by their time
        });

        res.json({
            userAppointment,
            nowServing: nowServing || null, // Send null if no one has been served yet
            waitingList,
            totalInQueue: waitingList.length
        });

    } catch (error) {
        console.error("[ERROR] Live Status:", error.message);
        res.status(500).json({ message: "Server error while fetching live queue status." });
    }
});


module.exports = router;