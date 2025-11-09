// PASTE THIS ENTIRE CODE INTO: src/controllers/branchController.js

const Branch = require('../models/Branch');
const Appointment = require('../models/Appointment');
const { Op } = require('sequelize');

// --- ✅ THIS IS THE NEW FUNCTION THAT WAS MISSING ---
// Get all branches (Public)
exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll({
        order: [['name', 'ASC']] // Sort branches alphabetically
    });
    res.json(branches);
  } catch (error) {
    console.error("Error fetching all branches:", error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- (The rest of the functions are for future use, but are correct) ---

// Create a new branch (This is called by the Super Admin route)
exports.createBranch = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name || !location) {
      return res.status(400).json({ message: 'Please provide name and location' });
    }
    const branch = await Branch.create({ name, location });
    res.status(201).json({ message: 'Branch created successfully', branch });
  } catch (error) {
    console.error("Error creating branch:", error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get branch by ID (Public)
exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    res.json(branch);
  } catch (error) {
    console.error("Error fetching branch by ID:", error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get available time slots for a specific branch and date.
exports.getAvailableSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'A date query parameter is required.' });
    }

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
    }

    const existingAppointments = await Appointment.findAll({
      where: {
        branchId: id,
        appointmentDate: date,
        status: { [Op.ne]: 'cancelled' }
      }
    });
    const bookedSlots = new Set(existingAppointments.map(apt => apt.timeSlot));

    const openingTime = branch.openingTime || '09:00:00';
    const closingTime = branch.closingTime || '17:00:00';
    const slotDuration = branch.slotDuration || 15;
    
    const allSlots = [];
    
    const timeToMinutes = (time) => {
      if (typeof time !== 'string') return 0;
      const [hours, minutes] = time.split(':').map(Number);
      return (hours * 60) + minutes;
    };
    
    const openingMinutes = timeToMinutes(openingTime);
    const closingMinutes = timeToMinutes(closingTime);

    for (let minutes = openingMinutes; minutes < closingMinutes; minutes += slotDuration) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      allSlots.push(formattedTime);
    }
    
    const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot));
    res.json({ availableSlots });

  } catch (error) {
    console.error("Error in getAvailableSlots:", error.message);
    res.status(500).json({ message: 'Server Error while fetching slots.' });
  }
};