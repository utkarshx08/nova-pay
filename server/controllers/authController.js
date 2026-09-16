const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");
const { validateEmail, validatePassword, normalizeEmail, sanitizeText } = require("../utils/validation");

const JWT_SECRET = process.env.JWT_SECRET || "novapay_super_secret_jwt_key_2026_production_secret";

function COOKIE_OPTIONS() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};
    const trimmedName = sanitizeText(name);
    const cleanEmail = normalizeEmail(email);

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: "Full Name is required." });
    }
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    // Check if user already exists
    const existingUsers = await query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Initial initials for avatar
    const initials = trimmedName
      .split(" ")
      .map(n => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "NP";

    // Insert user into MySQL
    const result = await query(
      "INSERT INTO users (name, email, password_hash, avatar, currency) VALUES (?, ?, ?, ?, 'INR')",
      [trimmedName, cleanEmail, password_hash, initials]
    );

    const userId = result.insertId;

    // Seed initial default financial data for newly registered user so they start with a clean zeroed template
    await query(
      "INSERT INTO accounts (user_id, name, account_type, balance, currency) VALUES (?, 'Primary Checking', 'Checking', 0.00, 'INR')",
      [userId]
    );
    await query(
      "INSERT INTO cards (user_id, card_name, last_four, card_type, credit_limit, available_limit, expiry_month, expiry_year) VALUES (?, 'Primary Debit Card', '4832', 'Visa', 0.00, 0.00, '12', '2030')",
      [userId]
    );
    await query(
      "INSERT INTO budgets (user_id, category, amount, spent, month, year) VALUES (?, 'Monthly Overall', 0.00, 0.00, ?, ?)",
      [userId, new Date().getMonth() + 1, new Date().getFullYear()]
    );

    // Issue JWT token
    const token = jwt.sign({ id: userId, email: cleanEmail }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("novapay_token", token, COOKIE_OPTIONS());

    return res.status(201).json({
      success: true,
      user: {
        id: userId,
        name: trimmedName,
        email: cleanEmail,
        avatar: initials,
        currency: "INR"
      }
    });
  } catch (error) {
    console.error("Register Error:", error);
    let errorMsg = "Server error during registration.";
    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      errorMsg = "MySQL Access Denied: Invalid MYSQL_PASSWORD in .env";
    } else if (error.code === "ECONNREFUSED") {
      errorMsg = "MySQL Server Error: Cannot connect to MySQL on localhost:3306";
    } else if (error.message) {
      errorMsg = error.message;
    }
    return res.status(500).json({ success: false, message: errorMsg });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const users = await query("SELECT * FROM users WHERE email = ?", [cleanEmail]);

    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("novapay_token", token, COOKIE_OPTIONS());

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        currency: user.currency || "INR"
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    let errorMsg = "Server error during login.";
    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      errorMsg = "MySQL Access Denied: Invalid MYSQL_PASSWORD in .env";
    } else if (error.code === "ECONNREFUSED") {
      errorMsg = "MySQL Server Error: Cannot connect to MySQL on localhost:3306";
    }
    return res.status(500).json({ success: false, message: errorMsg });
  }
}

async function logout(req, res) {
  res.clearCookie("novapay_token", { httpOnly: true, secure: false, sameSite: "strict" });
  return res.json({ success: true, message: "Logged out successfully." });
}

async function me(req, res) {
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      currency: req.user.currency || "INR"
    }
  });
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required." });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }

    const users = await query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id]);

    return res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ success: false, message: "Failed to change password." });
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  changePassword
};
