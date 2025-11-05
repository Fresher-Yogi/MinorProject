const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');

// @route   GET /api/users/me
// @desc    Get current logged-in user's profile
// @access  Private (Requires token)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Find user by Primary Key (ID) from the token, but exclude the password field
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
// @desc    Get all users (for admin purposes)
// @access  Public (Temporary - should be admin-only)
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});


// ✅✅✅ START: NEW CODE TO ADD ✅✅✅
// @route   PUT /api/users/me
// @desc    Update current user's profile
// @access  Private (Requires token)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    // Get the new details from the request body
    const { name, phone } = req.body;

    // Find the user by their ID (from the token)
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user's details
    // If a new name is provided, update it. Otherwise, keep the old name.
    user.name = name || user.name;
    user.phone = phone; // We allow setting phone to empty string

    // Save the changes to the database
    await user.save();

    // Send a success response with the updated user info
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
// ✅✅✅ END: NEW CODE TO ADD ✅✅✅


module.exports = router;