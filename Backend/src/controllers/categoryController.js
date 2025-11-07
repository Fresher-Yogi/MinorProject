// backend/src/controllers/categoryController.js
const ServiceCategory = require('../models/ServiceCategory');

// GET all categories (Public)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await ServiceCategory.findAll({ order: [['name', 'ASC']] });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// GET a single category by ID (Public)
exports.getCategoryById = async (req, res) => {
    try {
        const category = await ServiceCategory.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST a new category (Super Admin Only)
exports.createCategory = async (req, res) => {
    try {
        const { name, icon, description, subServices } = req.body;
        const newCategory = await ServiceCategory.create({ name, icon, description, subServices });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// PUT (update) a category (Super Admin Only)
exports.updateCategory = async (req, res) => {
    try {
        const { name, icon, description, subServices } = req.body;
        const category = await ServiceCategory.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        category.name = name;
        category.icon = icon;
        category.description = description;
        category.subServices = subServices;
        await category.save();
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// DELETE a category (Super Admin Only)
exports.deleteCategory = async (req, res) => {
    try {
        const category = await ServiceCategory.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        await category.destroy();
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};