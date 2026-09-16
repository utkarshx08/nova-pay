const { query } = require("../db");

function getApiKey() {
  const rawKey = process.env.AI_API_KEY || "";
  return rawKey.trim().replace(/^["']|["']$/g, "");
}

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

function generateServerFallback(message, context, symbol) {
  const msg = message.toLowerCase().trim();
  const userName = context.user?.name || "there";
  const accounts = context.accounts || [];
  const txs = context.recentTransactions || [];
  const budgets = context.budgets || [];
  const goals = context.goals || [];

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
  const totalExpenses = txs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // Greetings
  if (/^(hi|hello|hey|greetings|hola|good\s*(morning|afternoon|evening))/i.test(msg)) {
    return `Hi ${userName} 👋!\n\nI'm Nova AI, your financial assistant. Currently analyzing your ${accounts.length} account(s) with a total balance of ${symbol}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.\n\nHow can I help you with your budget or expenses today?`;
  }

  // Balance query
  if (/balance|how much (money|do i have)|account/i.test(msg)) {
    let reply = `Your total account balance is **${symbol}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}** across ${accounts.length} account(s):\n`;
    accounts.forEach((a) => {
      reply += `- ${a.name} (${a.account_type}): ${symbol}${parseFloat(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`;
    });
    return reply;
  }

  // Spend / Expense query
  if (/spend|spent|expense|outgoings|cost/i.test(msg)) {
    let reply = `Your recent recorded expenses total **${symbol}${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}**.\n`;
    if (txs.length > 0) {
      reply += "\nRecent transactions:\n";
      txs.slice(0, 5).forEach((t) => {
        reply += `- ${t.title} (${t.category}): ${symbol}${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} on ${t.date}\n`;
      });
    }
    return reply;
  }

  // Budget query
  if (/budget|limit/i.test(msg)) {
    if (budgets.length === 0) {
      return `You currently have no active budget caps set. Total spent recently is ${symbol}${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`;
    }
    let reply = `Here is your current budget status:\n`;
    budgets.forEach((b) => {
      const remaining = parseFloat(b.amount) - parseFloat(b.spent);
      reply += `- **${b.category}**: Spent ${symbol}${parseFloat(b.spent).toLocaleString()} of ${symbol}${parseFloat(b.amount).toLocaleString()} (${remaining >= 0 ? symbol + remaining.toLocaleString() + ' remaining' : 'Over budget!'})\n`;
    });
    return reply;
  }

  // Goals query
  if (/goal|save|savings/i.test(msg)) {
    if (goals.length === 0) {
      return `You don't have any specific financial goals created yet. Total balance is ${symbol}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`;
    }
    let reply = `Here are your current savings goals:\n`;
    goals.forEach((g) => {
      const target = parseFloat(g.target_amount || 0);
      const current = parseFloat(g.current_amount || 0);
      const pct = target > 0 ? Math.round((current / target) * 100) : 0;
      reply += `- **${g.name}**: ${symbol}${current.toLocaleString()} / ${symbol}${target.toLocaleString()} (${pct}% complete)\n`;
    });
    return reply;
  }

  // Affordability query
  const numMatch = msg.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
  if (/afford|buy|purchase/i.test(msg) && numMatch) {
    const cost = parseFloat(numMatch[1].replace(/,/g, ""));
    if (cost > 0) {
      if (totalBalance >= cost) {
        const remaining = totalBalance - cost;
        return `Yes, based on your current total balance of ${symbol}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}, you can afford this ${symbol}${cost.toLocaleString()} purchase. Remaining balance will be ${symbol}${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`;
      } else {
        const shortfall = cost - totalBalance;
        return `This ${symbol}${cost.toLocaleString()} purchase exceeds your total account balance (${symbol}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}) by ${symbol}${shortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`;
      }
    }
  }

  // General intelligent fallback for custom messages using live user numbers
  return `Regarding "${message}":\n\nBased on your live account data:\n- Account Balance: ${symbol}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n- Recent Expenses Total: ${symbol}${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n- Active Budgets: ${budgets.length}\n- Active Goals: ${goals.length}\n\nHow can I help you manage your budget or transactions further?`;
}

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

  const symbol = getSymbol(req.user.currency);
  const apiKey = getApiKey();
  const aiModel = process.env.AI_MODEL || "gpt-4o-mini";
  const aiApiUrl = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";

  const rawHistory = sanitizeMessages(req.body?.messages);
  // Deduplicate user message if it's already the last element in history
  const history = (rawHistory.length > 0 && rawHistory[rawHistory.length - 1].role === "user" && rawHistory[rawHistory.length - 1].content === message)
    ? rawHistory.slice(0, -1)
    : rawHistory;

  let replyText = "";

  if (!apiKey) {
    replyText = generateServerFallback(message, context, symbol);
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const body = {
        model: aiModel,
        temperature: 0.25,
        messages: [
          { role: "system", content: buildSystemPrompt(context, req.user.name) },
          ...history,
          { role: "user", content: message }
        ]
      };

      const response = await fetch(aiApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        replyText = generateServerFallback(message, context, symbol);
      } else {
        const data = await response.json();
        replyText = data?.choices?.[0]?.message?.content?.trim() || generateServerFallback(message, context, symbol);
      }
    } catch (err) {
      replyText = generateServerFallback(message, context, symbol);
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
