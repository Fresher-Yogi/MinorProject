// --- FINAL, UPDATED CODE for backend/src/routes/appointmentRoutes.js ---

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');
const Branch = require('../models/Branch');
const User = require('../models/user');

// @route   POST /api/appointments
// @desc    Create a new appointment for the logged-in user
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { branchId, serviceType, appointmentDate, timeSlot } = req.body;
    
    // Basic validation
    if (!branchId || !serviceType || !appointmentDate || !timeSlot) {
        return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const appointment = await Appointment.create({
      userId: req.user.id,
      branchId,
      serviceType,
      appointmentDate,
      timeSlot,
      status: 'pending'
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
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});


// --- 🛑 THIS IS THE UPDATED BLOCK ---
// @route   GET /api/appointments
// @desc    Get appointments for Admins (Super Admin gets all, Branch Admin gets their branch's)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    let whereClause = {};

    // If the user is a branch admin, filter appointments by their assigned branch
    if (user.role === 'admin') {
       const branch = await Branch.findOne({ where: { adminId: user.id } });
       
       // If the admin isn't assigned to a branch, return an empty array
       if (!branch) {
           return res.json([]);
       }
       // Set the filter to only include appointments for their branch
       whereClause.branchId = branch.id;

    } else if (user.role !== 'superadmin') {
       // If the user is not an admin or superadmin (e.g., a normal 'user'), deny access.
       // They should use the '/my-appointments' route instead.
       return res.status(403).json({ message: 'Access Denied for this role.' });
    }
    // If the user is a 'superadmin', the whereClause remains an empty object {}, so all appointments are fetched.

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
// --- 🛑 END OF UPDATED BLOCK ---


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

        // --- Optional Security Check: Branch admin can only update their own branch's appointments ---
        if (user.role === 'admin') {
            const branch = await Branch.findOne({ where: { adminId: user.id } });
            if (!branch || appointment.branchId !== branch.id) {
                return res.status(403).json({ message: 'You can only update appointments for your own branch.' });
            }
        }
        // --- End of Optional Check ---

        appointment.status = status;
        await appointment.save();

        // Broadcast the real-time update to all clients
        if (req.io) {
            req.io.emit('appointmentUpdated', appointment);
        }

        res.json({
            message: `Appointment #${appointment.id} status updated to ${status}.`,
            appointment
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;