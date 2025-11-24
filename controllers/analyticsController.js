// controllers/analyticsController.js
const dbConnection = require('../config/database'); 

async function getMonthlyBudgetSummary(req, res) {
    const userId = req.params.userId;
    
    // Asumsi: Kita ingin menganalisis bulan saat ini.
    // Di lingkungan produksi, tanggal ini bisa dikirim dari frontend.
    const today = new Date();
    const startOfMonth = today.toISOString().slice(0, 7) + '-01 00:00:00'; 
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
                       .toISOString().slice(0, 19).replace('T', ' ');


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
        
        // Memformat hasil agar terlihat lebih rapi
        const summary = results.map(item => ({
            category: item.category,
            total_spent: parseFloat(item.total_spent).toFixed(2) // Format ke 2 desimal
        }));

        res.status(200).json(summary);
    } catch (error) {
        console.error("Error fetching budget summary:", error.message);
        res.status(500).json({ error: "Failed to generate budget summary." });
    }
}

module.exports = { getMonthlyBudgetSummary };