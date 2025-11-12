// Backend/src/routes/branchRoutes.js - COMPLETE FIXED VERSION

const express = require('express');
const router = express.Router();
const { 
    getAllBranches, 
    createBranch, 
    getBranchById, 
    getAvailableSlots,
    linkServicesToBranch, // <-- NEW IMPORT
    getBranchesForService // <-- NEW IMPORT
} = require('../controllers/branchController');
const authMiddleware = require('../middleware/authMiddleware');
const Branch = require('../models/Branch');
const User = require('../models/user');
const Service = require('../models/Service');

// Middleware to check for Super Admin role
const isSuperAdmin = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user && user.role === 'superadmin') {
            return next();
        }
        res.status(403).json({ message: 'Access Denied: Super Admin role required.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


// Public route: Get all branches
router.get('/', getAllBranches);

// Super Admin Only: Create a new branch
router.post('/', authMiddleware, isSuperAdmin, createBranch);

// Super Admin Only: Update a branch
router.put('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
    try {
        const { name, location, adminId } = req.body;
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found.' });
        }
        
        branch.name = name || branch.name;
        branch.location = location || branch.location;
        branch.adminId = adminId ? parseInt(adminId, 10) : null;
        
        await branch.save();
        res.json({ message: 'Branch updated successfully!', branch });
    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// Super Admin Only: Delete a branch
router.delete('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
    try {
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found.' });
        }
        await branch.destroy();
        res.json({ message: 'Branch deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// ===============================================
// ✅ NEW ROUTES FOR SERVICE LINKING
// ===============================================

// @route   POST /api/branches/:branchId/services
// @desc    Super Admin: Link an array of Service IDs to a Branch
router.post('/:branchId/services', authMiddleware, isSuperAdmin, linkServicesToBranch);


// @route   GET /api/branches/:branchId/services
// @desc    Get all services offered by a specific branch
router.get('/:branchId/services', async (req, res) => {
    try {
        const branch = await Branch.findByPk(req.params.branchId, {
            include: { model: Service, through: { attributes: [] } } 
        });
        
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }
        
        res.json(branch.Services || []); 
    } catch (error) {
        console.error("Error fetching branch services:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ✅ NEW EFFICIENT PUBLIC ROUTE
// @route   GET /api/branches/for-service/:serviceId
// @desc    Get all branches that offer a specific service
router.get('/for-service/:serviceId', getBranchesForService);


// ===============================================
// EXISTING ADMIN ROUTES (No Change)
// ===============================================

// Admin's "My Branch" route
router.get('/my-branch', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied. Only Branch Admins can access this.' });
        }

        const branch = await Branch.findOne({ 
            where: { adminId: parseInt(user.id, 10) },
            include: Service
        });

        if (!branch) {
            return res.status(404).json({ 
                message: 'You are not assigned to any branch. Please contact a Super Admin.' 
            });
        }

        res.json(branch);
    } catch (error) {
        console.error('Error fetching admin branch:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// Admin Only: Update their own branch settings
router.put('/my-branch', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied.' });
        }

        const branch = await Branch.findOne({ 
            where: { adminId: parseInt(user.id, 10) } 
        });

        if (!branch) {
            return res.status(404).json({ message: 'You are not assigned to a branch.' });
        }

        const { openingTime, closingTime, slotDuration } = req.body;
        
        if (openingTime) branch.openingTime = openingTime;
        if (closingTime) branch.closingTime = closingTime;
        if (slotDuration) branch.slotDuration = parseInt(slotDuration, 10);

        await branch.save();
        res.json({ message: 'Branch settings updated successfully!', branch });
    } catch (error) {
        console.error('Error updating branch settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Public routes
router.get('/:id', getBranchById);
router.get('/:id/available-slots', getAvailableSlots);

module.exports = router;