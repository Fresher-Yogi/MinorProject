// Backend/src/controllers/categoryController.js
const Category = require('../models/Category');

// ✅ NEW FUNCTION: GET a single category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            // CRITICAL: Return 404 response if not found
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        // Handle potential server errors (e.g., non-numeric ID in database query)
        res.status(500).json({ message: 'Server Error fetching category.' });
    }
};

// GET all categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST a new category (Super Admin Only)
exports.createCategory = async (req, res) => {
    try {
        const { name, icon, description } = req.body;
        const newCategory = await Category.create({ name, icon, description });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// PUT (update) a category (Super Admin Only)
exports.updateCategory = async (req, res) => {
    try {
        const { name, icon, description } = req.body;
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        await category.update({ name, icon, description });
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// DELETE a category (Super Admin Only)
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        await category.destroy();
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};