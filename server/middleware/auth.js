const jwt = require("jsonwebtoken");
const { query } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "novapay_super_secret_jwt_key_2026_production_secret";

async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.novapay_token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in."
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid token. Please log in again."
      });
    }

    const users = await query("SELECT id, name, email, avatar, currency FROM users WHERE id = ?", [decoded.id]);

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists."
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication."
    });
  }
}

module.exports = {
  requireAuth
};
