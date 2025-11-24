// routes/transactionRoute.js

const express = require('express');
const router = express.Router();
const { ingestNewTransaction } = require('../services/transactionService'); 
const { getTransactionsByUserId, patchTransactionCategory } = require('../controllers/transactionController');
const { getMonthlyBudgetSummary } = require('../controllers/analyticsController');

// Endpoint UJI COBA: POST /api/transactions/ingest-mutation
router.post('/ingest-mutation', async (req, res) => {
    // Note: Dalam kasus nyata, endpoint ini dipanggil oleh Internal Service (bukan user langsung)
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

router.get('/user/:userId', getTransactionsByUserId); 
router.get('/summary/budget/:userId', getMonthlyBudgetSummary);
router.patch('/user/:userTransactionId', patchTransactionCategory);

module.exports = router;