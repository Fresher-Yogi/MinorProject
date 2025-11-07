const Branch = require('../models/Branch');
// ✅ NEW: Import Appointment model to check for booked slots
const Appointment = require('../models/Appointment');
const { Op } = require('sequelize');

// Get all branches (No Change)
exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll();
    res.json(branches);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a new branch (No Change)
exports.createBranch = async (req, res) => {
  try {
    const { name, location } = req.body;
    
    if (!name || !location) {
      return res.status(400).json({ message: 'Please provide name and location' });
    }
    
    const branch = await Branch.create({ name, location });
    res.status(201).json({ 
      message: 'Branch created successfully',
      branch 
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get branch by ID (No Change)
exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    
    res.json(branch);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};


// --- ✅ NEW FUNCTION ADDED ---
// Get available time slots for a specific branch and date
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

    // --- 1. Fetch existing appointments for that day ---
    const existingAppointments = await Appointment.findAll({
      where: {
        branchId: id,
        appointmentDate: date
      }
    });
    const bookedSlots = new Set(existingAppointments.map(apt => apt.timeSlot));

    // --- 2. Generate all possible slots based on branch settings ---
    const { openingTime, closingTime, slotDuration } = branch;
    const allSlots = [];
    
    // Helper function to convert HH:MM:SS to minutes from midnight
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const openingMinutes = timeToMinutes(openingTime);
    const closingMinutes = timeToMinutes(closingTime);

    for (let minutes = openingMinutes; minutes < closingMinutes; minutes += slotDuration) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      
      // Format to HH:MM
      const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      allSlots.push(formattedTime);
    }
    
    // --- 3. Filter out booked slots to find available ones ---
    const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot));

    res.json({
        availableSlots,
        bookedSlots: Array.from(bookedSlots) // Return booked slots for potential UI use
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
// --- ✅ END OF NEW FUNCTION ---