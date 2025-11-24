// services/transactionService.js
const dbConnection = require('../config/database'); 
const { generateBlockchainHash } = require('../utils/hashing'); 

function classifyTransaction(description) {
    if (description.toLowerCase().includes("mcdonalds") || description.toLowerCase().includes("starbucks")) return "Food";
    if (description.toLowerCase().includes("grab") || description.toLowerCase().includes("gojek")) return "Transportation";
    return "Uncategorized";
}

async function ingestNewTransaction(data) {
    const { account_id, user_id, amount, date, description } = data;
    const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
    const txType = amount < 0 ? 'OUT' : 'IN'; 
    const blockchainHash = generateBlockchainHash(account_id, amount, new Date(date), description);

    let connection;
    try {
        connection = await dbConnection.getConnection(); 
        await connection.beginTransaction(); 

        // *** LOGIKA UTAMA BARU ***
        const finalCategory = await findOrCreateCategory(connection, user_id, description);
        // **********************

        // --- INSERT KE LEDGER (Immutable) ---
        // ... (kode INSERT LEDGER tetap sama)
        const sqlLedger = `
                INSERT INTO Transactions_Ledger (
                 account_id, original_amount, original_date, original_description, 
                 transaction_type, blockchain_hash
             ) VALUES (?, ?, ?, ?, ?, ?);`; // (gunakan kode Anda yang sudah ada)
        const paramsLedger = [account_id, amount, formattedDate, description, txType, blockchainHash];
        const [ledgerResult] = await connection.execute(sqlLedger, paramsLedger);
        const ledgerId = ledgerResult.insertId;

        // --- INSERT KE USER (Mutable) ---
        const sqlUser = `
            INSERT INTO Transactions_User (
                ledger_id, user_id, category, status
            ) VALUES (?, ?, ?, ?);
        `;
        // Gunakan finalCategory:
        const paramsUser = [ledgerId, user_id, finalCategory, 'Confirmed'];
        await connection.execute(sqlUser, paramsUser); 
        
        await connection.commit(); 
        return { success: true, ledgerId: ledgerId, category: finalCategory }; // Tambahkan kategori di respons

    } catch (error) {
        if (connection) await connection.rollback(); 
        console.error(`Gagal ingest transaksi:`, error.message);
        throw new Error("Ingest transaction failed.");

    } finally {
        if (connection) connection.release(); 
    }
}

async function updateTransactionCategory(userTransactionId, newCategory) {
    let connection;
    try {
        // Ambil koneksi
        connection = await dbConnection.getConnection();
        
        // Cek dan pastikan kategori baru yang dikirimkan valid (opsional)

        // Query UPDATE Kategori
        const sql = `
            UPDATE Transactions_User 
            SET category = ?
            WHERE user_transaction_id = ?;
        `;
        
        const [result] = await connection.execute(sql, [newCategory, userTransactionId]);

        // Cek apakah ada baris yang terpengaruh (ID ditemukan)
        if (result.affectedRows === 0) {
            // Jika ID tidak ditemukan, ini akan dilempar dan ditangkap di controller
            throw new Error(`Transaction with ID ${userTransactionId} not found or category is the same.`);
        }
        
        return { success: true, userTransactionId, newCategory };
        
    } catch (error) {
        // *** PENTING: Cetak seluruh objek error untuk debug ***
        console.error(`!!! SERVER ERROR: Gagal mengupdate kategori transaksi ${userTransactionId}:`, error); 
        // *******************************************************
        
        // Lempar error standar kembali ke controller
        throw new Error("Failed to update transaction category."); 
    } finally {
        if (connection) connection.release();
    }
}

// Jangan lupa export fungsi baru ini di akhir file:
module.exports = { 
    ingestNewTransaction, 
    classifyTransaction, 
    findOrCreateCategory, 
    updateTransactionCategory // <-- TAMBAHKAN INI
};

// services/transactionService.js

// ... (existing code, ensure dbConnection is imported)

// Fungsi baru untuk mengecek dan membuat kategori
async function findOrCreateCategory(connection, userId, description) {
    const defaultCategory = classifyTransaction(description);

    if (defaultCategory !== 'Uncategorized') {
        return defaultCategory; // Gunakan kategori yang sudah terklasifikasi
    }

    // Jika klasifikasi default adalah 'Uncategorized', kita buat kategori baru
    // Kita buat nama kategori berdasarkan deskripsi transaksi (disederhanakan)
    let newCategoryName = description.trim().split(' ')[0]; 
    if (newCategoryName.length > 50) {
        newCategoryName = newCategoryName.substring(0, 50);
    }
    
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

// Fungsi classifyTransaction tetap sama, hanya untuk default yang hardcoded
function classifyTransaction(description) {
    if (description.toLowerCase().includes("mcdonalds") || description.toLowerCase().includes("starbucks")) return "Food";
    if (description.toLowerCase().includes("grab") || description.toLowerCase().includes("gojek")) return "Transportation";
    return "Uncategorized"; // Jika tidak cocok, kirim sinyal untuk dibuat kategori baru
}
// ...

module.exports = { ingestNewTransaction, classifyTransaction, findOrCreateCategory }; // Export fungsi baru