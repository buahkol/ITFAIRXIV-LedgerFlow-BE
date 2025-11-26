const dbConnection = require('../config/database');
const axios = require('axios'); 

// URL Layanan AI FastAPI (Port 8000)
const AI_SERVICE_URL = 'http://localhost:8000/calculate-score';


// Helper untuk tanggal
function getMonthRange() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    
    const format = (dateObj) => dateObj.toISOString().slice(0, 19).replace('T', ' ');
    
    return {
        start: format(startOfMonth),
        end: format(endOfMonth)
    };
}

async function setMonthlyBudget(userId, budgets) {
    const { start, end } = getMonthRange();
    let connection;
    try {
        connection = await dbConnection.getConnection();
        await connection.beginTransaction();

        // 1. Hapus budget lama bulan ini (atau UPDATE) - Kita pakai UPSERT sederhana
        const deleteSql = `
            DELETE FROM BudgetSettings 
            WHERE user_id = ? 
              AND start_date >= ? 
              AND end_date <= ?;
        `;
        await connection.execute(deleteSql, [userId, start, end]);

        // 2. Insert budget baru
        const insertSql = `
            INSERT INTO BudgetSettings (user_id, category, limit_amount, start_date, end_date)
            VALUES (?, ?, ?, ?, ?);
        `;
        const insertedBudgets = [];
        
        for (const budget of budgets) {
            // Pastikan limit dikonversi menjadi float string untuk DB
            const limitValue = parseFloat(budget.limit).toFixed(2); 

            const params = [userId, budget.category, limitValue, start, end];
            await connection.execute(insertSql, params);
            insertedBudgets.push(budget.category);
        }

        await connection.commit();
        return { count: insertedBudgets.length, categories: insertedBudgets };

    } catch (error) {
        if (connection) await connection.rollback();
        throw new Error(`Database error while setting budget: ${error.message}`);
    } finally {
        if (connection) connection.release();
    }
}

async function getMonthlyBudgetSettings(userId) {
    const { start, end } = getMonthRange();

    const sql = `
        SELECT 
            category, 
            limit_amount 
        FROM BudgetSettings 
        WHERE user_id = ? 
          AND start_date >= ? 
          AND end_date <= ?;
    `;
    const [results] = await dbConnection.execute(sql, [userId, start, end]);
    return results;
}


// FUNGSI UTAMA UNTUK MENGAMBIL DATA MENTAH
async function getRawTransactionsAndBalance(userId) {
    // 1. Ambil semua transaksi pengguna (diperlukan untuk analisis LLM)
    const transactionsSql = `
        SELECT 
            TL.original_date,
            TU.category,
            TL.original_amount,
            CASE WHEN TL.original_amount < 0 THEN 'debit' ELSE 'credit' END AS type
        FROM Transactions_User TU
        JOIN Transactions_Ledger TL ON TU.ledger_id = TL.ledger_id
        WHERE TU.user_id = ?
        ORDER BY TL.original_date ASC;
    `;
    
    // 2. Ambil total saldo saat ini
    const balanceSql = `
        SELECT SUM(current_balance) AS total_balance
        FROM FinancialAccounts
        WHERE user_id = ?;
    `;

    const [transactionsResults] = await dbConnection.execute(transactionsSql, [userId]);
    const [balanceResults] = await dbConnection.execute(balanceSql, [userId]);

    const currentBalance = balanceResults[0].total_balance ? parseFloat(balanceResults[0].total_balance) : 0.00;

    const formattedTransactions = transactionsResults
        // Filter: Hanya proses transaksi yang memiliki amount valid dan bukan NaN/Null
        .filter(tx => tx.original_amount != null && !isNaN(tx.original_amount))
        .map(tx => {
            const dateObj = tx.original_date;

            // Pastikan format tanggal adalah YYYY-MM-DD
            const dateString = (dateObj instanceof Date) 
                ? dateObj.toISOString().slice(0, 10) 
                : String(dateObj).slice(0, 10); // Jika string, potong untuk keamanan

            return {
                date: dateString, 
                category: tx.category,
                // WAJIB: Konversi ke NUMBER primitive JavaScript (bukan string)
                amount: Number(tx.original_amount), 
                type: (tx.original_amount < 0) ? 'debit' : 'credit' 
            };
        });
    
    return { transactions: formattedTransactions, currentBalance: currentBalance };
}


async function getBudgetUtilization(userId) {
    // ... (Fungsi ini tetap sama untuk menghitung Utilization Dashboard)
    const { start, end } = getMonthRange();

    const [settings, spentResults] = await Promise.all([
        getMonthlyBudgetSettings(userId),
        // Query untuk mengambil spent
        dbConnection.execute(`
            SELECT 
                TU.category,
                ABS(SUM(TL.original_amount)) AS total_spent
            FROM Transactions_User TU
            JOIN Transactions_Ledger TL ON TU.ledger_id = TL.ledger_id
            WHERE TU.user_id = ?
              AND TL.original_amount < 0 
              AND TL.original_date >= ?
              AND TL.original_date <= ?
            GROUP BY TU.category;
        `, [userId, start, end])
    ]);
    
    const spentMap = spentResults[0].reduce((map, item) => {
        map[item.category] = parseFloat(item.total_spent);
        return map;
    }, {});

    const utilization = settings.map(setting => {
        const limit = parseFloat(setting.limit_amount);
        const spent = spentMap[setting.category] || 0.00;
        const utilizedPercent = (spent / limit) * 100;

        return {
            category: setting.category,
            limit: limit.toFixed(2),
            spent: spent.toFixed(2),
            left: (limit - spent).toFixed(2),
            utilization_percent: Math.min(utilizedPercent, 100).toFixed(2),
            status: utilizedPercent > 100 ? 'Overbudget' : (utilizedPercent > 80 ? 'On Track' : 'Optimal')
        };
    });

    return utilization;
}


async function getFinanceHealthScore(userId) {
    // 1. Ambil data mentah dari DB
    const { transactions, currentBalance } = await getRawTransactionsAndBalance(userId);

    if (transactions.length === 0) {
        return { 
            financial_score: 50, 
            days_to_zero: 999, 
            advice: "No transaction data found. Please ensure your accounts are linked to start AI analysis." 
        };
    }
    
    try {
        // 2. Panggil Layanan AI FastAPI
        const response = await axios.post(AI_SERVICE_URL, {
            transactions: transactions,
            current_balance: currentBalance
        });

        // Response dari FastAPI sudah berupa JSON yang sesuai dengan skema FinancialAnalysisResult
        const result = response.data;

        // 3. Masukkan data utilization dari logika lama (penting untuk dashboard)
        const utilizationData = await getBudgetUtilization(userId);
        
        // 4. Gabungkan dan kembalikan hasil AI
        return {
            financial_score: result.financial_score,
            days_to_zero: result.days_to_zero,
            advice: result.advice,
            monthly_spending_shifts: result.monthly_spending_shifts,
            utilization: utilizationData 
        };

    } catch (error) {
        // Log error asli (untuk debugging)
        console.error("Failed to connect to AI Service (FastAPI) or AI call failed:", error.message);
        
        // Fallback: Kembalikan pesan kegagalan
        return { 
            financial_score: 50, 
            days_to_zero: 999, 
            advice: "AI Service is temporarily unavailable. Displaying default health information." 
        };
    }
}

// services/budgetService.js (Tambahkan di bagian paling bawah)

async function testAIService(userId) {
    const cleanTransaction = [{
        date: "2025-11-26",
        category: "Test",
        amount: 100.00, // FLOAT SEDERHANA
        type: "credit"
    }];
    
    try {
        const response = await axios.post(AI_SERVICE_URL, {
            transactions: cleanTransaction,
            current_balance: 5000000.00
        });
        return { success: true, status: response.status, data: response.data };
    } catch (error) {
        console.error("TEST FAILED:", error.message);
        return { success: false, status: error.response ? error.response.status : 'N/A', error: error.message };
    }
}


module.exports = { 
    setMonthlyBudget, 
    getMonthlyBudgetSettings, 
    getBudgetUtilization, 
    getFinanceHealthScore,
    testAIService 
};