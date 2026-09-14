const { query } = require("../db");

async function getAccounts(req, res) {
  try {
    const userId = req.user.id;
    const accounts = await query(
      "SELECT id, name, account_type, balance, currency, created_at FROM accounts WHERE user_id = ? ORDER BY id ASC",
      [userId]
    );

    return res.json({ success: true, data: accounts });
  } catch (error) {
    console.error("Get Accounts Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch accounts." });
  }
}

async function createAccount(req, res) {
  try {
    const userId = req.user.id;
    const { name, account_type, balance, currency } = req.body || {};

    const cleanName = (name || "").trim();
    const cleanType = (account_type || "Checking").trim();
    const parsedBalance = parseFloat(balance) || 0;
    const cleanCurrency = (currency || "INR").trim();

    if (!cleanName) {
      return res.status(400).json({ success: false, message: "Account name is required." });
    }

    const result = await query(
      "INSERT INTO accounts (user_id, name, account_type, balance, currency) VALUES (?, ?, ?, ?, ?)",
      [userId, cleanName, cleanType, parsedBalance, cleanCurrency]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        user_id: userId,
        name: cleanName,
        account_type: cleanType,
        balance: parsedBalance,
        currency: cleanCurrency
      }
    });
  } catch (error) {
    console.error("Create Account Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create account." });
  }
}

async function updateAccount(req, res) {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;
    const { name, account_type, balance, currency } = req.body || {};

    const existing = await query("SELECT * FROM accounts WHERE id = ? AND user_id = ?", [accountId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    const cleanName = name !== undefined ? name.trim() : existing[0].name;
    const cleanType = account_type !== undefined ? account_type.trim() : existing[0].account_type;
    const parsedBalance = balance !== undefined ? parseFloat(balance) : existing[0].balance;
    const cleanCurrency = currency !== undefined ? currency.trim() : existing[0].currency;

    await query(
      "UPDATE accounts SET name = ?, account_type = ?, balance = ?, currency = ? WHERE id = ? AND user_id = ?",
      [cleanName, cleanType, parsedBalance, cleanCurrency, accountId, userId]
    );

    return res.json({ success: true, message: "Account updated successfully." });
  } catch (error) {
    console.error("Update Account Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update account." });
  }
}

async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    const result = await query("DELETE FROM accounts WHERE id = ? AND user_id = ?", [accountId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    return res.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete account." });
  }
}

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount
};
