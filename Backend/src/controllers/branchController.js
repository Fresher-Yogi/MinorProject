// Backend/src/controllers/branchController.js - UPDATED
const Branch = require('../models/Branch');
const Service = require('../models/Service'); // <-- NEW IMPORT
const Appointment = require('../models/Appointment');
const { Op } = require('sequelize');


// ✅ NEW FUNCTION: Link an array of Service IDs to a specific Branch
exports.linkServicesToBranch = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { serviceIds } = req.body; // serviceIds should be an array of IDs: [1, 5, 8]

        const branch = await Branch.findByPk(branchId);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        if (!Array.isArray(serviceIds)) {
            return res.status(400).json({ message: 'serviceIds must be an array.' });
        }
        
        if (serviceIds.length === 0) {
            // An empty array means clearing all services for this branch
            await branch.setServices([]); 
            return res.json({ message: 'All services successfully unlinked from branch.' });
        }
        
        // Find all Service models based on the provided IDs
        const services = await Service.findAll({ where: { id: serviceIds } });

        // Use Sequelize's built-in setter method for the Many-to-Many relationship
        // This clears any old links and sets the new ones in the BranchServices table
        await branch.setServices(services); 

        res.json({ message: 'Services successfully linked to branch.', branchId: branch.id, linkedServices: services.length });
    } catch (error) {
        console.error("Error linking services:", error.message);
        res.status(500).json({ message: 'Server Error while linking services.' });
    }
};


// ✅ UPDATED: Get all branches with optional category filter
exports.getAllBranches = async (req, res) => {
  try {
    const { category } = req.query; // Get category from query params
    
    let whereClause = {};
    if (category) {
      whereClause.category = category;
    }
    
    const branches = await Branch.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    res.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a new branch (Super Admin only)
exports.createBranch = async (req, res) => {
  try {
    const { name, location, category } = req.body; // ✅ Added category
    
    if (!name || !location) {
      return res.status(400).json({ message: 'Please provide name and location' });
    }
    
    const branch = await Branch.create({ 
      name, 
      location, 
      category: category || 'General' // ✅ Include category
    });
    
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