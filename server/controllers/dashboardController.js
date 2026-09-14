const { query } = require("../db");

async function getDashboardData(req, res) {
  try {
    const userId = req.user.id;

    // Accounts
    const accounts = await query(
      "SELECT id, name, account_type, balance, currency FROM accounts WHERE user_id = ? ORDER BY id ASC",
      [userId]
    );

    // Calculate total balance from user's accounts
    let totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

    // Transactions
    const transactions = await query(
      "SELECT id, type, title, category, amount, description, DATE_FORMAT(transaction_date, '%Y-%m-%d') as transaction_date FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 20",
      [userId]
    );

    // Income and Expense totals
    const incomeTotalResult = await query(
      "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'income'",
      [userId]
    );
    const expenseTotalResult = await query(
      "SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense'",
      [userId]
    );

    const totalIncome = parseFloat(incomeTotalResult[0]?.total || 0);
    const totalExpenses = parseFloat(expenseTotalResult[0]?.total || 0);

    // Cards
    const cards = await query(
      "SELECT id, card_name, last_four, card_type, credit_limit, available_limit, expiry_month, expiry_year FROM cards WHERE user_id = ? ORDER BY id ASC",
      [userId]
    );

    // Budgets
    const budgets = await query(
      "SELECT id, category, amount, spent, month, year FROM budgets WHERE user_id = ? ORDER BY id ASC",
      [userId]
    );

    // Goals
    const goals = await query(
      "SELECT id, name, target_amount, current_amount, DATE_FORMAT(deadline, '%Y-%m-%d') as deadline FROM goals WHERE user_id = ? ORDER BY id ASC",
      [userId]
    );

    // Payments
    const payments = await query(
      "SELECT id, title, amount, category, status, DATE_FORMAT(payment_date, '%Y-%m-%d') as payment_date FROM payments WHERE user_id = ? ORDER BY payment_date ASC",
      [userId]
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
          currency: req.user.currency || "INR"
        },
        balance: totalBalance,
        totalIncome,
        totalExpenses,
        accounts,
        transactions,
        cards,
        budgets,
        goals,
        payments
      }
    });
  } catch (error) {
    console.error("Dashboard Controller Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load dashboard data." });
  }
}

module.exports = {
  getDashboardData
};
