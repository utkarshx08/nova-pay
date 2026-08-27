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
      balance: 12480,
      transactions: [
        {merchant:"Car Insurance", date:"Aug 22, 2026", amount:-320, status:"Completed", icon:"◆"},
        {merchant:"Salary", date:"Aug 20, 2026", amount:4500, status:"Completed", icon:"↗"},
        {merchant:"Online Payment", date:"Aug 18, 2026", amount:-154, status:"Completed", icon:"◉"},
        {merchant:"Electric Bill", date:"Aug 15, 2026", amount:-88, status:"Completed", icon:"ϟ"},
        {merchant:"Grocery Store", date:"Aug 12, 2026", amount:-126, status:"Completed", icon:"✦"},
        {merchant:"Freelance Income", date:"Aug 08, 2026", amount:980, status:"Completed", icon:"↗"}
      ],
      activities: [
        ["Water Bill","Successfully paid",-120,"⌁"],
        ["Salary","Received",4500,"↗"],
        ["Electric Bill","Successfully paid",-88,"ϟ"],
        ["Internet Bill","Successfully paid",-62,"◌"],
        ["Grocery Store","Card payment",-126,"✦"]
      ],
      payments: [
        ["Home Rent","Aug 30","$1,500"],
        ["Car Insurance","Sep 02","$320"],
        ["Streaming","Sep 05","$18"],
        ["Internet","Sep 08","$62"]
      ],
      monthlyBudget: 40000,
      savingsGoal: 15000,
      savingsCurrent: 10200,
      theme: "dark",
      settings: {
        notifications: true,
        weeklySummary: true,
        biometric: false
      },
      cards: [
        { name: "Primary", number: "4832", holder: "Utkarsh Tyagi", expiry: "08/29" },
        { name: "Virtual", number: "9011", holder: "Utkarsh Tyagi", expiry: "08/29" },
        { name: "Travel", number: "2744", holder: "Utkarsh Tyagi", expiry: "08/29" }
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
const AI_API_URL = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";

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
