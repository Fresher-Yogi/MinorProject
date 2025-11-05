const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password for security
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with HASHED password
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,  // Storing HASHED password
      phone
    });

    // Create JWT token
    const token = jwt.sign(
      { user: { id: newUser.id } },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send success response
    res.status(201).json({ 
      message: 'User registered successfully!',
      token,
      user: { 
        id: newUser.id, 
        name: newUser.name, 
        email: newUser.email 
      }
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// // @route   POST /api/auth/login
// // @desc    Login user and return token
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Validate input
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Please enter email and password' });
//     }

//     // Find user by email
//     const user = await User.findOne({ where: { email } });
    
//     // Check if user exists
//     if (!user) {
//       // Don't say "user not found" for security.
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     // ✅✅✅ THIS IS THE FIX ✅✅✅
//     // Correctly compare the plain-text password with the hashed password from the database
//     const isMatch = await bcrypt.compare(password, user.password);
    
//     // If passwords DO NOT match, send a 400 error and STOP execution.
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }
//     // ✅✅✅ END OF FIX ✅✅✅


//     // If code reaches here, it means the password was correct.
//     // Create JWT token for the authenticated user.
//     const token = jwt.sign(
//       { user: { id: user.id } },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     // User is authenticated! Return token and user info.
//     res.json({ 
//       message: 'Login successful!',
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       }
//     });

//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });


// --- PASTE THIS CODE IN: backend/src/routes/authRoutes.js ---

// @route   POST /api/auth/admin-login
// @desc    Login for admin users
router.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter all fields' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // --- Role Check ---
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Access Denied: You are not an admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { user: { id: user.id, role: user.role } },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Admin login successful!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});



module.exports = router;