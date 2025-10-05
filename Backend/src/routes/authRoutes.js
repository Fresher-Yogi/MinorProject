const express = require('express');
const router = express.Router();
const User = require('../models/user'); // 1. User model ko import karo

// @route   POST api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    // 2. Frontend se aa raha data nikalo (name, email, password)
    const { name, email, password } = req.body;

    // Check if data is missing
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }
    
    // 3. Check karo ki is email se user pehle se to nahi hai
    let user = await User.findOne({ where: { email: email } });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // 4. Naya user database mein banao aur save karo
    const newUser = await User.create({
      name,
      email,
      password // Note: In a real app, you must hash this password! We'll do that later.
    });

    // 5. Frontend ko success message bhejo
    res.status(201).json({ message: 'User registered successfully!', userId: newUser.id });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;