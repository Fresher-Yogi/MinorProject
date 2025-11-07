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

    // --- ✅ NEW LOGIC TO CALCULATE QUEUE NUMBER ---
    // Count how many appointments already exist for this branch on this specific day.
    const todaysAppointments = await Appointment.count({
      where: {
        branchId: branchId,
        appointmentDate: appointmentDate
      }
    });

    // The new queue number is the current count + 1.
    const queueNumber = todaysAppointments + 1;
    // --- ✅ END OF NEW LOGIC ---

    const appointment = await Appointment.create({
      userId: req.user.id,
      branchId,
      serviceType,
      appointmentDate,
      timeSlot,
      status: 'pending',
      queueNumber: queueNumber // ✅ Save the new queue number to the database
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


// @route   GET /api/appointments
// @desc    Get appointments for Admins (Super Admin gets all, Branch Admin gets their branch's)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    let whereClause = {};

    if (user.role === 'admin') {
       const branch = await Branch.findOne({ where: { adminId: user.id } });
       if (!branch) {
           return res.json([]);
       }
       whereClause.branchId = branch.id;

    } else if (user.role !== 'superadmin') {
       return res.status(403).json({ message: 'Access Denied for this role.' });
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