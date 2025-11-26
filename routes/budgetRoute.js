const express = require('express');
const router = express.Router();
const { setBudget, getBudgetSettings } = require('../controllers/budgetController');
const { authenticateToken } = require('../middleware/auth');

// Endpoint untuk setting budget bulanan (Quick Action)
router.post('/:userId', authenticateToken, setBudget);

// Endpoint untuk mendapatkan setting budget bulanan
router.get('/settings/:userId', authenticateToken, getBudgetSettings);

module.exports = router;