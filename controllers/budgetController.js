const { setMonthlyBudget, getMonthlyBudgetSettings } = require('../services/budgetService');

async function setBudget(req, res) {
    const userId = req.params.userId;
    const { budgets } = req.body; // budgets: [{category: "Food", limit: 300000}, ...]

    if (!Array.isArray(budgets) || budgets.length === 0) {
        return res.status(400).json({ error: "Budget data must be an array and cannot be empty." });
    }

    try {
        const result = await setMonthlyBudget(userId, budgets);
        res.status(201).json({ message: "Monthly budgets successfully set.", data: result });
    } catch (error) {
        console.error("Error setting budget:", error.message);
        res.status(500).json({ error: "Failed to set monthly budget." });
    }
}

async function getBudgetSettings(req, res) {
    const userId = req.params.userId;

    try {
        const settings = await getMonthlyBudgetSettings(userId);
        if (settings.length === 0) {
            return res.status(200).json({ message: "No budget settings found for the current month.", settings: [] });
        }
        res.status(200).json({ settings });
    } catch (error) {
        console.error("Error fetching budget settings:", error.message);
        res.status(500).json({ error: "Failed to fetch budget settings." });
    }
}

module.exports = { setBudget, getBudgetSettings };