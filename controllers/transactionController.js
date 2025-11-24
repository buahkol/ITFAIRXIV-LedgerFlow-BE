// controllers/transactionController.js
const dbConnection = require('../config/database'); 

// Fungsi pembantu untuk memformat tanggal ke YYYY-MM-DD HH:MM:SS
function formatDateTime(dateObj) {
    if (!dateObj) return null;
    // Mengambil string ISO, memotong milidetik dan Z, lalu mengganti T dengan spasi
    return dateObj.toISOString().slice(0, 19).replace('T', ' ');
}

async function getTransactionsByUserId(req, res) {
    const userId = req.params.userId;

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
        
        // *** PERBAIKAN: Memformat ulang data yang diambil ***
        const formattedResults = results.map(tx => {
            return {
                ...tx,
                // Mengubah objek Date menjadi string format YYYY-MM-DD HH:MM:SS
                date: formatDateTime(tx.date) 
            };
        });

        res.status(200).json(formattedResults); // Mengirim hasil yang sudah diformat
        
    } catch (error) {
        console.error("Error fetching transactions:", error.message);
        res.status(500).json({ error: "Failed to fetch transaction data." });
    }
}

// controllers/transactionController.js (Tambahkan ini di akhir file)
const { updateTransactionCategory } = require('../services/transactionService'); // Import fungsi baru

async function patchTransactionCategory(req, res) {
    const userTransactionId = req.params.userTransactionId; // Ambil ID dari URL
    const { category } = req.body; // Ambil kategori baru dari body

    if (!category) {
        return res.status(400).json({ error: "Category field is required for update." });
    }

    try {
        const result = await updateTransactionCategory(userTransactionId, category);
        res.status(200).json({ message: "Transaction category successfully updated.", data: result });
    } catch (error) {
        if (error.message.includes("not found")) {
             return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to update category." });
    }
}

module.exports = { getTransactionsByUserId, patchTransactionCategory }; // <-- EXPORT FUNGSI BARU