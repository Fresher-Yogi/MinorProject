const express = require('express');
const router = express.Router();
const { getAllBranches } = require('../controllers/branchController');

router.get('/', getAllBranches);

module.exports = router;