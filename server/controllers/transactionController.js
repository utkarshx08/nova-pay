const { query } = require("../db");

async function getTransactions(req, res) {
  try {
    const userId = req.user.id;
    const transactions = await query(
      "SELECT id, type, title, category, amount, description, DATE_FORMAT(transaction_date, '%Y-%m-%d') as transaction_date, created_at FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC, id DESC",
      [userId]
    );

    return res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error("Get Transactions Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch transactions." });
  }
}

async function createTransaction(req, res) {
  try {
    const userId = req.user.id;
    const { type, title, category, amount, description, transaction_date } = req.body || {};

    const cleanType = type === "income" ? "income" : "expense";
    const cleanTitle = (title || "").trim();
    const cleanCategory = (category || "General").trim();
    const parsedAmount = Math.abs(parseFloat(amount) || 0);
    const dateVal = transaction_date || new Date().toISOString().split("T")[0];

    if (!cleanTitle || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Title and a valid positive amount are required." });
    }

    const result = await query(
      "INSERT INTO transactions (user_id, type, title, category, amount, description, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, cleanType, cleanTitle, cleanCategory, parsedAmount, description || "", dateVal]
    );

    // Automatically update primary checking account balance
    const accounts = await query("SELECT id, balance FROM accounts WHERE user_id = ? ORDER BY id ASC LIMIT 1", [userId]);
    if (accounts && accounts.length > 0) {
      const primaryAcc = accounts[0];
      const balanceChange = cleanType === "income" ? parsedAmount : -parsedAmount;
      const newBalance = parseFloat(primaryAcc.balance) + balanceChange;
      await query("UPDATE accounts SET balance = ? WHERE id = ? AND user_id = ?", [newBalance, primaryAcc.id, userId]);
    }

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        user_id: userId,
        type: cleanType,
        title: cleanTitle,
        category: cleanCategory,
        amount: parsedAmount,
        description,
        transaction_date: dateVal
      }
    });
  } catch (error) {
    console.error("Create Transaction Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create transaction." });
  }
}

async function updateTransaction(req, res) {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;
    const { type, title, category, amount, description, transaction_date } = req.body || {};

    const existing = await query("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [transactionId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const cleanType = type ? (type === "income" ? "income" : "expense") : existing[0].type;
    const cleanTitle = title ? title.trim() : existing[0].title;
    const cleanCategory = category ? category.trim() : existing[0].category;
    const parsedAmount = amount !== undefined ? Math.abs(parseFloat(amount) || 0) : existing[0].amount;
    const dateVal = transaction_date || existing[0].transaction_date;

    await query(
      "UPDATE transactions SET type = ?, title = ?, category = ?, amount = ?, description = ?, transaction_date = ? WHERE id = ? AND user_id = ?",
      [cleanType, cleanTitle, cleanCategory, parsedAmount, description !== undefined ? description : existing[0].description, dateVal, transactionId, userId]
    );

    return res.json({
      success: true,
      message: "Transaction updated successfully."
    });
  } catch (error) {
    console.error("Update Transaction Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update transaction." });
  }
}

async function deleteTransaction(req, res) {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const result = await query("DELETE FROM transactions WHERE id = ? AND user_id = ?", [transactionId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    return res.json({ success: true, message: "Transaction deleted successfully." });
  } catch (error) {
    console.error("Delete Transaction Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete transaction." });
  }
}

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
