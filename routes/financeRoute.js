const express = require('express');
const router = express.Router();
const { getTotalBalance, getHealthScore } = require('../controllers/financeController');
const { authenticateToken } = require('../middleware/auth');

// Endpoint untuk total saldo terintegrasi
router.get('/balance/:userId', authenticateToken, getTotalBalance);

// Endpoint untuk Health Score (Dashboard Analytics)
router.get('/health/:userId', authenticateToken, getHealthScore);

module.exports = router;