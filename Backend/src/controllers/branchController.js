// Backend/src/controllers/branchController.js - FULLY UPDATED AND CORRECTED

const Branch = require('../models/Branch');
const Service = require('../models/Service');
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

// ✅ NEW EFFICIENT FUNCTION for the frontend performance fix
// GET /api/branches/for-service/:serviceId
exports.getBranchesForService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findByPk(serviceId, {
            include: [{
                model: Branch,
                through: { attributes: [] } 
            }]
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json(service.Branches || []);

    } catch (error) {
        console.error("Error fetching branches for service:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};


// Get all branches with optional category filter
exports.getAllBranches = async (req, res) => {
  try {
    const { category } = req.query;
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
    const { name, location, category } = req.body;
    if (!name || !location) {
      return res.status(400).json({ message: 'Please provide name and location' });
    }
    const branch = await Branch.create({ 
      name, 
      location, 
      category: category || 'General'
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
    const { date } = req.query; // date is a string like "2025-11-12"

    if (!date) {
      return res.status(400).json({ message: 'A date query parameter is required.' });
    }

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
    }

    // Step 1: Get all appointments that are already booked for that day
    const existingAppointments = await Appointment.findAll({
      where: {
        branchId: id,
        appointmentDate: date,
        status: { [Op.ne]: 'cancelled' } // Don't count cancelled appointments
      }
    });
    const bookedSlots = new Set(existingAppointments.map(apt => apt.timeSlot));

    // Step 2: Generate all possible time slots for the branch's working hours
    const openingTime = branch.openingTime || '09:00:00';
    const closingTime = branch.closingTime || '17:00:00';
    const slotDuration = branch.slotDuration || 15;
    
    const allSlots = [];
    
    // Helper function to convert "HH:MM" string to total minutes from midnight
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
    
    // ✅ NEW LOGIC STARTS HERE
    // Step 3: Check if the requested date is today. If so, get the current time.
    const todaysDateString = new Date().toISOString().split('T')[0];
    const isToday = (date === todaysDateString);
    let currentMinutes = 0;

    if (isToday) {
        const now = new Date();
        // Adjust for timezone if your server is in a different timezone than your users
        // For simplicity, this uses the server's local time.
        currentMinutes = now.getHours() * 60 + now.getMinutes();
    }
    // ✅ NEW LOGIC ENDS HERE

    // Step 4: Filter the slots. Remove booked slots AND, if it's today, remove past slots.
    const availableSlots = allSlots.filter(slot => {
        // Condition 1: The slot must NOT be in the set of already booked slots.
        const isAlreadyBooked = bookedSlots.has(slot);
        if (isAlreadyBooked) {
            return false;
        }

        // ✅ NEW LOGIC STARTS HERE
        // Condition 2: If the request is for today, the slot's time must be in the future.
        if (isToday) {
            const slotMinutes = timeToMinutes(slot);
            // The slot is only available if its start time is greater than or equal to the current time.
            return slotMinutes >= currentMinutes;
        }
        // ✅ NEW LOGIC ENDS HERE

        // If it's a future date, and the slot is not booked, it is available.
        return true;
    });

    res.json({ availableSlots });

  } catch (error) {
    console.error("Error in getAvailableSlots:", error.message);
    res.status(500).json({ message: 'Server Error while fetching slots.' });
  }
};