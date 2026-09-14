const { query } = require("../db");

async function getGoals(req, res) {
  try {
    const userId = req.user.id;
    const goals = await query(
      "SELECT id, name, target_amount, current_amount, DATE_FORMAT(deadline, '%Y-%m-%d') as deadline, created_at FROM goals WHERE user_id = ? ORDER BY id ASC",
      [userId]
    );

    return res.json({ success: true, data: goals });
  } catch (error) {
    console.error("Get Goals Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch goals." });
  }
}

async function createGoal(req, res) {
  try {
    const userId = req.user.id;
    const { name, target_amount, current_amount, deadline } = req.body || {};

    const nameVal = (name || "").trim();
    const targetVal = parseFloat(target_amount) || 0;
    const currentVal = parseFloat(current_amount) || 0;
    const deadlineVal = deadline || null;

    if (!nameVal || targetVal <= 0) {
      return res.status(400).json({ success: false, message: "Goal name and target amount are required." });
    }

    const result = await query(
      "INSERT INTO goals (user_id, name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?)",
      [userId, nameVal, targetVal, currentVal, deadlineVal]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        user_id: userId,
        name: nameVal,
        target_amount: targetVal,
        current_amount: currentVal,
        deadline: deadlineVal
      }
    });
  } catch (error) {
    console.error("Create Goal Error:", error);
    return res.status(500).json({ success: false, message: "Failed to create goal." });
  }
}

async function updateGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;
    const { name, target_amount, current_amount, deadline } = req.body || {};

    const existing = await query("SELECT * FROM goals WHERE id = ? AND user_id = ?", [goalId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    const nameVal = name !== undefined ? name.trim() : existing[0].name;
    const targetVal = target_amount !== undefined ? parseFloat(target_amount) : existing[0].target_amount;
    const currentVal = current_amount !== undefined ? parseFloat(current_amount) : existing[0].current_amount;
    const deadlineVal = deadline !== undefined ? deadline : existing[0].deadline;

    await query(
      "UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ? WHERE id = ? AND user_id = ?",
      [nameVal, targetVal, currentVal, deadlineVal, goalId, userId]
    );

    return res.json({ success: true, message: "Goal updated successfully." });
  } catch (error) {
    console.error("Update Goal Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update goal." });
  }
}

async function deleteGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;

    const result = await query("DELETE FROM goals WHERE id = ? AND user_id = ?", [goalId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Goal not found." });
    }

    return res.json({ success: true, message: "Goal deleted successfully." });
  } catch (error) {
    console.error("Delete Goal Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete goal." });
  }
}

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal
};
