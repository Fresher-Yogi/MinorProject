// Backend/src/controllers/serviceController.js
const Service = require('../models/Service');

// GET all services, optionally filter by category
exports.getAllServices = async (req, res) => {
    try {
        let options = { order: [['name', 'ASC']] };
        if (req.query.categoryId) {
            options.where = { categoryId: req.query.categoryId };
        }
        const services = await Service.findAll(options);
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST a new service (Super Admin Only)
exports.createService = async (req, res) => {
    try {
        const { name, description, categoryId } = req.body;
        const newService = await Service.create({ name, description, categoryId });
        res.status(201).json(newService);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// PUT (update) a service (Super Admin Only)
exports.updateService = async (req, res) => {
    try {
        const { name, description, categoryId } = req.body;
        const service = await Service.findByPk(req.params.id);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        await service.update({ name, description, categoryId });
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// DELETE a service (Super Admin Only)
exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        await service.destroy();
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};