// backend/src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');

// Middleware to check for Super Admin role
const isSuperAdmin = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user && user.role === 'superadmin') {
            next();
        } else {
            res.status(403).json({ message: 'Access Denied: Super Admin role required.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Public Routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Protected Super Admin Routes
router.post('/', authMiddleware, isSuperAdmin, createCategory);
router.put('/:id', authMiddleware, isSuperAdmin, updateCategory);
router.delete('/:id', authMiddleware, isSuperAdmin, deleteCategory);

module.exports = router;