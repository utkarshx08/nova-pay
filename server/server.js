const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const ROOT_DIR = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);

const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const AI_API_URL = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(ROOT_DIR));

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
