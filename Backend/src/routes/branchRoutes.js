// const express = require('express');
// const router = express.Router();
// const { getAllBranches } = require('../controllers/branchController');

// router.get('/', getAllBranches);

// module.exports = router;


const express = require('express');
const router = express.Router();
const { getAllBranches, createBranch, getBranchById } = require('../controllers/branchController');

// Get all branches
router.get('/', getAllBranches);

// Create a branch
router.post('/', createBranch);

// Get branch by ID
router.get('/:id', getBranchById);



// --- ADD THESE NEW ROUTES TO backend/src/routes/branchRoutes.js ---

const authMiddleware = require('../middleware/authMiddleware');
const Branch = require('../models/Branch');

// @route   GET /api/branches/my-branch
// @desc    Get the branch managed by the logged-in admin
router.get('/my-branch', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
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
    if (req.user.role !== 'admin') {
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


module.exports = router;