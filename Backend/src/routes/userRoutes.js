// --- FINAL, UPDATED CODE for backend/src/routes/userRoutes.js ---

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');

// @route   GET /api/users/me
// @desc    Get current logged-in user's profile
// @access  Private (Requires token)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- 🛑 MODIFIED ROUTE: Now requires Super Admin access ---
// @route   GET /api/users
// @desc    Get all users (for Super Admin purposes)
// @access  Private (Super Admin Only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Check if the user making the request is a Super Admin
    const requester = await User.findByPk(req.user.id);
    if (!requester || requester.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access Denied. This resource is for Super Admins only.' });
    }

    // If authorized, fetch all users
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});


// @route   PUT /api/users/me
// @desc    Update current user's profile
// @access  Private (Requires token)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone;

    await user.save();

    res.json({
        message: 'Profile updated successfully!',
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        }
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/users/admins
// @desc    Get all approved admin users (for Super Admin)
// @access  Private (Super Admin Only)
router.get('/admins', authMiddleware, async (req, res) => {
    try {
        const requester = await User.findByPk(req.user.id);
        if (!requester || requester.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied. Only Super Admins can view this.' });
        }
        const admins = await User.findAll({
            where: {
                role: 'admin',
                status: 'approved'
            },
            attributes: ['id', 'name', 'email']
        });
        res.json(admins);
    } catch (error) {
        console.error("Error fetching admins:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;