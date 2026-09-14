const { query } = require("../db");

async function getCards(req, res) {
  try {
    const userId = req.user.id;
    const cards = await query(
      "SELECT id, card_name, last_four, card_type, credit_limit, available_limit, expiry_month, expiry_year, created_at FROM cards WHERE user_id = ? ORDER BY id ASC",
      [userId]
    );

    return res.json({ success: true, data: cards });
  } catch (error) {
    console.error("Get Cards Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch cards." });
  }
}

async function createCard(req, res) {
  try {
    const userId = req.user.id;
    const { card_name, last_four, card_number, card_type, credit_limit, available_limit, expiry_month, expiry_year } = req.body || {};

    const nameVal = (card_name || "Payment Card").trim();
    // Extract last 4 digits safely
    let last4 = (last_four || "").toString().trim();
    if (!last4 && card_number) {
      const cleanNum = card_number.replace(/\D/g, "");
      last4 = cleanNum.slice(-4);
    }
    if (!last4 || last4.length !== 4) {
      last4 = "4832";
    }

    const typeVal = (card_type || "Visa").trim();
    const limitVal = parseFloat(credit_limit) || 50000;
    const availVal = available_limit !== undefined ? parseFloat(available_limit) : limitVal;
    const expM = (expiry_month || "12").toString().padStart(2, "0");
    const expY = (expiry_year || "2029").toString();

    const result = await query(
      "INSERT INTO cards (user_id, card_name, last_four, card_type, credit_limit, available_limit, expiry_month, expiry_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, nameVal, last4, typeVal, limitVal, availVal, expM, expY]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        user_id: userId,
        card_name: nameVal,
        last_four: last4,
        card_type: typeVal,
        credit_limit: limitVal,
        available_limit: availVal,
        expiry_month: expM,
        expiry_year: expY
      }
    });
  } catch (error) {
    console.error("Create Card Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create card." });
  }
}

async function updateCard(req, res) {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;
    const { card_name, credit_limit, available_limit, expiry_month, expiry_year } = req.body || {};

    const existing = await query("SELECT * FROM cards WHERE id = ? AND user_id = ?", [cardId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Card not found." });
    }

    const nameVal = card_name !== undefined ? card_name.trim() : existing[0].card_name;
    const limitVal = credit_limit !== undefined ? parseFloat(credit_limit) : existing[0].credit_limit;
    const availVal = available_limit !== undefined ? parseFloat(available_limit) : existing[0].available_limit;
    const expM = expiry_month !== undefined ? expiry_month.toString().padStart(2, "0") : existing[0].expiry_month;
    const expY = expiry_year !== undefined ? expiry_year.toString() : existing[0].expiry_year;

    await query(
      "UPDATE cards SET card_name = ?, credit_limit = ?, available_limit = ?, expiry_month = ?, expiry_year = ? WHERE id = ? AND user_id = ?",
      [nameVal, limitVal, availVal, expM, expY, cardId, userId]
    );

    return res.json({ success: true, message: "Card updated successfully." });
  } catch (error) {
    console.error("Update Card Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update card." });
  }
}

async function deleteCard(req, res) {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;

    const result = await query("DELETE FROM cards WHERE id = ? AND user_id = ?", [cardId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Card not found." });
    }

    return res.json({ success: true, message: "Card deleted successfully." });
  } catch (error) {
    console.error("Delete Card Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete card." });
  }
}

module.exports = {
  getCards,
  createCard,
  updateCard,
  deleteCard
};
