// Backend/src/routes/branchRoutes.js - COMPLETE FIXED VERSION

const express = require('express');
const router = express.Router();
const { getAllBranches, createBranch, getBranchById, getAvailableSlots } = require('../controllers/branchController');
const authMiddleware = require('../middleware/authMiddleware');
const Branch = require('../models/Branch');
const User = require('../models/user');

// Public route: Get all branches
router.get('/', getAllBranches);

// Super Admin Only: Create a new branch
router.post('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied. Only Super Admins can create branches.' });
        }
        createBranch(req, res);
    } catch (error) {
        res.status(500).json({ message: 'Server error during authorization.' });
    }
});

// Super Admin Only: Update a branch
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied.' });
        }
        const { name, location, adminId } = req.body;
        const branch = await Branch.findByPk(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found.' });
        }
        
        // ✅ FIX: Ensure adminId is properly converted to integer or null
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
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied.' });
        }
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

// ✅ CRITICAL FIX: Admin's "My Branch" route
router.get('/my-branch', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied. Only Branch Admins can access this.' });
        }

        // ✅ FIX: Use parseInt to ensure proper comparison
        const branch = await Branch.findOne({ 
            where: { adminId: parseInt(user.id, 10) } 
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