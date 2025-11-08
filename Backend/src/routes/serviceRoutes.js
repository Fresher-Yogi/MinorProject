// Backend/src/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/serviceController');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');

// Middleware to check for Super Admin role
const isSuperAdmin = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user && user.role === 'superadmin') {
            return next();
        }
        res.status(403).json({ message: 'Access Denied: Super Admin role required.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Public Route (users need to see services to book them)
router.get('/', controller.getAllServices);

// Protected Super Admin Routes
router.post('/', authMiddleware, isSuperAdmin, controller.createService);
router.put('/:id', authMiddleware, isSuperAdmin, controller.updateService);
router.delete('/:id', authMiddleware, isSuperAdmin, controller.deleteService);

module.exports = router;