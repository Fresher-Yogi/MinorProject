// const Branch = require('../models/Branch');

// exports.getAllBranches = async (req, res) => {
//   try {
//     const branches = await Branch.findAll();
//     res.json(branches);
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send('Server Error');
//   }
// };

// exports.createBranch = async (req, res) => {
//   try {
//     const { name, location } = req.body;
//     const branch = await Branch.create({ name, location });
//     res.status(201).json(branch);
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send('Server Error');
//   }
// };


const Branch = require('../models/Branch');

// Get all branches
exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll();
    res.json(branches);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create a new branch
exports.createBranch = async (req, res) => {
  try {
    const { name, location } = req.body;
    
    if (!name || !location) {
      return res.status(400).json({ message: 'Please provide name and location' });
    }
    
    const branch = await Branch.create({ name, location });
    res.status(201).json({ 
      message: 'Branch created successfully',
      branch 
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get branch by ID
exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    
    res.json(branch);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};