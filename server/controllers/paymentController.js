const { query } = require("../db");

async function getPayments(req, res) {
  try {
    const userId = req.user.id;
    const payments = await query(
      "SELECT id, title, amount, category, status, DATE_FORMAT(payment_date, '%Y-%m-%d') as payment_date, created_at FROM payments WHERE user_id = ? ORDER BY payment_date ASC",
      [userId]
    );

    return res.json({ success: true, data: payments });
  } catch (error) {
    console.error("Get Payments Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payments." });
  }
}

async function createPayment(req, res) {
  try {
    const userId = req.user.id;
    const { title, amount, category, status, payment_date } = req.body || {};

    const titleVal = (title || "").trim();
    const amountVal = parseFloat(amount) || 0;
    const catVal = (category || "Bills").trim();
    const statusVal = status || "pending";
    const dateVal = payment_date || new Date().toISOString().split("T")[0];

    if (!titleVal || amountVal <= 0) {
      return res.status(400).json({ success: false, message: "Payment title and amount are required." });
    }

    const result = await query(
      "INSERT INTO payments (user_id, title, amount, category, status, payment_date) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, titleVal, amountVal, catVal, statusVal, dateVal]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        user_id: userId,
        title: titleVal,
        amount: amountVal,
        category: catVal,
        status: statusVal,
        payment_date: dateVal
      }
    });
  } catch (error) {
    console.error("Create Payment Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create payment." });
  }
}

async function updatePayment(req, res) {
  try {
    const userId = req.user.id;
    const paymentId = req.params.id;
    const { title, amount, category, status, payment_date } = req.body || {};

    const existing = await query("SELECT * FROM payments WHERE id = ? AND user_id = ?", [paymentId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    const titleVal = title !== undefined ? title.trim() : existing[0].title;
    const amountVal = amount !== undefined ? parseFloat(amount) : existing[0].amount;
    const catVal = category !== undefined ? category.trim() : existing[0].category;
    const statusVal = status !== undefined ? status : existing[0].status;
    const dateVal = payment_date !== undefined ? payment_date : existing[0].payment_date;

    await query(
      "UPDATE payments SET title = ?, amount = ?, category = ?, status = ?, payment_date = ? WHERE id = ? AND user_id = ?",
      [titleVal, amountVal, catVal, statusVal, dateVal, paymentId, userId]
    );

    return res.json({ success: true, message: "Payment updated successfully." });
  } catch (error) {
    console.error("Update Payment Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update payment." });
  }
}

async function deletePayment(req, res) {
  try {
    const userId = req.user.id;
    const paymentId = req.params.id;

    const result = await query("DELETE FROM payments WHERE id = ? AND user_id = ?", [paymentId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    return res.json({ success: true, message: "Payment deleted successfully." });
  } catch (error) {
    console.error("Delete Payment Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete payment." });
  }
}

module.exports = {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment
};
