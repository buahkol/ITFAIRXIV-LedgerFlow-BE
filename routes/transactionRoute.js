const express = require('express');
const router = express.Router();
const { ingestNewTransaction } = require('../services/transactionService'); 
const { getTransactionsByUserId, patchTransactionCategory } = require('../controllers/transactionController');
const { getMonthlyBudgetSummary, getFullBudgetUtilization } = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');

// Endpoint UJI COBA: POST /api/transactions/ingest-mutation
router.post('/ingest-mutation', async (req, res) => {
    const requiredFields = ['account_id', 'user_id', 'amount', 'date', 'description'];
    for (const field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).json({ error: `Missing required field: ${field}` });
        }
    }

    try {
        const result = await ingestNewTransaction(req.body); 
        res.status(201).json({ message: "Transaction successfully ingested.", data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/user/:userId', authenticateToken, getTransactionsByUserId); 

// Endpoint lama untuk summary pengeluaran
router.get('/summary/spent/:userId', authenticateToken, getMonthlyBudgetSummary);

// Endpoint baru untuk Utilization (spent vs limit)
router.get('/summary/utilization/:userId', authenticateToken, getFullBudgetUtilization);

router.patch('/:userTransactionId', authenticateToken, patchTransactionCategory); 

module.exports = router;