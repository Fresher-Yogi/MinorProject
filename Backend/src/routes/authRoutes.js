// --- FINAL, COMPLETE, AND CORRECTED CODE for backend/src/routes/authRoutes.js ---

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================
// ✅ USER ROUTES
// ============================================

// @route   POST /api/auth/register
// @desc    Register a new NORMAL USER
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please enter all fields.' });
        }
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user', // Explicitly set role to 'user'
            status: 'approved' // Normal users are always approved
        });
        
        const token = jwt.sign({ user: { id: newUser.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ 
            token, 
            user: { id: newUser.id, name: newUser.name, email: newUser.email, role: 'user' } 
        });
    } catch (error) {
        console.error("User Register Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});
// @route   POST /api/auth/register
// @desc    Register a new NORMAL USER
router.post('/register', async (req, res) => {
    try {
        // --- DEBUGGING: Let's see what the frontend is sending us ---
        console.log('--- /register endpoint has been hit ---');
        console.log('Request Body Received:', req.body);
        // ---------------------------------------------------------

        const { name, email, password, phone } = req.body;
        
        if (!name || !email || !password || !phone) {
            console.log('Validation failed: A required field is missing.'); // <-- DEBUGGING LINE
            return res.status(400).json({ message: 'Please enter all fields, including phone number.' });
        }
        
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'user',
            status: 'approved'
        });
        
        console.log('User was created successfully in the database.'); // <-- DEBUGGING LINE
        console.log(`Now attempting to send SMS to phone number: ${newUser.phone}`); // <-- DEBUGGING LINE

        // Send the welcome SMS
        sendSms(newUser.phone, `Welcome to the Queue Management System, ${newUser.name}!`);

        const token = jwt.sign({ user: { id: newUser.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ 
            token, 
            user: { id: newUser.id, name: newUser.name, email: newUser.email, role: 'user' } 
        });
    } catch (error) {
        console.error("User Register Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// ============================================
// ✅ ADMIN & SUPER ADMIN ROUTES
// ============================================

// @route   POST /api/auth/admin-register
// @desc    Register a new ADMIN (for Super Admin approval)
router.post('/admin-register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'admin',
            status: 'pending_approval' // New admins are pending
        });
        res.status(201).json({ message: 'Admin registration successful! Your account is pending approval.' });
    } catch (error) {
        console.error("Admin Register Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/auth/admin-login
// @desc    Login for ADMIN and SUPERADMIN users
router.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return res.status(400).json({ message: 'Invalid credentials or not an admin account.' });
        }
        
        if (user.role === 'admin' && user.status !== 'approved') {
            return res.status(403).json({ message: `Your account status is: ${user.status}. You cannot log in.` });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign({ user: { id: user.id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ 
            message: 'Login successful!', 
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        console.error("Admin Login Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// ============================================
// ✅ SUPER ADMIN ONLY ROUTES
// ============================================

// @route   GET /api/auth/admins/pending
// @desc    Get all admins pending approval
router.get('/admins/pending', authMiddleware, async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access Denied. Only Super Admins can perform this action.' });
    }
    try {
        const pendingAdmins = await User.findAll({ where: { role: 'admin', status: 'pending_approval' } });
        res.json(pendingAdmins);
    } catch (error) {
        console.error("Get Pending Admins Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/auth/admins/:id/status
// @desc    Update an admin's status (Approve/Reject)
router.put('/admins/:id/status', authMiddleware, async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access Denied. Only Super Admins can perform this action.' });
    }
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }
        const admin = await User.findByPk(req.params.id);
        if (!admin || admin.role !== 'admin') {
            return res.status(404).json({ message: 'Admin user not found.' });
        }
        admin.status = status;
        await admin.save();
        res.json({ message: `Admin ${admin.name} has been successfully ${status}.` });
    } catch (error) {
        console.error("Update Admin Status Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;