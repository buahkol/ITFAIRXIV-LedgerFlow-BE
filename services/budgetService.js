const dbConnection = require('../config/database');
const { getMonthlyBudgetSummary } = require('../controllers/analyticsController');

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
            const params = [userId, budget.category, budget.limit, start, end];
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

async function getBudgetUtilization(userId) {
    const [settings, spentResults] = await Promise.all([
        getMonthlyBudgetSettings(userId),
        // Kita perlu memanggil fungsi query summary secara langsung
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
        `, [userId, getMonthRange().start, getMonthRange().end])
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
    const utilizationData = await getBudgetUtilization(userId);
    
    if (utilizationData.length === 0) {
        return { score: 50, status: "Warning", message: "Budget not set. Health score is estimated.", utilization: [] };
    }

    // Hitung rata-rata kepatuhan: (jumlah kategori di bawah 100% / total kategori)
    const totalCategories = utilizationData.length;
    const compliantCategories = utilizationData.filter(item => parseFloat(item.utilization_percent) <= 100).length;
    
    // Hitung skor kepatuhan (bobot 70%)
    const complianceRatio = compliantCategories / totalCategories;
    let score = 50 + (complianceRatio * 50); // Base score 50, max 100

    // Logika AI-Powered Analysis Sederhana (sesuaikan dengan kebutuhan bisnis)
    let status = 'Optimal';
    let message = 'Your spending habits align perfectly with your budget goals.';
    
    if (complianceRatio < 0.75) {
        status = 'On Track';
        message = 'Most categories are stable, but a few are nearing the limit. Stay cautious!';
    }
    if (complianceRatio < 0.5) {
        status = 'Overbudget';
        message = 'Critical alert! Multiple categories exceeded the budget. Review your spending immediately.';
    }

    return { 
        score: Math.round(score), 
        status: status, 
        message: message,
        utilization: utilizationData 
    };
}

module.exports = { setMonthlyBudget, getMonthlyBudgetSettings, getBudgetUtilization, getFinanceHealthScore };