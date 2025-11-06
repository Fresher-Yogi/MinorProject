const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');

// Create appointment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { branchId, serviceType, appointmentDate, timeSlot } = req.body;
    
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

// Get user's appointments
router.get('/my-appointments', authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { userId: req.user.id }
    });
    res.json(appointments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all appointments (admin)
router.get('/',authMiddleware , async (req, res) => {
  try {
    const appointments = await Appointment.findAll();
    res.json(appointments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});




// --- REPLACE THIS BLOCK IN backend/src/routes/appointmentRoutes.js ---

router.put('/:id/status', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
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
        appointment.status = status;
        await appointment.save();

        // --- ✅ NEW CHANGE: Broadcast the update signal ---
        // Hum poore system mein chilla kar bata rahe hain ki "ek appointment update hua hai!"
        // Hum updated appointment ka data bhi saath mein bhej rahe hain.
        req.io.emit('appointmentUpdated', appointment);

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