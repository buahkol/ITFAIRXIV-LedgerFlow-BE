// controllers/transactionController.js
const dbConnection = require('../config/database');
const { updateTransactionCategory } = require('../services/transactionService'); // Import fungsi service

// Fungsi pembantu untuk memformat tanggal ke YYYY-MM-DD HH:MM:SS
function formatDateTime(dateObj) {
    if (!dateObj) return null;
    // Mengambil string ISO, memotong milidetik dan Z, lalu mengganti T dengan spasi
    return dateObj.toISOString().slice(0, 19).replace('T', ' ');
}

async function getTransactionsByUserId(req, res) {
    const userId = req.params.userId;
    
    // VERIFIKASI: Pastikan ID di URL sama dengan ID di token
    if (req.user.userId != userId) {
        return res.status(403).json({ error: "Forbidden: Accessing data for another user." });
    }

    const sql = `
        SELECT 
            TU.user_transaction_id,
            TU.category,
            TU.status,
            TL.original_amount AS amount,
            TL.original_date AS date,
            TL.original_description AS description,
            FA.provider_name AS source,
            TL.blockchain_hash
        FROM Transactions_User TU
        JOIN Transactions_Ledger TL ON TU.ledger_id = TL.ledger_id
        JOIN FinancialAccounts FA ON TL.account_id = FA.account_id
        WHERE TU.user_id = ?
        ORDER BY TL.original_date DESC;
    `;

    try {
        const [results] = await dbConnection.execute(sql, [userId]);
        
        const formattedResults = results.map(tx => {
            return {
                ...tx,
                // Mengubah objek Date menjadi string format YYYY-MM-DD HH:MM:SS
                date: formatDateTime(tx.date) 
            };
        });

        res.status(200).json(formattedResults);
        
    } catch (error) {
        console.error("Error fetching transactions:", error.message);
        res.status(500).json({ error: "Failed to fetch transaction data." });
    }
}

async function patchTransactionCategory(req, res) {
    const userTransactionId = req.params.userTransactionId; 
    const { category } = req.body; 
    
    if (!category) {
        return res.status(400).json({ error: "Category field is required for update." });
    }

    try {
        const result = await updateTransactionCategory(userTransactionId, category);
        res.status(200).json({ message: "Transaction category successfully updated.", data: result });
    } catch (error) {
        // Penanganan error khusus dari service
        if (error.status === 404) {
             return res.status(404).json({ error: error.message });
        }
        console.error("Error patching transaction category:", error.message);
        res.status(500).json({ error: "Failed to update category." });
    }
}

module.exports = { getTransactionsByUserId, patchTransactionCategory };