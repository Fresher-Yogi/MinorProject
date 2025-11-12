// --- START OF FILE appointmentRoutes.js ---

// Backend/src/routes/appointmentRoutes.js

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize'); // Make sure Op is imported
const authMiddleware = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');
const Branch = require('../models/Branch');
const User = require('../models/user');

// @route   POST /api/appointments
// @desc    Create a new appointment for the logged-in user
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { branchId, serviceType, appointmentDate, timeSlot, notes } = req.body;
    
    if (!branchId || !serviceType || !appointmentDate || !timeSlot) {
        return res.status(400).json({ message: 'Please provide all required fields.' });
    }

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
      queueNumber: queueNumber
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

// @route   PUT /api/appointments/:id/status
// @desc    Update an appointment's status (for Admins)
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

        if (status === 'completed' && req.io) {
            
            const nextInQueue = await Appointment.findOne({
                where: {
                    branchId: appointment.branchId,
                    appointmentDate: appointment.appointmentDate,
                    serviceType: appointment.serviceType,
                    status: 'pending'
                },
                order: [['timeSlot', 'ASC']]
            });

            if (nextInQueue) {
                req.io.emit('queueUpdate', { 
                    nextAppointment: nextInQueue
                });
            }
        }

        res.json({ message: `Appointment status updated to ${status}.`, appointment });
    } catch (error) {
        console.error("[Backend Error]", error);
        res.status(500).json({ message: 'Server Error' });
    }
});


// ✅ --- START: NEW ROUTE FOR USER-INITIATED CANCELLATION --- ✅
// This route is completely new and does not touch the existing '/status' routes.
// @route   PUT /api/appointments/:id/cancel
// @desc    Allows a logged-in user to cancel their OWN appointment.
// @access  Private (Users only)
router.put('/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const appointment = await Appointment.findByPk(req.params.id);

        // Security Check 1: Ensure appointment exists
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }
        
        // Security Check 2: Ensure user owns this appointment
        if (appointment.userId !== user.id) {
            return res.status(403).json({ message: 'Access Denied. You do not own this appointment.' });
        }
        
        // Security Check 3: Ensure appointment is not already completed/cancelled
        if (appointment.status !== 'pending') {
            return res.status(400).json({ message: `Cannot cancel an appointment that is already ${appointment.status}.` });
        }

        // Update the status
        appointment.status = 'cancelled';
        await appointment.save();

        // Emit real-time events
        if (req.io) {
            // Notify the user their cancellation was successful
            req.io.emit('appointmentUpdated', appointment);

            // Notify others in the same queue that a slot opened up
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
// ✅ --- END: NEW ROUTE --- ✅


module.exports = router;