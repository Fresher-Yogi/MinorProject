// const express = require('express');
// const router = express.Router();
// const { getAllBranches } = require('../controllers/branchController');

// router.get('/', getAllBranches);

// module.exports = router;


const express = require('express');
const router = express.Router();
const { getAllBranches, createBranch, getBranchById } = require('../controllers/branchController');

// Get all branches
router.get('/', getAllBranches);

// Create a branch
router.post('/', createBranch);

// Get branch by ID
router.get('/:id', getBranchById);

module.exports = router;