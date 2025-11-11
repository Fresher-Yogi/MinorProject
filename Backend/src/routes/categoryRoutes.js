// Backend/src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoryController');
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

// Public Route (anyone can see all categories)
router.get('/', controller.getAllCategories);

// ✅ NEW PUBLIC ROUTE: Get a single category by ID
// This is essential for the service-details.html page.
router.get('/:id', controller.getCategoryById);


// Protected Super Admin Routes
router.post('/', authMiddleware, isSuperAdmin, controller.createCategory);
router.put('/:id', authMiddleware, isSuperAdmin, controller.updateCategory);
router.delete('/:id', authMiddleware, isSuperAdmin, controller.deleteCategory);

module.exports = router;