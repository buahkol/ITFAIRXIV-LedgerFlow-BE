// services/transactionService.js
const dbConnection = require('../config/database'); 
const { generateBlockchainHash } = require('../utils/hashing'); 

// --- Fungsi Kategori ---

// Fungsi classifyTransaction tetap sama, hanya untuk default yang hardcoded
function classifyTransaction(description) {
    if (description.toLowerCase().includes("mcdonalds") || description.toLowerCase().includes("starbucks")) return "Food";
    if (description.toLowerCase().includes("grab") || description.toLowerCase().includes("gojek")) return "Transportation";
    return "Uncategorized"; // Jika tidak cocok, kirim sinyal untuk dibuat kategori baru
}

// Fungsi baru untuk mengecek dan membuat kategori
async function findOrCreateCategory(connection, userId, description) {
    const defaultCategory = classifyTransaction(description);

    if (defaultCategory !== 'Uncategorized') {
        return defaultCategory; // Gunakan kategori yang sudah terklasifikasi
    }

    // Jika 'Uncategorized', buat nama kategori berdasarkan normalisasi deskripsi
    const words = description.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    let newCategoryName = words.slice(0, 3).join(' '); // Ambil maksimal 3 kata pertama

    if (newCategoryName.length < 3) {
        return 'Uncategorized'; // Tetap Uncategorized jika deskripsi terlalu pendek
    }
    
    // Kapitalisasi huruf pertama
    newCategoryName = newCategoryName.charAt(0).toUpperCase() + newCategoryName.slice(1);
    
    // 1. Cek apakah kategori ini sudah ada
    const [existing] = await connection.execute(
        "SELECT category_name FROM Categories WHERE user_id = ? AND category_name = ?",
        [userId, newCategoryName]
    );

    if (existing.length > 0) {
        return existing[0].category_name; // Kategori sudah ada, gunakan yang ini
    }

    // 2. Jika belum ada, buat kategori baru (Custom)
    await connection.execute(
        "INSERT INTO Categories (user_id, category_name, is_custom) VALUES (?, ?, ?)",
        [userId, newCategoryName, true]
    );
    
    console.log(`Kategori baru dibuat: ${newCategoryName} untuk user ${userId}`);
    return newCategoryName; // Kembalikan nama kategori baru
}


// --- Fungsi Ingest ---

async function ingestNewTransaction(data) {
    const { account_id, user_id, amount, date, description } = data;
    const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
    const txType = amount < 0 ? 'OUT' : 'IN'; 
    const blockchainHash = generateBlockchainHash(account_id, amount, new Date(date), description);

    let connection;
    try {
        connection = await dbConnection.getConnection(); 
        await connection.beginTransaction(); 

        const finalCategory = await findOrCreateCategory(connection, user_id, description);

        // --- INSERT KE LEDGER (Immutable) ---
        const sqlLedger = `
            INSERT INTO Transactions_Ledger (
               account_id, original_amount, original_date, original_description, 
               transaction_type, blockchain_hash
           ) VALUES (?, ?, ?, ?, ?, ?);`;
        const paramsLedger = [account_id, amount, formattedDate, description, txType, blockchainHash];
        const [ledgerResult] = await connection.execute(sqlLedger, paramsLedger);
        const ledgerId = ledgerResult.insertId;

        // --- INSERT KE USER (Mutable) ---
        const sqlUser = `
            INSERT INTO Transactions_User (
                ledger_id, user_id, category, status
            ) VALUES (?, ?, ?, ?);
        `;
        const paramsUser = [ledgerId, user_id, finalCategory, 'Confirmed'];
        await connection.execute(sqlUser, paramsUser); 
        
        await connection.commit(); 
        return { success: true, ledgerId: ledgerId, category: finalCategory }; 

    } catch (error) {
        if (connection) await connection.rollback(); 
        console.error(`Gagal ingest transaksi:`, error.message);
        throw new Error("Ingest transaction failed.");

    } finally {
        if (connection) connection.release(); 
    }
}

// --- Fungsi Update Kategori ---

async function updateTransactionCategory(userTransactionId, newCategory) {
    let connection;
    try {
        connection = await dbConnection.getConnection();
        
        const sql = `
            UPDATE Transactions_User 
            SET category = ?
            WHERE user_transaction_id = ?;
        `;
        
        const [result] = await connection.execute(sql, [newCategory, userTransactionId]);

        if (result.affectedRows === 0) {
            // Lempar error dengan properti status untuk penanganan 404
            const notFoundError = new Error(`Transaction with ID ${userTransactionId} not found.`);
            notFoundError.status = 404;
            throw notFoundError;
        }
        
        return { success: true, userTransactionId, newCategory };
        
    } catch (error) {
        // Jika error sudah memiliki status 404, lempar kembali
        if (error.status === 404) throw error; 

        console.error(`!!! SERVER ERROR: Gagal mengupdate kategori transaksi ${userTransactionId}:`, error.message); 
        throw new Error("Failed to update transaction category."); 
    } finally {
        if (connection) connection.release();
    }
}

module.exports = { 
    ingestNewTransaction, 
    classifyTransaction, 
    findOrCreateCategory, 
    updateTransactionCategory
};