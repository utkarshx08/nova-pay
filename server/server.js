const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs").promises;

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const ROOT_DIR = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);

const STATE_FILE = path.join(__dirname, "data.json");

const DEFAULT_STATE = {
  profiles: [
    {
      id: "utkarsh",
      name: "Utkarsh",
      avatar: "UT",
      balance: 13450,
      transactions: [
        { merchant: "Tech Superstore", date: "Sep 04, 2026", amount: -850, status: "Completed", icon: "✦" },
        { merchant: "Car Insurance Premium", date: "Sep 02, 2026", amount: -320, status: "Completed", icon: "◆" },
        { merchant: "Monthly Salary", date: "Sep 01, 2026", amount: 6500, status: "Completed", icon: "↗" },
        { merchant: "Organic Grocery Market", date: "Aug 29, 2026", amount: -165, status: "Completed", icon: "✦" },
        { merchant: "Freelance Client Payout", date: "Aug 26, 2026", amount: 1200, status: "Completed", icon: "↗" },
        { merchant: "Uber Transport Pass", date: "Aug 24, 2026", amount: -95, status: "Completed", icon: "◉" },
        { merchant: "Electric Bill Payment", date: "Aug 21, 2026", amount: -110, status: "Completed", icon: "ϟ" },
        { merchant: "Spotify Family Subscription", date: "Aug 18, 2026", amount: -18, "status": "Completed", icon: "⌁" },
        { merchant: "Italian Restaurant & Bistro", date: "Aug 15, 2026", amount: -142, status: "Completed", icon: "✦" },
        { merchant: "High-Speed Internet Bill", date: "Aug 12, 2026", amount: -75, status: "Completed", icon: "◌" },
        { merchant: "Gym Membership", date: "Aug 08, 2026", amount: -60, status: "Completed", icon: "◆" },
        { merchant: "Water Utility Bill", date: "Aug 05, 2026", amount: -45, status: "Completed", icon: "⌁" }
      ],
      activities: [
        ["Tech Superstore", "Card payment - Electronics", -850, "✦"],
        ["Car Insurance Premium", "Autopay executed", -320, "◆"],
        ["Monthly Salary", "Direct deposit received", 6500, "↗"],
        ["Organic Grocery Market", "Card payment", -165, "✦"],
        ["Freelance Client Payout", "Transfer received", 1200, "↗"],
        ["Electric Bill Payment", "Utility payment complete", -110, "ϟ"],
        ["High-Speed Internet Bill", "Autopay completed", -75, "◌"]
      ],
      payments: [
        ["Home Rent", "Sep 15", "$1,650"],
        ["Health Insurance Premium", "Sep 18", "$280"],
        ["Cloud Storage Annual", "Sep 22", "$120"],
        ["Electric Utility Bill", "Sep 28", "$95"],
        ["Car Loan EMI", "Oct 01", "$410"]
      ],
      monthlyBudget: 40000,
      savingsGoal: 25000,
      savingsCurrent: 16200,
      theme: "dark",
      settings: {
        notifications: true,
        weeklySummary: true,
        biometric: true
      },
      cards: [
        { name: "Primary Rewards", number: "4832", holder: "Utkarsh Tyagi", expiry: "08/29" },
        { name: "Virtual Shopping Card", number: "9011", holder: "Utkarsh Tyagi", expiry: "08/29" },
        { name: "Travel Elite Visa", number: "2744", holder: "Utkarsh Tyagi", expiry: "08/29" }
      ]
    },
    {
      id: "sarah-business",
      name: "Sarah Jenkins",
      avatar: "SJ",
      balance: 34820,
      transactions: [
        { merchant: "Enterprise Retainer Payout", date: "Sep 03, 2026", amount: 8500, status: "Completed", icon: "↗" },
        { merchant: "AWS Cloud Infrastructure", date: "Sep 01, 2026", amount: -640, status: "Completed", icon: "⚡" },
        { merchant: "Downtown Office Space Rent", date: "Aug 30, 2026", amount: -2800, status: "Completed", icon: "🏠" },
        { merchant: "Consulting Retainer Income", date: "Aug 25, 2026", amount: 4200, status: "Completed", icon: "↗" },
        { merchant: "Business Travel & Hotel", date: "Aug 20, 2026", amount: -1150, status: "Completed", icon: "✈" },
        { merchant: "Software Licenses & SaaS", date: "Aug 15, 2026", amount: -380, status: "Completed", icon: "💻" },
        { merchant: "Client Dinner & Catering", date: "Aug 10, 2026", amount: -290, status: "Completed", icon: "🍷" }
      ],
      activities: [
        ["Enterprise Retainer Payout", "Wire transfer received", 8500, "↗"],
        ["AWS Cloud Infrastructure", "Monthly recurring bill", -640, "⚡"],
        ["Downtown Office Space Rent", "Lease payment", -2800, "🏠"],
        ["Consulting Retainer Income", "Payment received", 4200, "↗"],
        ["Business Travel & Hotel", "Expense reimbursement", -1150, "✈"]
      ],
      payments: [
        ["Payroll & Team Stipends", "Sep 15", "$4,500"],
        ["Accounting & Tax Service", "Sep 20", "$850"],
        ["Marketing Agency Retainer", "Sep 25", "$1,200"]
      ],
      monthlyBudget: 60000,
      savingsGoal: 50000,
      savingsCurrent: 32500,
      theme: "dark",
      settings: {
        notifications: true,
        weeklySummary: true,
        biometric: false
      },
      cards: [
        { name: "Corporate Platinum", number: "6109", holder: "Sarah Jenkins", expiry: "11/28" },
        { name: "Business Operations Card", number: "3341", holder: "Sarah Jenkins", expiry: "04/30" }
      ]
    },
    {
      id: "alex-chen",
      name: "Alex Chen",
      avatar: "AC",
      balance: 6240,
      transactions: [
        { merchant: "Part-Time AI Lab Stipend", date: "Sep 02, 2026", amount: 1800, status: "Completed", icon: "↗" },
        { merchant: "Campus Bookstore", date: "Aug 31, 2026", amount: -210, status: "Completed", icon: "📚" },
        { merchant: "City Metro Rail Pass", date: "Aug 27, 2026", amount: -65, status: "Completed", icon: "🚆" },
        { merchant: "Supermarket Grocery Store", date: "Aug 24, 2026", amount: -88, status: "Completed", icon: "🛒" },
        { merchant: "Student Meal Plan", date: "Aug 19, 2026", amount: -140, status: "Completed", icon: "🍔" },
        { merchant: "GitHub Copilot Subscription", date: "Aug 14, 2026", amount: -10, status: "Completed", icon: "⚙" }
      ],
      activities: [
        ["Part-Time AI Lab Stipend", "Direct deposit", 1800, "↗"],
        ["Campus Bookstore", "Textbooks & Supplies", -210, "📚"],
        ["City Metro Rail Pass", "Monthly Transit Pass", -65, "🚆"],
        ["Supermarket Grocery Store", "Card payment", -88, "🛒"]
      ],
      payments: [
        ["Dorm Room Utilities", "Sep 14", "$110"],
        ["Mobile Phone Unlimited Plan", "Sep 19", "$45"],
        ["Spotify Student", "Sep 25", "$5"]
      ],
      monthlyBudget: 15000,
      savingsGoal: 8000,
      savingsCurrent: 4500,
      theme: "light",
      settings: {
        notifications: false,
        weeklySummary: true,
        biometric: false
      },
      cards: [
        { name: "Student Cashback Card", number: "8823", holder: "Alex Chen", expiry: "06/29" }
      ]
    }
  ],
  activeProfileId: "utkarsh"
};

async function getSavedState() {
  try {
    const data = await fs.readFile(STATE_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
      return DEFAULT_STATE;
    }
    throw err;
  }
}

const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const AI_API_URL = process.env.AI_API_URL || "https://api.op enai.com/v1/chat/completions";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(ROOT_DIR));

// State API Endpoints
app.get("/api/state", async (req, res) => {
  try {
    const state = await getSavedState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: "Failed to read state data", details: error.message });
  }
});

app.post("/api/state", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid state object" });
    }
    await fs.writeFile(STATE_FILE, JSON.stringify(req.body, null, 2), "utf8");
    res.json({ success: true, state: req.body });
  } catch (error) {
    res.status(500).json({ error: "Failed to write state data", details: error.message });
  }
});

function buildSystemPrompt(context) {
  return [
    "You are Nova AI, a helpful financial assistant for the NovaPay demo dashboard.",
    "Use the provided financial context for calculations.",
    "Do not claim to be a bank and do not claim to execute real transactions.",
    "Do not provide guaranteed returns or unsafe financial claims.",
    "If asked about investing, clearly state the response is general educational information and not personalized financial advice.",
    "Keep answers clear, concise, and grounded in available numbers.",
    "Financial context:",
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

app.post("/api/nova-ai", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const context = req.body?.context || {};
  const history = sanitizeMessages(req.body?.messages);

  if (!message) {
    return res.status(400).json({ error: "Message is required", code: "INVALID_MESSAGE" });
  }

  if (message.length > 400) {
    return res.status(400).json({ error: "Message too long", code: "MESSAGE_TOO_LONG" });
  }

  if (!AI_API_KEY) {
    return res.status(503).json({ error: "AI API key is not configured", code: "NO_API_KEY" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const body = {
      model: AI_MODEL,
      temperature: 0.25,
      messages: [
        { role: "system", content: buildSystemPrompt(context) },
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
      return res.status(502).json({
        error: "Upstream AI service failed",
        code: "UPSTREAM_ERROR",
        details: text.slice(0, 300)
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      return res.status(502).json({ error: "Invalid AI response", code: "INVALID_AI_RESPONSE" });
    }

    return res.json({ reply: reply.trim() });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "AI request timed out", code: "TIMEOUT" });
    }
    return res.status(500).json({ error: "Internal AI server error", code: "AI_SERVER_ERROR" });
  } finally {
    clearTimeout(timeout);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`NovaPay server running at http://localhost:${PORT}`);
});
