const dbConnection = require('../config/database');
const { getFinanceHealthScore } = require('../services/budgetService');

async function getTotalBalance(req, res) {
    const userId = req.params.userId;

    const sql = `
        SELECT 
            SUM(current_balance) AS total_balance  /* <-- PERBAIKAN DI SINI! */
        FROM FinancialAccounts 
        WHERE user_id = ?;
    `;

    try {
        const [results] = await dbConnection.execute(sql, [userId]);
        
        // Pastikan total_balance tidak null sebelum parsing
        const totalBalance = results[0].total_balance ? parseFloat(results[0].total_balance).toFixed(2) : '0.00';
        
        res.status(200).json({ 
            userId: userId, 
            total_balance: totalBalance,
            currency: 'IDR'
        });

    } catch (error) {
        // Log error asli agar mudah di-debug
        console.error("Error fetching total balance:", error.message); 
        res.status(500).json({ error: "Failed to fetch total balance." });
    }
}

async function getHealthScore(req, res) {
    const userId = req.params.userId;
    try {
        const scoreData = await getFinanceHealthScore(userId);
        res.status(200).json(scoreData);
    } catch (error) {
        console.error("Error fetching health score:", error.message);
        res.status(500).json({ error: error.message || "Failed to generate health score." });
    }
}

module.exports = { getTotalBalance, getHealthScore };