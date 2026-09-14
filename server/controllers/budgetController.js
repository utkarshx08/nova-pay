const { query } = require("../db");

async function getBudgets(req, res) {
  try {
    const userId = req.user.id;
    const budgets = await query(
      "SELECT id, category, amount, spent, month, year, created_at FROM budgets WHERE user_id = ? ORDER BY id ASC",
      [userId]
    );

    return res.json({ success: true, data: budgets });
  } catch (error) {
    console.error("Get Budgets Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch budgets." });
  }
}

async function createBudget(req, res) {
  try {
    const userId = req.user.id;
    const { category, amount, spent, month, year } = req.body || {};

    const catVal = (category || "Monthly Overall").trim();
    const amountVal = parseFloat(amount) || 0;
    const spentVal = parseFloat(spent) || 0;
    const monthVal = parseInt(month) || (new Date().getMonth() + 1);
    const yearVal = parseInt(year) || new Date().getFullYear();

    if (amountVal <= 0) {
      return res.status(400).json({ success: false, message: "Budget amount must be greater than zero." });
    }

    const result = await query(
      "INSERT INTO budgets (user_id, category, amount, spent, month, year) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, catVal, amountVal, spentVal, monthVal, yearVal]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        user_id: userId,
        category: catVal,
        amount: amountVal,
        spent: spentVal,
        month: monthVal,
        year: yearVal
      }
    });
  } catch (error) {
    console.error("Create Budget Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create budget." });
  }
}

async function updateBudget(req, res) {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;
    const { category, amount, spent, month, year } = req.body || {};

    const existing = await query("SELECT * FROM budgets WHERE id = ? AND user_id = ?", [budgetId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Budget not found." });
    }

    const catVal = category !== undefined ? category.trim() : existing[0].category;
    const amountVal = amount !== undefined ? parseFloat(amount) : existing[0].amount;
    const spentVal = spent !== undefined ? parseFloat(spent) : existing[0].spent;
    const monthVal = month !== undefined ? parseInt(month) : existing[0].month;
    const yearVal = year !== undefined ? parseInt(year) : existing[0].year;

    await query(
      "UPDATE budgets SET category = ?, amount = ?, spent = ?, month = ?, year = ? WHERE id = ? AND user_id = ?",
      [catVal, amountVal, spentVal, monthVal, yearVal, budgetId, userId]
    );

    return res.json({ success: true, message: "Budget updated successfully." });
  } catch (error) {
    console.error("Update Budget Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update budget." });
  }
}

async function deleteBudget(req, res) {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;

    const result = await query("DELETE FROM budgets WHERE id = ? AND user_id = ?", [budgetId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Budget not found." });
    }

    return res.json({ success: true, message: "Budget deleted successfully." });
  } catch (error) {
    console.error("Delete Budget Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete budget." });
  }
}

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
};
