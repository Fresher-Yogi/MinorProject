// --- FINAL, UPDATED CODE for backend/src/routes/userRoutes.js ---

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');
// ✅ NEW: Import bcrypt for password comparison and hashing
const bcrypt = require('bcryptjs');

// @route   GET /api/users/me
// @desc    Get current logged-in user's profile
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

// @route   GET /api/users
// @desc    Get all users (for Super Admin purposes)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const requester = await User.findByPk(req.user.id);
    if (!requester || requester.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access Denied. This resource is for Super Admins only.' });
    }
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
            id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role
        }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/users/admins
// @desc    Get all approved admin users (for Super Admin)
router.get('/admins', authMiddleware, async (req, res) => {
    try {
        const requester = await User.findByPk(req.user.id);
        if (!requester || requester.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied. Only Super Admins can view this.' });
        }
        const admins = await User.findAll({
            where: { role: 'admin', status: 'approved' },
            attributes: ['id', 'name', 'email']
        });
        res.json(admins);
    } catch (error) {
        console.error("Error fetching admins:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- ✅ NEW ROUTE ADDED for Changing Password ---
// @route   PUT /api/users/me/change-password
// @desc    Update current user's password
// @access  Private
router.put('/me/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. Find the user, including their password hash
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Validate the current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    // 3. Validate the new password
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    // 4. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // 5. Save the new password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully!' });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});
// --- ✅ END OF NEW ROUTE ---

module.exports = router;