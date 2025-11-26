const dbConnection = require('../config/database');
const { getBudgetUtilization } = require('../services/budgetService'); // Import service baru

function formatDateTime(dateObj) {
    if (!dateObj) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function getMonthlyBudgetSummary(req, res) {
    // ... (Fungsi ini tetap sama, hanya mengambil data pengeluaran)
    const userId = req.params.userId;
    
    if (req.user.userId != userId) {
        return res.status(403).json({ error: "Forbidden: Accessing data for another user." });
    }

    const today = new Date();
    const startOfMonthObj = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
    const startOfMonth = formatDateTime(startOfMonthObj);
    const endOfMonthObj = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    const endOfMonth = formatDateTime(endOfMonthObj);

    const sql = `
        SELECT 
            TU.category,
            ABS(SUM(TL.original_amount)) AS total_spent
        FROM Transactions_User TU
        JOIN Transactions_Ledger TL ON TU.ledger_id = TL.ledger_id
        WHERE TU.user_id = ?
          AND TL.original_amount < 0 
          AND TL.original_date >= ?
          AND TL.original_date <= ?
        GROUP BY TU.category
        ORDER BY total_spent DESC;
    `;

    try {
        const [results] = await dbConnection.execute(sql, [userId, startOfMonth, endOfMonth]);
        
        const summary = results.map(item => ({
            category: item.category,
            total_spent: parseFloat(item.total_spent).toFixed(2)
        }));

        res.status(200).json(summary);
    } catch (error) {
        console.error("Error fetching budget summary:", error.message);
        res.status(500).json({ error: "Failed to generate budget summary." });
    }
}

async function getFullBudgetUtilization(req, res) { // Fungsi baru untuk dashboard
    const userId = req.params.userId;
    try {
        const utilizationData = await getBudgetUtilization(userId);
        res.status(200).json(utilizationData);
    } catch (error) {
        console.error("Error fetching budget utilization:", error.message);
        res.status(500).json({ error: error.message || "Failed to calculate budget utilization." });
    }
}

module.exports = { getMonthlyBudgetSummary, getFullBudgetUtilization };