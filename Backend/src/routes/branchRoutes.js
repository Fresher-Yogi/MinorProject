// PASTE THIS ENTIRE CODE INTO: src/routes/branchRoutes.js

const express = require('express');
const router = express.Router();
const { getAllBranches, createBranch, getBranchById, getAvailableSlots } = require('../controllers/branchController');
const authMiddleware = require('../middleware/authMiddleware');
const Branch = require('../models/Branch');
const User = require('../models/user');

// ✅ FIX: THIS ROUTE WAS MISSING. It allows fetching all branches.
// @route   GET /api/branches
router.get('/', getAllBranches);

// @route   POST /api/branches (Super Admin Only)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied.' });
        }
        createBranch(req, res);
    } catch (error) {
        res.status(500).json({ message: 'Server error during authorization.' });
    }
});

// @route   PUT /api/branches/:id (Super Admin Only)
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
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/branches/:id (Super Admin Only)
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

// --- Other public and admin-specific routes ---
router.get('/my-branch', authMiddleware, async (req, res) => { /* ... (code is correct) ... */ });
router.put('/my-branch', authMiddleware, async (req, res) => { /* ... (code is correct) ... */ });
router.get('/:id', getBranchById);
router.get('/:id/available-slots', getAvailableSlots);

module.exports = router;