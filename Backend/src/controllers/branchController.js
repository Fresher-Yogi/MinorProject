const Branch = require('../models/Branch');
const Appointment = require('../models/Appointment');
const { Op } = require('sequelize');

// --- ✅ CORRECT ---
// Get all branches (Public)
exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll();
    res.json(branches);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- ✅ CORRECT ---
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

// --- ✅ CORRECT ---
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


// --- ✅ THIS IS THE CORRECT AND ROBUST FUNCTION FOR SLOTS ---
// Get available time slots for a specific branch and date.
// The logic here is sound and works correctly once it receives valid branch data.
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
        appointmentDate: date,
        status: { [Op.ne]: 'cancelled' } // Exclude cancelled appointments
      }
    });
    const bookedSlots = new Set(existingAppointments.map(apt => apt.timeSlot));

    // --- 2. Generate all possible slots based on branch settings (WITH DEFAULTS) ---
    // This correctly uses default values if the branch settings are null in the DB.
    // The main issue was that the Branch Admin couldn't *save* new settings.
    const openingTime = branch.openingTime || '09:00:00';
    const closingTime = branch.closingTime || '17:00:00';
    const slotDuration = branch.slotDuration || 15;
    
    const allSlots = [];
    
    // Helper function to convert HH:MM:SS to minutes from midnight
    const timeToMinutes = (time) => {
      if (typeof time !== 'string') return 0;
      const [hours, minutes] = time.split(':').map(Number);
      return (hours * 60) + minutes;
    };
    
    const openingMinutes = timeToMinutes(openingTime);
    const closingMinutes = timeToMinutes(closingTime);

    // This loop correctly generates all slots for the day
    for (let minutes = openingMinutes; minutes < closingMinutes; minutes += slotDuration) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      
      const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      allSlots.push(formattedTime);
    }
    
    // --- 3. Filter out booked slots to find available ones ---
    const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot));

    res.json({
        availableSlots
    });

  } catch (error) {
    console.error("Error in getAvailableSlots:", error.message);
    res.status(500).json({ message: 'Server Error while fetching slots.' });
  }
};