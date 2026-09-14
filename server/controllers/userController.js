const { query } = require("../db");
const { validateEmail, normalizeEmail, sanitizeText } = require("../utils/validation");

async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, email, avatar, currency } = req.body || {};

    const cleanName = sanitizeText(name) || req.user.name;
    const cleanEmail = normalizeEmail(email) || req.user.email;
    const cleanAvatar = sanitizeText(avatar) || req.user.avatar;
    const cleanCurrency = sanitizeText(currency) || req.user.currency || "INR";

    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    if (cleanEmail !== req.user.email) {
      const existing = await query("SELECT id FROM users WHERE email = ? AND id != ?", [cleanEmail, userId]);
      if (existing && existing.length > 0) {
        return res.status(400).json({ success: false, message: "Email is already in use by another user." });
      }
    }

    await query(
      "UPDATE users SET name = ?, email = ?, avatar = ?, currency = ? WHERE id = ?",
      [cleanName, cleanEmail, cleanAvatar, cleanCurrency, userId]
    );

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        avatar: cleanAvatar,
        currency: cleanCurrency
      }
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update profile." });
  }
}

module.exports = {
  updateProfile
};
