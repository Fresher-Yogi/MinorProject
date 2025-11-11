// --- FINAL, COMPLETE, AND CORRECTED CODE for backend/src/routes/authRoutes.js ---

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const { sendSms, sendEmail } = require('../utils/notificationService'); 

// Utility to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();


// ============================================
// ❌ OLD SIMPLE REGISTRATION (COMMENTED OUT)
// ============================================

/*
// @route   POST /api/auth/register
// @desc    OLD: Register a new NORMAL USER (Simple, no OTP)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password || !phone) {
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
        
        // --- EMAIL NOTIFICATION LOGIC ---
        const subject = "Welcome to QMS! Account Created Successfully";
        const emailBody = '...'; // Simplified body for space
        sendEmail(newUser.email, subject, `Welcome to QMS, ${newUser.name}! Your account is ready.`, emailBody);
        
        // --- SMS LOGIC ---
        sendSms(newUser.phone, `Welcome to QMS, ${newUser.name}! Your account is ready. Check your email for details.`);

        const token = jwt.sign({ user: { id: newUser.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: 'user' } });
    } catch (error) {
        console.error("User Register Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});
*/

// ============================================
// ✅ NEW OTP REGISTRATION (WORKING CODE)
// ============================================

// @route   POST /api/auth/register
// @desc    Step 1: Creates unverified user, saves OTP, and sends email.
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ message: 'Please enter all fields.' });
        }
        
        let user = await User.findOne({ where: { email } });
        if (user && user.isVerified) {
            return res.status(400).json({ message: 'User with this email already exists and is verified.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otpCode = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

        let newUser;
        if (user && !user.isVerified) {
            // Re-use existing unverified user account
            await user.update({
                name, 
                password: hashedPassword, 
                phone, 
                otp: otpCode, 
                otpExpires: otpExpiry, 
                isVerified: false
            });
            newUser = user;
        } else {
            // Create a brand new user
            newUser = await User.create({
                name,
                email,
                password: hashedPassword,
                phone,
                role: 'user',
                status: 'approved',
                otp: otpCode,
                otpExpires: otpExpiry,
                isVerified: false // User is NOT verified yet
            });
        }
        
        // --- EMAIL OTP NOTIFICATION LOGIC ---
        const subject = "QMS: Your Email Verification Code (OTP)";
        const emailBody = `
            <h2>Queue Management System Verification</h2>
            <p>Dear ${newUser.name},</p>
            <p>Your One-Time Password (OTP) for registration is:</p>
            <h1 style="color: #3b82f6; font-size: 24px;">${otpCode}</h1>
            <p>This code will expire in 10 minutes. Please enter it in the app to complete your registration.</p>
        `;

        sendEmail(
            newUser.email, 
            subject, 
            `QMS OTP: ${otpCode} (Expires in 10 minutes)`,
            emailBody
        );
        
        // --- SMS LOGIC (Now Secondary/Mocked) ---
        sendSms(newUser.phone, `QMS OTP: ${otpCode} (Expires in 10 min)`);

        res.status(200).json({ 
            message: 'Registration started. OTP sent to your email. Please verify.',
            email: newUser.email
        });
    } catch (error) {
        console.error("User Register Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   POST /api/auth/verify-otp
// @desc    Step 2: Verify the OTP and finalize registration
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        const user = await User.findOne({ where: { email, isVerified: false } });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found or already verified.' });
        }

        // Check for OTP expiration
        if (new Date() > user.otpExpires) {
            // Reset OTP fields on expiry
            await user.update({ otp: null, otpExpires: null }); 
            return res.status(400).json({ message: 'OTP has expired. Please re-register to receive a new code.' });
        }

        // Check for OTP match
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP provided.' });
        }

        // OTP is valid and not expired: Verify the user
        await user.update({
            isVerified: true,
            otp: null,
            otpExpires: null
        });

        // Generate final JWT token
        const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.status(200).json({ 
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            message: '✅ Registration complete! You are now logged in.'
        });

    } catch (error) {
        console.error("OTP Verification Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// @route   POST /api/auth/login
// @desc    Login User - Now checks for verification status
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        
        // ✅ NEW CHECK: Only verified users can log in
        if (!user.isVerified) {
             return res.status(403).json({ 
                 message: 'Account not verified. Please check your email for the verification code or re-register.' 
             });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        console.error("User Login Error:", error.message);
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

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'admin',
            status: 'pending_approval' // New admins are pending
        });
        
        // --- EMAIL NOTIFICATION for PENDING ADMIN ---
        const subject = "Admin Account Pending Approval";
        const emailBody = `
            <h2>Thank You for Registering, ${newUser.name}!</h2>
            <p>Your Branch Admin account is now in <strong>pending approval</strong> status.</p>
            <p>A Super Admin will review your application shortly. You will receive an email once your account is approved.</p>
        `;
        sendEmail(
            newUser.email, 
            subject, 
            `Admin Account Pending Approval for ${newUser.email}`, 
            emailBody
        );
        // --- END EMAIL NOTIFICATION ---

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
        
        // Store old status before updating
        const oldStatus = admin.status; 
        admin.status = status;
        await admin.save();
        
        // --- EMAIL NOTIFICATION for ADMIN STATUS CHANGE ---
        if (status !== oldStatus) {
            const subject = `Admin Account ${status.toUpperCase()}`;
            const emailBody = `
                <h2>Your Account Status Has Been Updated</h2>
                <p>Dear ${admin.name},</p>
                <p>Your Branch Admin registration has been <strong>${status.toUpperCase()}</strong> by a Super Admin.</p>
                ${status === 'approved' 
                    ? `<p>You can now log into the <a href="http://localhost:5000/Admin/adminaccess.html">Admin Portal</a> to manage your branch.</p>` 
                    : `<p>Please contact the Super Admin for more information on the rejection.</p>`
                }
            `;
            sendEmail(
                admin.email, 
                subject, 
                `Account Status: ${status.toUpperCase()}`, 
                emailBody
            );
        }
        // --- END EMAIL NOTIFICATION ---

        res.json({ message: `Admin ${admin.name} has been successfully ${status}.` });
    } catch (error) {
        console.error("Update Admin Status Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;