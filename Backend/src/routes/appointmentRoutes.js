// const express = require('express');
// const router = express.Router();
// const Appointment = require('../models/Appointment');
// const authMiddleware = require('../middleware/authMiddleware');

// // Create appointment
// router.post('/', authMiddleware, async (req, res) => {
//   try {
//     const { branchId, serviceType, appointmentDate, timeSlot } = req.body;
    
//     const appointment = await Appointment.create({
//       userId: req.user.id,
//       branchId,
//       serviceType,
//       appointmentDate,
//       timeSlot,
//       status: 'pending'
//     });

//     res.status(201).json(appointment);
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send('Server Error');
//   }
// });

// // Get user's appointments
// router.get('/my-appointments', authMiddleware, async (req, res) => {
//   try {
//     const appointments = await Appointment.findAll({
//       where: { userId: req.user.id }
//     });
//     res.json(appointments);
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send('Server Error');
//   }
// });

// module.exports = router;


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
router.get('/', async (req, res) => {
  try {
    const appointments = await Appointment.findAll();
    res.json(appointments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;