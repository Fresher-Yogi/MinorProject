// Backend/src/routes/appointmentRoutes.js - FINAL VERSION WITH RESCHEDULE AND REPORTS

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const authMiddleware = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');
const Branch = require('../models/Branch');
const User = require('../models/user');
const { sendEmail } = require('../utils/notificationService'); // Assuming sendEmail is available

// @route   POST /api/appointments
// @desc    Create a new appointment for the logged-in user
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { branchId, serviceType, appointmentDate, timeSlot, notes, priorityCriteria } = req.body;
    
    if (!branchId || !serviceType || !appointmentDate || !timeSlot) {
        return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // --- PRIORITY LOGIC (From previous step) ---
    let priorityLevel = 5; // Default to Normal
    let criteria = 'Normal';
    if (priorityCriteria) {
        criteria = priorityCriteria;
        if (priorityCriteria === 'Emergency') priorityLevel = 1;
        else if (priorityCriteria === 'Senior Citizen') priorityLevel = 2;
        else if (priorityCriteria === 'Child/Infant') priorityLevel = 3;
    }
    // --- END PRIORITY LOGIC ---

    const todaysAppointments = await Appointment.count({
      where: { branchId: branchId, appointmentDate: appointmentDate }
    });
    const queueNumber = todaysAppointments + 1;

    const appointment = await Appointment.create({
      userId: req.user.id,
      branchId,
      serviceType,
      appointmentDate,
      timeSlot,
      notes,
      status: 'pending',
      queueNumber: queueNumber,
      priorityLevel: priorityLevel,
      priorityCriteria: criteria
    });

    res.status(201).json({ 
      message: 'Appointment created successfully',
      appointment 
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/appointments/my-appointments
// @desc    Get appointments for the currently logged-in user
router.get('/my-appointments', authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { userId: req.user.id },
      order: [['appointmentDate', 'DESC']]
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/appointments
// @desc    Get appointments for Admins
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
    res.status(500).json({ message: 'Server Error' });
  }
});


// @route   GET /api/appointments/queue-position/:id
// @desc    Calculate and return a specific appointment's live queue position
router.get('/queue-position/:id', authMiddleware, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const currentAppointment = await Appointment.findByPk(appointmentId);
        
        if (!currentAppointment) { return res.status(404).json({ message: 'Appointment not found.' }); }
        if (currentAppointment.userId !== req.user.id) { return res.status(403).json({ message: 'Access Denied.' }); }
        if (currentAppointment.status !== 'pending') { return res.json({ position: 0, totalPending: 0, status: currentAppointment.status }); }

        const pendingQueue = await Appointment.findAll({
            where: {
                branchId: currentAppointment.branchId,
                appointmentDate: currentAppointment.appointmentDate,
                serviceType: currentAppointment.serviceType,
                status: 'pending'
            },
            order: [['priorityLevel', 'ASC'], ['timeSlot', 'ASC']] // Use priority in ordering
        });

        const positionIndex = pendingQueue.findIndex(apt => apt.id === currentAppointment.id);
        const position = positionIndex !== -1 ? positionIndex + 1 : 0; 
        
        res.json({
            position: position,
            totalPending: pendingQueue.length,
            status: 'pending'
        });
    } catch (error) {
        console.error("Error fetching queue position:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// ===============================================
// ✅ NEW FEATURE: ADMIN RESCHEDULE/UPDATE
// ===============================================

// @route   PUT /api/appointments/:id/reschedule
// @desc    Admin: Reschedule/Update a single appointment's details (Time/Date/Notes)
router.put('/:id/reschedule', authMiddleware, async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (user.role !== 'admin' && user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access Denied.' });
    }
    
    try {
        const { appointmentDate, timeSlot, notes } = req.body;
        const appointment = await Appointment.findByPk(req.params.id, {
            include: [{ model: User, attributes: ['name', 'email'] }] 
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }
        
        if (user.role === 'admin') {
            const branch = await Branch.findOne({ where: { adminId: user.id } });
            if (!branch || appointment.branchId !== branch.id) {
                return res.status(403).json({ message: 'You can only reschedule appointments for your own branch.' });
            }
        }

        const oldDate = appointment.appointmentDate;
        const oldTime = appointment.timeSlot;

        if (appointmentDate) appointment.appointmentDate = appointmentDate;
        if (timeSlot) appointment.timeSlot = timeSlot;
        if (notes !== undefined) appointment.notes = notes;

        await appointment.save();

        if (oldDate !== appointment.appointmentDate || oldTime !== appointment.timeSlot) {
            const subject = "❗ Your Appointment Has Been Rescheduled";
            const emailBody = `
                <h2>Appointment Reschedule Notification</h2>
                <p>Dear ${appointment.User.name},</p>
                <p>Your appointment for <strong>${appointment.serviceType}</strong> has been manually updated by the admin:</p>
                <ul>
                    <li><del>Old Date: ${oldDate}</del> $\rightarrow$ <strong>New Date: ${appointment.appointmentDate}</strong></li>
                    <li><del>Old Time: ${oldTime}</del> $\rightarrow$ <strong>New Time: ${appointment.timeSlot}</strong></li>
                    <li>Status: ${appointment.status.toUpperCase()}</li>
                    <li>Admin Notes: ${appointment.notes || 'N/A'}</li>
                </ul>
                <p>Please check your dashboard for the latest details.</p>
            `;
            sendEmail(
                appointment.User.email, 
                subject, 
                `Your QMS Appointment for ${appointment.serviceType} has been Rescheduled!`, 
                emailBody
            );
        }

        if (req.io) {
            req.io.emit('appointmentUpdated', appointment);
        }

        res.json({ message: 'Appointment updated and user notified.', appointment });
    } catch (error) {
        console.error("[Backend Reschedule Error]", error);
        res.status(500).json({ message: 'Server Error' });
    }
});


// ===============================================
// ✅ NEW FEATURE: REPORT GENERATION
// ===============================================

// @route   GET /api/appointments/reports/branch
// @desc    Admin: Generate comprehensive report for the assigned branch
router.get('/reports/branch', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied.' });
        }

        let whereClause = {};
        let branchName = 'Global Report';

        // 1. Get Branch ID for filtering (Branch Admin scope)
        if (user.role === 'admin') {
           const branch = await Branch.findOne({ where: { adminId: user.id } });
           if (!branch) {
               return res.status(404).json({ message: 'You are not assigned to a branch to generate a report.' });
           }
           whereClause.branchId = branch.id;
           branchName = branch.name;
        } 

        // 2. Fetch all appointments with User details
        const appointments = await Appointment.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['name', 'email', 'phone'] }],
            order: [['appointmentDate', 'DESC'], ['timeSlot', 'ASC']]
        });

        // 3. Format data for response
        const reportData = appointments.map(apt => ({
            appointmentId: apt.id,
            queueNumber: apt.queueNumber,
            date: apt.appointmentDate,
            time: apt.timeSlot,
            serviceType: apt.serviceType,
            status: apt.status,
            user: apt.User ? apt.User.name : 'N/A',
            userEmail: apt.User ? apt.User.email : 'N/A',
            userPhone: apt.User ? apt.User.phone : 'N/A',
            priority: apt.priorityCriteria || 'Normal',
            notes: apt.notes,
            bookedAt: apt.createdAt
        }));

        const dateString = new Date().toISOString().slice(0, 10);
        const fileName = `${branchName.replace(/\s/g, '_')}_Report_${dateString}.json`;

        // 4. Send the data as a downloadable JSON file
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.status(200).send(JSON.stringify(reportData, null, 2));

    } catch (error) {
        console.error("[Report Generation Error]", error);
        res.status(500).json({ message: 'Server Error during report generation.' });
    }
});


// @route   PUT /api/appointments/:id/status
// @desc    Update an appointment's status (for Admins/SuperAdmins)
router.put('/:id/status', authMiddleware, async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (user.role !== 'admin' && user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access Denied.' });
    }
    try {
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
            req.io.emit('appointmentUpdated', appointment);
        }

        // --- Logic for when an appointment is COMPLETED (Notifying next user) ---
        if (status === 'completed' && req.io) {
            
            const nextInQueue = await Appointment.findOne({
                where: {
                    branchId: appointment.branchId,
                    appointmentDate: appointment.appointmentDate,
                    serviceType: appointment.serviceType, // Keep service filter for a service-specific queue
                    status: 'pending' 
                },
                order: [['priorityLevel', 'ASC'], ['timeSlot', 'ASC']] // Use priority in ordering
            });

            if (nextInQueue) {
                console.log(`[DEBUG] SUCCESS: Found next user in queue. User ID: ${nextInQueue.userId}`);
                req.io.emit('queueUpdate', { 
                    nextAppointment: nextInQueue,
                    completedAppointmentId: appointment.id
                });
            } else {
                console.log('[DEBUG] FAILED: No other users were found waiting in this specific queue.');
            }
        }

        res.json({ message: `Appointment status updated to ${status}.`, appointment });
    } catch (error) {
        console.error("[Backend Error]", error);
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   PUT /api/appointments/:id/cancel
// @desc    Allows a logged-in user to cancel their OWN appointment.
// @access  Private (Users only)
router.put('/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const appointment = await Appointment.findByPk(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }
        
        if (appointment.userId !== user.id) {
            return res.status(403).json({ message: 'Access Denied. You do not own this appointment.' });
        }
        
        if (appointment.status !== 'pending') {
            return res.status(400).json({ message: `Cannot cancel an appointment that is already ${appointment.status}.` });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        if (req.io) {
            req.io.emit('appointmentUpdated', appointment);
            const queueIdentifier = {
                branchId: appointment.branchId,
                appointmentDate: appointment.appointmentDate,
                serviceType: appointment.serviceType
            };
            req.io.emit('queueModified', queueIdentifier);
        }

        res.json({ message: 'Appointment cancelled successfully.' });

    } catch (error) {
        console.error('[ERROR] User Cancel Appointment:', error.message);
        res.status(500).json({ message: 'Server error during cancellation.' });
    }
});


module.exports = router;