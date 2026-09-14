const { query } = require("../db");

const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const AI_API_URL = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";

function buildSystemPrompt(context, userName) {
  return [
    `You are Nova AI, a helpful financial assistant for ${userName || "the user"}.`,
    "Use the provided financial context for calculations and financial guidance.",
    "Do not claim to be a bank and do not claim to execute real transactions.",
    "Do not provide guaranteed returns or unsafe financial claims.",
    "If asked about investing, clearly state the response is general educational information and not personalized financial advice.",
    "Keep answers clear, concise, and grounded in available numbers.",
    "User's real financial context (from MySQL database):",
    JSON.stringify(context || {}, null, 2)
  ].join("\n");
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((item) => item && (item.role === "user" || item.role === "assistant" || item.role === "ai") && typeof item.text === "string")
    .slice(-8)
    .map((item) => ({
      role: item.role === "ai" ? "assistant" : item.role,
      content: item.text.slice(0, 800)
    }));
}

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "CA$", AUD: "A$" };
function getSymbol(code) { return CURRENCY_SYMBOLS[code] || "₹"; }

async function handleNovaAIChat(req, res) {
  const userId = req.user.id;
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    return res.status(400).json({ error: "Message is required", code: "INVALID_MESSAGE" });
  }

  if (message.length > 400) {
    return res.status(400).json({ error: "Message too long", code: "MESSAGE_TOO_LONG" });
  }

  // Retrieve authenticated user's real financial context strictly from MySQL
  const userTransactions = await query(
    "SELECT type, title, category, amount, DATE_FORMAT(transaction_date, '%Y-%m-%d') as date FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC LIMIT 15",
    [userId]
  );
  const userAccounts = await query(
    "SELECT name, account_type, balance, currency FROM accounts WHERE user_id = ?",
    [userId]
  );
  const userBudgets = await query(
    "SELECT category, amount, spent FROM budgets WHERE user_id = ?",
    [userId]
  );
  const userGoals = await query(
    "SELECT name, target_amount, current_amount FROM goals WHERE user_id = ?",
    [userId]
  );

  const context = {
    user: { name: req.user.name, currency: req.user.currency || "INR" },
    accounts: userAccounts,
    recentTransactions: userTransactions,
    budgets: userBudgets,
    goals: userGoals
  };

  const history = sanitizeMessages(req.body?.messages);

  let replyText = "";
  const symbol = getSymbol(req.user.currency);

  if (!AI_API_KEY) {
    // If no API key configured, use local intelligent fallback grounded in user's real MySQL context
    const spentThisMonth = userTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const balanceTotal = userAccounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);

    replyText = `Based on your live account data:\n- Total Account Balance: ${symbol}${balanceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n- Recent Expenses Total: ${symbol}${spentThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n- Active Budgets: ${userBudgets.length}\n- Active Goals: ${userGoals.length}\n\nHow can I help you manage your budget further?`;
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const body = {
        model: AI_MODEL,
        temperature: 0.25,
        messages: [
          { role: "system", content: buildSystemPrompt(context, req.user.name) },
          ...history,
          { role: "user", content: message }
        ]
      };

      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const text = await response.text();
        replyText = `Local Assistant Mode: I noticed an upstream API response issue. However, your account total is ${req.user.currency || "₹"}${userAccounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0)}.`;
      } else {
        const data = await response.json();
        replyText = data?.choices?.[0]?.message?.content?.trim() || "No response generated.";
      }
    } catch (err) {
      replyText = `I am operating in secure offline assistant mode for your account. You currently have ${userTransactions.length} recorded transactions and ${userAccounts.length} accounts connected.`;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Save chat record in MySQL ai_chats table for this authenticated user
  try {
    await query("INSERT INTO ai_chats (user_id, message, response) VALUES (?, ?, ?)", [
      userId,
      message,
      replyText
    ]);
  } catch (err) {
    console.warn("Could not save ai_chat history:", err.message);
  }

  return res.json({ reply: replyText });
}

module.exports = {
  handleNovaAIChat
};
