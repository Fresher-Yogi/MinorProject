// --- FINAL, UPDATED CODE for backend/src/routes/branchRoutes.js ---

const express = require('express');
const router = express.Router();
// ✅ Import the new controller function
const { getAllBranches, createBranch, getBranchById, getAvailableSlots } = require('../controllers/branchController');
const authMiddleware = require('../middleware/authMiddleware');
const Branch = require('../models/Branch');
const User = require('../models/user');

// @route   GET /api/branches
// @desc    Get all branches (Public)
router.get('/', getAllBranches);

// @route   GET /api/branches/:id
// @desc    Get a single branch by its ID (Public)
router.get('/:id', getBranchById);

// --- ✅ NEW ROUTE ADDED for dynamic time slots ---
// @route   GET /api/branches/:id/available-slots
// @desc    Get available appointment slots for a branch on a specific date
router.get('/:id/available-slots', getAvailableSlots);
// --- ✅ END OF NEW ROUTE ---


// @route   POST /api/branches
// @desc    Create a new branch (Super Admin Only)
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

// @route   GET /api/branches/my-branch
// @desc    Get the branch managed by the logged-in admin
router.get('/my-branch', authMiddleware, async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Access Denied.' });
    }
    try {
        const branch = await Branch.findOne({ where: { adminId: req.user.id } });
        if (!branch) {
            return res.status(404).json({ message: 'You are not assigned to any branch.' });
        }
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/branches/my-branch
// @desc    Update the branch settings for the logged-in admin
router.put('/my-branch', authMiddleware, async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Access Denied.' });
    }
    try {
        const { openingTime, closingTime, slotDuration } = req.body;
        const branch = await Branch.findOne({ where: { adminId: req.user.id } });
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found.' });
        }

        branch.openingTime = openingTime || branch.openingTime;
        branch.closingTime = closingTime || branch.closingTime;
        branch.slotDuration = slotDuration || branch.slotDuration;

        await branch.save();
        res.json({ message: 'Branch settings updated successfully!', branch });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   PUT /api/branches/:id
// @desc    Update a branch's details and assign an admin (Super Admin Only)
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

        branch.name = name || branch.name;
        branch.location = location || branch.location;
        branch.adminId = adminId ? parseInt(adminId) : null;

        await branch.save();
        res.json({ message: 'Branch updated successfully!', branch });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   DELETE /api/branches/:id
// @desc    Delete a branch (Super Admin Only)
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

module.exports = router;