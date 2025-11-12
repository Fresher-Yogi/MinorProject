// --- FINAL, COMPLETE, AND UPDATED CODE for backend/src/routes/authRoutes.js ---

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const { sendSms, sendEmail } = require('../utils/notificationService'); 

// Utility to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Utility to generate a secure reset token
const generateResetToken = () => crypto.randomBytes(32).toString('hex');

// ============================================
// ✅ USER REGISTRATION & LOGIN (No Changes)
// ============================================

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password || !phone) return res.status(400).json({ message: 'Please enter all fields.' });
        let user = await User.findOne({ where: { email } });
        if (user && user.isVerified) return res.status(400).json({ message: 'User with this email already exists and is verified.' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otpCode = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        if (user && !user.isVerified) {
            await user.update({ name, password: hashedPassword, phone, otp: otpCode, otpExpires: otpExpiry, isVerified: false });
        } else {
            user = await User.create({ name, email, password: hashedPassword, phone, role: 'user', status: 'approved', otp: otpCode, otpExpires: otpExpiry, isVerified: false });
        }
        const subject = "QMS: Your Email Verification Code (OTP)";
        const emailBody = `<h2>Verification</h2><p>Your OTP for registration is: <h1>${otpCode}</h1></p>`;
        sendEmail(user.email, subject, `QMS OTP: ${otpCode}`, emailBody);
        res.status(200).json({ message: 'Registration started. OTP sent to your email.', email: user.email });
    } catch (error) {
        console.error("User Register Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ where: { email, isVerified: false } });
        if (!user) return res.status(404).json({ message: 'User not found or already verified.' });
        if (new Date() > user.otpExpires) {
            await user.update({ otp: null, otpExpires: null });
            return res.status(400).json({ message: 'OTP has expired. Please re-register.' });
        }
        if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP provided.' });
        await user.update({ isVerified: true, otp: null, otpExpires: null });
        const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, message: '✅ Registration complete!' });
    } catch (error) {
        console.error("OTP Verification Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' });
        if (!user.isVerified) return res.status(403).json({ message: 'Account not verified. Please check your email for the OTP.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error("User Login Error:", error.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


// ========================================================
// ✅ UNIFIED FORGOT PASSWORD ROUTE (HANDLES ALL ROLES)
// ========================================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            // Security measure: Don't reveal if a user exists or not.
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }
        
        const resetToken = generateResetToken();
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes
        await user.save();

        let resetUrl, subject, emailBody;
        const frontendBaseUrl = 'http://127.0.0.1:5500/Frontend'; // CHANGE THIS if your frontend runs on a different port

        // --- Logic to create the correct link based on user role ---
        if (user.role === 'superadmin') {
            resetUrl = `${frontendBaseUrl}/SuperAdmin/reset-password.html?token=${resetToken}`;
            subject = "⚠️ QMS: Super Admin Password Reset";
            emailBody = `<p>A critical password reset was requested for your SUPER ADMIN account. Click here to reset: <a href="${resetUrl}">Reset Super Admin Password</a>. This link is valid for 15 minutes.</p>`;
        } else if (user.role === 'admin') {
            resetUrl = `${frontendBaseUrl}/Admin/reset-password.html?token=${resetToken}`;
            subject = "QMS: Admin Password Reset";
            emailBody = `<p>A password reset was requested for your Admin account. Click here to reset: <a href="${resetUrl}">Reset Admin Password</a>. This link is valid for 15 minutes.</p>`;
        } else { // 'user' role
            resetUrl = `${frontendBaseUrl}/User/reset-password.html?token=${resetToken}`;
            subject = "QMS: Password Reset Request";
            emailBody = `<p>You requested a password reset. Click here to reset your password: <a href="${resetUrl}">Reset Password</a>. This link is valid for 15 minutes.</p>`;
        }
        
        await sendEmail(user.email, subject, `Your password reset link: ${resetUrl}`, emailBody);
        
        res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error("Forgot Password Error:", error.message);
        res.status(500).json({ message: 'Server Error during password reset request.' });
    }
});


// ========================================================
// ✅ ROLE-SPECIFIC PASSWORD RESET HANDLERS
// ========================================================

// Helper function to handle the actual password update
const handlePasswordReset = async (role, req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.'});
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            where: {
                role: role,
                passwordResetToken: hashedToken,
                passwordResetExpires: { [require('sequelize').Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();
        
        res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
    } catch (error) {
        console.error(`Reset Password Error for ${role}:`, error.message);
        res.status(500).json({ message: `Server error during ${role} password reset.` });
    }
};

// @route   POST /api/auth/reset-password (for Users)
router.post('/reset-password', (req, res) => handlePasswordReset('user', req, res));

// @route   POST /api/auth/admin-reset-password (for Admins)
router.post('/admin-reset-password', (req, res) => handlePasswordReset('admin', req, res));

// @route   POST /api/auth/superadmin-reset-password (for Super Admins)
router.post('/superadmin-reset-password', (req, res) => handlePasswordReset('superadmin', req, res));


// ============================================
// ADMIN & SUPER ADMIN MANAGEMENT (No Changes)
// ============================================

// @route   POST /api/auth/admin-register
router.post('/admin-register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required.' });
        let user = await User.findOne({ where: { email } });
        if (user) return res.status(400).json({ message: 'An account with this email already exists.' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await User.create({ name, email, password: hashedPassword, role: 'admin', status: 'pending_approval' });
        res.status(201).json({ message: 'Admin registration successful! Your account is pending approval.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return res.status(400).json({ message: 'Invalid credentials or not an admin account.' });
        }
        if (user.role === 'admin' && user.status !== 'approved') {
            return res.status(403).json({ message: `Your account status is: ${user.status}.` });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ user: { id: user.id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Login successful!', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/auth/admins/pending
router.get('/admins/pending', authMiddleware, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Access Denied.' });
    try {
        const pendingAdmins = await User.findAll({ where: { role: 'admin', status: 'pending_approval' } });
        res.json(pendingAdmins);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/auth/admins/:id/status
router.put('/admins/:id/status', authMiddleware, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Access Denied.' });
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
        const admin = await User.findByPk(req.params.id);
        if (!admin || admin.role !== 'admin') return res.status(404).json({ message: 'Admin user not found.' });
        admin.status = status;
        await admin.save();
        res.json({ message: `Admin ${admin.name} has been ${status}.` });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;










// // --- FINAL, COMPLETE CODE for backend/src/routes/authRoutes.js WITH PASSWORD RESET ---

// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
// const User = require('../models/user');
// const authMiddleware = require('../middleware/authMiddleware');
// const { sendSms, sendEmail } = require('../utils/notificationService'); 

// // Utility to generate a 6-digit OTP
// const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// // Utility to generate a secure reset token
// const generateResetToken = () => crypto.randomBytes(32).toString('hex');

// // ============================================
// // ✅ USER REGISTRATION WITH OTP
// // ============================================

// // @route   POST /api/auth/register
// // @desc    Step 1: Creates unverified user, saves OTP, and sends email.
// router.post('/register', async (req, res) => {
//     try {
//         const { name, email, password, phone } = req.body;
        
//         if (!name || !email || !password || !phone) {
//             return res.status(400).json({ message: 'Please enter all fields.' });
//         }
        
//         let user = await User.findOne({ where: { email } });
//         if (user && user.isVerified) {
//             return res.status(400).json({ message: 'User with this email already exists and is verified.' });
//         }
        
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);
//         const otpCode = generateOTP();
//         const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

//         let newUser;
//         if (user && !user.isVerified) {
//             await user.update({
//                 name, 
//                 password: hashedPassword, 
//                 phone, 
//                 otp: otpCode, 
//                 otpExpires: otpExpiry, 
//                 isVerified: false
//             });
//             newUser = user;
//         } else {
//             newUser = await User.create({
//                 name,
//                 email,
//                 password: hashedPassword,
//                 phone,
//                 role: 'user',
//                 status: 'approved',
//                 otp: otpCode,
//                 otpExpires: otpExpiry,
//                 isVerified: false
//             });
//         }
        
//         const subject = "QMS: Your Email Verification Code (OTP)";
//         const emailBody = `
//             <h2>Queue Management System Verification</h2>
//             <p>Dear ${newUser.name},</p>
//             <p>Your One-Time Password (OTP) for registration is:</p>
//             <h1 style="color: #3b82f6; font-size: 24px;">${otpCode}</h1>
//             <p>This code will expire in 10 minutes. Please enter it in the app to complete your registration.</p>
//         `;

//         sendEmail(
//             newUser.email, 
//             subject, 
//             `QMS OTP: ${otpCode} (Expires in 10 minutes)`,
//             emailBody
//         );
        
//         sendSms(newUser.phone, `QMS OTP: ${otpCode} (Expires in 10 min)`);

//         res.status(200).json({ 
//             message: 'Registration started. OTP sent to your email. Please verify.',
//             email: newUser.email
//         });
//     } catch (error) {
//         console.error("User Register Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // @route   POST /api/auth/verify-otp
// // @desc    Step 2: Verify the OTP and finalize registration
// router.post('/verify-otp', async (req, res) => {
//     try {
//         const { email, otp } = req.body;
        
//         const user = await User.findOne({ where: { email, isVerified: false } });
        
//         if (!user) {
//             return res.status(404).json({ message: 'User not found or already verified.' });
//         }

//         if (new Date() > user.otpExpires) {
//             await user.update({ otp: null, otpExpires: null }); 
//             return res.status(400).json({ message: 'OTP has expired. Please re-register to receive a new code.' });
//         }

//         if (user.otp !== otp) {
//             return res.status(400).json({ message: 'Invalid OTP provided.' });
//         }

//         await user.update({
//             isVerified: true,
//             otp: null,
//             otpExpires: null
//         });

//         const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
//         res.status(200).json({ 
//             token, 
//             user: { id: user.id, name: user.name, email: user.email, role: user.role },
//             message: '✅ Registration complete! You are now logged in.'
//         });

//     } catch (error) {
//         console.error("OTP Verification Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // ============================================
// // ✅ USER LOGIN
// // ============================================

// // @route   POST /api/auth/login
// // @desc    Login User - Checks for verification status
// router.post('/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ where: { email } });

//         if (!user) {
//             return res.status(400).json({ message: 'Invalid credentials.' });
//         }
        
//         if (!user.isVerified) {
//              return res.status(403).json({ 
//                  message: 'Account not verified. Please check your email for the verification code or re-register.' 
//              });
//         }

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(400).json({ message: 'Invalid credentials.' });
//         }

//         const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
//         res.json({ 
//             token, 
//             user: { id: user.id, name: user.name, email: user.email, role: user.role } 
//         });
//     } catch (error) {
//         console.error("User Login Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // ============================================
// // ✅ FORGOT PASSWORD - USER
// // ============================================

// // @route   POST /api/auth/forgot-password
// // @desc    Send password reset link to user email
// router.post('/forgot-password', async (req, res) => {
//     try {
//         const { email } = req.body;

//         if (!email) {
//             return res.status(400).json({ message: 'Email is required.' });
//         }

//         const user = await User.findOne({ where: { email, role: 'user' } });

//         if (!user) {
//             // Security: Don't reveal if email exists or not
//             return res.status(200).json({ 
//                 message: 'If an account exists with this email, you will receive a password reset link.' 
//             });
//         }

//         // Generate reset token
//         const resetToken = generateResetToken();
//         const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
//         const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // Token expires in 30 minutes

//         // Store hashed token and expiry in database
//         await user.update({
//             resetToken: resetTokenHash,
//             resetTokenExpires: resetTokenExpiry
//         });

//         // Create reset link (adjust URL based on your frontend deployment)
//         const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/User/reset-password.html?token=${resetToken}&email=${email}`;

//         // Send email with reset link
//         const subject = "Password Reset Request - QMS";
//         const emailBody = `
//             <h2>Password Reset Request</h2>
//             <p>Dear ${user.name},</p>
//             <p>We received a request to reset your password. Click the link below to proceed:</p>
//             <p><a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Reset Password</a></p>
//             <p>Or copy this link: ${resetLink}</p>
//             <p><strong>This link will expire in 30 minutes.</strong></p>
//             <p>If you did not request this, please ignore this email.</p>
//             <p>Best regards,<br>QMS Team</p>
//         `;

//         sendEmail(
//             user.email,
//             subject,
//             `Password Reset Link - QMS`,
//             emailBody
//         );

//         res.status(200).json({ 
//             message: 'If an account exists with this email, you will receive a password reset link.' 
//         });

//     } catch (error) {
//         console.error("Forgot Password Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // @route   POST /api/auth/reset-password
// // @desc    Verify token and reset password
// router.post('/reset-password', async (req, res) => {
//     try {
//         const { email, token, newPassword, confirmPassword } = req.body;

//         if (!email || !token || !newPassword || !confirmPassword) {
//             return res.status(400).json({ message: 'All fields are required.' });
//         }

//         if (newPassword !== confirmPassword) {
//             return res.status(400).json({ message: 'Passwords do not match.' });
//         }

//         if (newPassword.length < 6) {
//             return res.status(400).json({ message: 'Password must be at least 6 characters.' });
//         }

//         // Hash the provided token to compare with stored hash
//         const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

//         const user = await User.findOne({ where: { email, role: 'user' } });

//         if (!user) {
//             return res.status(400).json({ message: 'Invalid email or user not found.' });
//         }

//         // Check if token matches and hasn't expired
//         if (user.resetToken !== resetTokenHash) {
//             return res.status(400).json({ message: 'Invalid reset token.' });
//         }

//         if (!user.resetTokenExpires || new Date() > user.resetTokenExpires) {
//             await user.update({ resetToken: null, resetTokenExpires: null });
//             return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
//         }

//         // Hash new password
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(newPassword, salt);

//         // Update password and clear reset token
//         await user.update({
//             password: hashedPassword,
//             resetToken: null,
//             resetTokenExpires: null
//         });

//         // Send confirmation email
//         const subject = "Password Reset Successful - QMS";
//         const emailBody = `
//             <h2>Password Reset Successful</h2>
//             <p>Dear ${user.name},</p>
//             <p>Your password has been successfully reset.</p>
//             <p>You can now log in with your new password.</p>
//             <p>If you did not reset your password, please contact support immediately.</p>
//             <p>Best regards,<br>QMS Team</p>
//         `;

//         sendEmail(
//             user.email,
//             subject,
//             `Password Reset Successful`,
//             emailBody
//         );

//         res.status(200).json({ 
//             message: '✅ Password has been reset successfully. You can now login with your new password.' 
//         });

//     } catch (error) {
//         console.error("Reset Password Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // ============================================
// // ✅ ADMIN & SUPER ADMIN REGISTRATION
// // ============================================

// // @route   POST /api/auth/admin-register
// // @desc    Register a new ADMIN (for Super Admin approval)
// router.post('/admin-register', async (req, res) => {
//     try {
//         const { name, email, password } = req.body;
//         if (!name || !email || !password) {
//             return res.status(400).json({ message: 'All fields are required.' });
//         }
//         let user = await User.findOne({ where: { email } });
//         if (user) {
//             return res.status(400).json({ message: 'An account with this email already exists.' });
//         }
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);

//         const newUser = await User.create({
//             name,
//             email,
//             password: hashedPassword,
//             role: 'admin',
//             status: 'pending_approval'
//         });
        
//         const subject = "Admin Account Pending Approval";
//         const emailBody = `
//             <h2>Thank You for Registering, ${newUser.name}!</h2>
//             <p>Your Branch Admin account is now in <strong>pending approval</strong> status.</p>
//             <p>A Super Admin will review your application shortly. You will receive an email once your account is approved.</p>
//         `;
//         sendEmail(
//             newUser.email, 
//             subject, 
//             `Admin Account Pending Approval for ${newUser.email}`, 
//             emailBody
//         );

//         res.status(201).json({ message: 'Admin registration successful! Your account is pending approval.' });
//     } catch (error) {
//         console.error("Admin Register Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // ============================================
// // ✅ ADMIN & SUPER ADMIN LOGIN
// // ============================================

// // @route   POST /api/auth/admin-login
// // @desc    Login for ADMIN and SUPERADMIN users
// router.post('/admin-login', async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ where: { email } });

//         if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
//             return res.status(400).json({ message: 'Invalid credentials or not an admin account.' });
//         }
        
//         if (user.role === 'admin' && user.status !== 'approved') {
//             return res.status(403).json({ message: `Your account status is: ${user.status}. You cannot log in.` });
//         }

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(400).json({ message: 'Invalid credentials.' });
//         }

//         const token = jwt.sign({ user: { id: user.id, role: user.role } }, process.env.JWT_SECRET, { expiresIn: '1d' });
//         res.json({ 
//             message: 'Login successful!', 
//             token, 
//             user: { id: user.id, name: user.name, email: user.email, role: user.role } 
//         });
//     } catch (error) {
//         console.error("Admin Login Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // ============================================
// // ✅ ADMIN FORGOT PASSWORD
// // ============================================

// // @route   POST /api/auth/admin-forgot-password
// // @desc    Send password reset link to admin email
// router.post('/admin-forgot-password', async (req, res) => {
//     try {
//         const { email } = req.body;

//         if (!email) {
//             return res.status(400).json({ message: 'Email is required.' });
//         }

//         const user = await User.findOne({ where: { email, role: 'admin' } });

//         if (!user) {
//             return res.status(200).json({ 
//                 message: 'If an admin account exists with this email, you will receive a password reset link.' 
//             });
//         }

//         const resetToken = generateResetToken();
//         const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
//         const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);

//         await user.update({
//             resetToken: resetTokenHash,
//             resetTokenExpires: resetTokenExpiry
//         });

//         const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/Admin/reset-password.html?token=${resetToken}&email=${email}`;

//         const subject = "Password Reset Request - QMS Admin Portal";
//         const emailBody = `
//             <h2>Password Reset Request</h2>
//             <p>Dear ${user.name},</p>
//             <p>We received a request to reset your admin password. Click the link below to proceed:</p>
//             <p><a href="${resetLink}" style="background-color: #16a34a; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Reset Password</a></p>
//             <p>Or copy this link: ${resetLink}</p>
//             <p><strong>This link will expire in 30 minutes.</strong></p>
//             <p>If you did not request this, please ignore this email and contact your Super Admin.</p>
//             <p>Best regards,<br>QMS Admin Team</p>
//         `;

//         sendEmail(
//             user.email,
//             subject,
//             `Admin Password Reset Link - QMS`,
//             emailBody
//         );

//         res.status(200).json({ 
//             message: 'If an admin account exists with this email, you will receive a password reset link.' 
//         });

//     } catch (error) {
//         console.error("Admin Forgot Password Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // @route   POST /api/auth/admin-reset-password
// // @desc    Verify token and reset admin password
// router.post('/admin-reset-password', async (req, res) => {
//     try {
//         const { email, token, newPassword, confirmPassword } = req.body;

//         if (!email || !token || !newPassword || !confirmPassword) {
//             return res.status(400).json({ message: 'All fields are required.' });
//         }

//         if (newPassword !== confirmPassword) {
//             return res.status(400).json({ message: 'Passwords do not match.' });
//         }

//         if (newPassword.length < 6) {
//             return res.status(400).json({ message: 'Password must be at least 6 characters.' });
//         }

//         const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

//         const user = await User.findOne({ where: { email, role: 'admin' } });

//         if (!user) {
//             return res.status(400).json({ message: 'Invalid email or admin not found.' });
//         }

//         if (user.resetToken !== resetTokenHash) {
//             return res.status(400).json({ message: 'Invalid reset token.' });
//         }

//         if (!user.resetTokenExpires || new Date() > user.resetTokenExpires) {
//             await user.update({ resetToken: null, resetTokenExpires: null });
//             return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
//         }

//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(newPassword, salt);

//         await user.update({
//             password: hashedPassword,
//             resetToken: null,
//             resetTokenExpires: null
//         });

//         const subject = "Admin Password Reset Successful - QMS";
//         const emailBody = `
//             <h2>Password Reset Successful</h2>
//             <p>Dear ${user.name},</p>
//             <p>Your admin password has been successfully reset.</p>
//             <p>You can now log in to the admin portal with your new password.</p>
//             <p>If you did not reset your password, please contact your Super Admin immediately.</p>
//             <p>Best regards,<br>QMS Admin Team</p>
//         `;

//         sendEmail(
//             user.email,
//             subject,
//             `Admin Password Reset Successful`,
//             emailBody
//         );

//         res.status(200).json({ 
//             message: '✅ Password has been reset successfully. You can now login with your new password.' 
//         });

//     } catch (error) {
//         console.error("Admin Reset Password Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // ============================================
// // ✅ SUPER ADMIN FORGOT PASSWORD
// // ============================================

// // @route   POST /api/auth/superadmin-forgot-password
// // @desc    Send password reset link to super admin email
// router.post('/superadmin-forgot-password', async (req, res) => {
//     try {
//         const { email } = req.body;

//         if (!email) {
//             return res.status(400).json({ message: 'Email is required.' });
//         }

//         const user = await User.findOne({ where: { email, role: 'superadmin' } });

//         if (!user) {
//             return res.status(200).json({ 
//                 message: 'If a Super Admin account exists with this email, you will receive a password reset link.' 
//             });
//         }

//         const resetToken = generateResetToken();
//         const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
//         const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);

//         await user.update({
//             resetToken: resetTokenHash,
//             resetTokenExpires: resetTokenExpiry
//         });

//         const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/SuperAdmin/reset-password.html?token=${resetToken}&email=${email}`;

//         const subject = "⚠️ Password Reset Request - QMS Super Admin Portal";
//         const emailBody = `
//             <h2>🔐 Critical: Password Reset Request</h2>
//             <p>Dear ${user.name},</p>
//             <p>We received a request to reset your Super Admin password. Click the link below to proceed:</p>
//             <p><a href="${resetLink}" style="background-color: #7c3aed; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Reset Super Admin Password</a></p>
//             <p>Or copy this link: ${resetLink}</p>
//             <p><strong style="color: red;">⚠️ This link will expire in 30 minutes.</strong></p>
//             <p><strong style="color: red;">⚠️ CRITICAL: This account has system-wide access. If you did not request this, take immediate action.</strong></p>
//             <p>Best regards,<br>QMS Security Team</p>
//         `;

//         sendEmail(
//             user.email,
//             subject,
//             `🔐 Super Admin Password Reset Link - QMS`,
//             emailBody
//         );

//         res.status(200).json({ 
//             message: 'If a Super Admin account exists with this email, you will receive a password reset link.' 
//         });

//     } catch (error) {
//         console.error("Super Admin Forgot Password Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // @route   POST /api/auth/superadmin-reset-password
// // @desc    Verify token and reset super admin password
// router.post('/superadmin-reset-password', async (req, res) => {
//     try {
//         const { email, token, newPassword, confirmPassword } = req.body;

//         if (!email || !token || !newPassword || !confirmPassword) {
//             return res.status(400).json({ message: 'All fields are required.' });
//         }

//         if (newPassword !== confirmPassword) {
//             return res.status(400).json({ message: 'Passwords do not match.' });
//         }

//         if (newPassword.length < 8) {
//             return res.status(400).json({ message: 'Super Admin password must be at least 8 characters for security.' });
//         }

//         const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

//         const user = await User.findOne({ where: { email, role: 'superadmin' } });

//         if (!user) {
//             return res.status(400).json({ message: 'Invalid email or Super Admin not found.' });
//         }

//         if (user.resetToken !== resetTokenHash) {
//             return res.status(400).json({ message: 'Invalid reset token.' });
//         }

//         if (!user.resetTokenExpires || new Date() > user.resetTokenExpires) {
//             await user.update({ resetToken: null, resetTokenExpires: null });
//             return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
//         }

//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(newPassword, salt);

//         await user.update({
//             password: hashedPassword,
//             resetToken: null,
//             resetTokenExpires: null
//         });

//         const subject = "🔐 Super Admin Password Reset Successful - QMS";
//         const emailBody = `
//             <h2>Password Reset Successful</h2>
//             <p>Dear ${user.name},</p>
//             <p>Your Super Admin password has been successfully reset.</p>
//             <p>You can now log into the Super Admin portal with your new password.</p>
//             <p><strong style="color: red;">⚠️ If you did not reset your password, this is a CRITICAL SECURITY ISSUE. Take immediate action.</strong></p>
//             <p>Best regards,<br>QMS Security Team</p>
//         `;

//         sendEmail(
//             user.email,
//             subject,
//             `🔐 Super Admin Password Reset Successful`,
//             emailBody
//         );

//         res.status(200).json({ 
//             message: '✅ Password has been reset successfully. You can now login with your new password.' 
//         });

//     } catch (error) {
//         console.error("Super Admin Reset Password Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // ============================================
// // ✅ ADMIN MANAGEMENT (Super Admin only)
// // ============================================

// // @route   GET /api/auth/admins/pending
// // @desc    Get all admins pending approval
// router.get('/admins/pending', authMiddleware, async (req, res) => {
//     if (req.user.role !== 'superadmin') {
//         return res.status(403).json({ message: 'Access Denied. Only Super Admins can perform this action.' });
//     }
//     try {
//         const pendingAdmins = await User.findAll({ where: { role: 'admin', status: 'pending_approval' } });
//         res.json(pendingAdmins);
//     } catch (error) {
//         console.error("Get Pending Admins Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// // @route   PUT /api/auth/admins/:id/status
// // @desc    Update an admin's status (Approve/Reject)
// router.put('/admins/:id/status', authMiddleware, async (req, res) => {
//     if (req.user.role !== 'superadmin') {
//         return res.status(403).json({ message: 'Access Denied. Only Super Admins can perform this action.' });
//     }
//     try {
//         const { status } = req.body;
//         if (!['approved', 'rejected'].includes(status)) {
//             return res.status(400).json({ message: 'Invalid status provided.' });
//         }
//         const admin = await User.findByPk(req.params.id);
//         if (!admin || admin.role !== 'admin') {
//             return res.status(404).json({ message: 'Admin user not found.' });
//         }
        
//         const oldStatus = admin.status; 
//         admin.status = status;
//         await admin.save();
        
//         if (status !== oldStatus) {
//             const subject = `Admin Account ${status.toUpperCase()}`;
//             const emailBody = `
//                 <h2>Your Account Status Has Been Updated</h2>
//                 <p>Dear ${admin.name},</p>
//                 <p>Your Branch Admin registration has been <strong>${status.toUpperCase()}</strong> by a Super Admin.</p>
//                 ${status === 'approved' 
//                     ? `<p>You can now log into the <a href="http://localhost:3000/Admin/adminaccess.html">Admin Portal</a> to manage your branch.</p>` 
//                     : `<p>Please contact the Super Admin for more information on the rejection.</p>`
//                 }
//             `;
//             sendEmail(
//                 admin.email, 
//                 subject, 
//                 `Account Status: ${status.toUpperCase()}`, 
//                 emailBody
//             );
//         }

//         res.json({ message: `Admin ${admin.name} has been successfully ${status}.` });
//     } catch (error) {
//         console.error("Update Admin Status Error:", error.message);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });

// module.exports = router;


