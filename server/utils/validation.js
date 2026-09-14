function validateEmail(email) {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(normalized);
}

function validatePassword(password) {
  if (typeof password !== "string") return false;
  return password.length >= 6;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function sanitizeText(str) {
  return typeof str === "string" ? str.trim() : "";
}

module.exports = {
  validateEmail,
  validatePassword,
  normalizeEmail,
  sanitizeText
};
