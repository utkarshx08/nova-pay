(function () {
  var analysis = window.NovaAIAnalysis;
  if (!analysis) return;

  var fab = document.getElementById("novaAIFab");
  var panel = document.getElementById("novaAIPanel");
  var messagesEl = document.getElementById("novaAIMessages");
  var quickEl = document.getElementById("novaAIQuick");
  var form = document.getElementById("novaAIForm");
  var input = document.getElementById("novaAIInput");
  var sendBtn = document.getElementById("novaAISend");
  var closeBtn = document.getElementById("novaAIClose");
  var minBtn = document.getElementById("novaAIMinimize");
  var menuBtn = document.getElementById("novaAIMenu");
  var clearBtn = document.getElementById("novaAIClearChat");
  var dropdown = document.getElementById("novaAIDropdown");
  var insightsEl = document.getElementById("aiInsightsList");

  if (!fab || !panel || !messagesEl || !form || !input || !sendBtn) return;

  var STORAGE_KEY = "novaAIChat";
  var QUICK_QUESTIONS = [
    "How much did I spend this month?",
    "Where am I spending the most?",
    "Can I afford a ₹20,000 purchase?",
    "How much should I save?",
    "Show my unusual expenses",
    "Give me financial advice"
  ];

  var state = {
    open: false,
    loading: false,
    messages: [],
    isFallback: false
  };

  function getSnapshot() {
    if (window.NovaPayData && typeof window.NovaPayData.getSnapshot === "function") {
      return analysis.safeSnapshot(window.NovaPayData.getSnapshot());
    }
    return analysis.safeSnapshot({});
  }

  function saveMessages() {
    var safeMessages = state.messages.slice(-60).map(function (msg) {
      return { role: msg.role, text: msg.text, ts: msg.ts };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeMessages));
  }

  var WARNING_PREFIX = "Nova AI is temporarily unavailable.\n\nI can still analyze your NovaPay transactions locally.\n\n";

  function loadMessages() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          state.messages = parsed.filter(function (m) {
            return m && (m.role === "user" || m.role === "ai") && typeof m.text === "string";
          }).map(function (m) {
            if (m.text.indexOf(WARNING_PREFIX) === 0) {
              m.text = m.text.substring(WARNING_PREFIX.length);
              state.isFallback = true;
            }
            return m;
          });
        }
      }
    } catch (error) {
      state.messages = [];
    }

    if (!state.messages.length) {
      state.messages.push({
        role: "ai",
        text: "Hi Utkarsh 👋\n\nI'm Nova AI, your personal financial assistant.\n\nI can help you understand your spending, manage your budget, analyze transactions, and plan your savings.",
        ts: Date.now()
      });
      saveMessages();
    }
  }

  function updateSendState() {
    var hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText || state.loading;
  }

  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    state.open = true;
    input.focus();
  }

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    dropdown.hidden = true;
    state.open = false;
    fab.focus();
  }

  function addMessage(role, text, animate) {
    state.messages.push({ role: role, text: text, ts: Date.now() });
    saveMessages();
    renderMessages(animate);
  }

  function messageNode(msg) {
    var item = document.createElement("article");
    item.className = "nova-ai-msg " + msg.role;
    if (msg.role === "ai") {
      item.innerHTML = "<strong>✦ Nova AI</strong>" + escapeHtml(msg.text).replace(/\n/g, "<br>");
    } else {
      item.innerHTML = escapeHtml(msg.text).replace(/\n/g, "<br>");
    }
    return item;
  }

  function renderMessages(animateLast) {
    messagesEl.innerHTML = "";
    state.messages.forEach(function (msg, index) {
      var node = messageNode(msg);
      if (animateLast && index === state.messages.length - 1) {
        node.style.opacity = "0";
        node.style.transform = "translateY(8px)";
        requestAnimationFrame(function () {
          node.style.transition = "opacity .25s ease, transform .25s ease";
          node.style.opacity = "1";
          node.style.transform = "none";
        });
      }
      messagesEl.appendChild(node);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showTyping() {
    var typing = document.createElement("div");
    typing.className = "nova-ai-typing";
    typing.id = "novaAITyping";
    typing.innerHTML = "Nova AI is typing... <span class=\"typing-dots\"><i></i><i></i><i></i></span>";
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById("novaAITyping");
    if (typing) typing.remove();
  }

  function renderQuickQuestions(customQuestions) {
    quickEl.innerHTML = "";
    var list = customQuestions || QUICK_QUESTIONS;
    list.forEach(function (question) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = question;
      btn.setAttribute("aria-label", "Ask: " + question);
      btn.addEventListener("click", function () {
        sendQuestion(question);
      });
      quickEl.appendChild(btn);
    });
  }

  function buildPayload(question) {
    var snapshot = getSnapshot();
    return {
      message: question,
      messages: state.messages.slice(-8),
      context: analysis.buildAIContext(snapshot)
    };
  }

  async function fetchAIResponse(question) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 12000);

    try {
      var response = await fetch("/api/nova-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(question)),
        signal: controller.signal
      });

      if (!response.ok) {
        var errorBody = await response.json().catch(function () { return {}; });
        var code = errorBody.code || "AI_ERROR";
        throw new Error(code);
      }

      var data = await response.json();
      if (!data || typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("INVALID_AI_RESPONSE");
      }

      return { ok: true, text: data.reply.trim() };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function getAssistantReply(question) {
    var snapshot = getSnapshot();

    try {
      return await fetchAIResponse(question);
    } catch (error) {
      var fallbackObj = analysis.localAnswer(question, snapshot);
      return {
        ok: true,
        text: fallbackObj.reply,
        suggestions: fallbackObj.suggestions,
        fallback: true
      };
    }
  }

  async function sendQuestion(text) {
    var question = String(text || "").trim();
    if (!question || state.loading) return;

    if (question.length > 400) {
      addMessage("ai", "Please keep messages under 400 characters so I can respond clearly.", true);
      return;
    }

    input.value = "";
    updateSendState();
    addMessage("user", question, true);

    state.loading = true;
    updateSendState();
    showTyping();

    var result = await getAssistantReply(question);

    hideTyping();
    state.loading = false;
    updateSendState();

    state.isFallback = !!result.fallback;
    var banner = document.getElementById("novaAIBanner");
    if (banner) {
      banner.hidden = !state.isFallback;
    }

    addMessage("ai", result.text, true);

    if (result.suggestions && result.suggestions.length) {
      renderQuickQuestions(result.suggestions);
    } else {
      renderQuickQuestions();
    }
  }

  function clearConversation() {
    var accepted = window.confirm("Are you sure you want to clear this conversation?");
    if (!accepted) return;

    localStorage.removeItem(STORAGE_KEY);
    state.messages = [
      {
        role: "ai",
        text: "Conversation cleared. Ask me anything about your spending, budget, or savings.",
        ts: Date.now()
      }
    ];
    saveMessages();
    renderMessages(false);
    dropdown.hidden = true;
  }

  function renderInsights(snapshot) {
    if (!insightsEl) return;
    var insights = analysis.generateInsights(snapshot);
    insightsEl.innerHTML = insights.map(function (item) {
      return "<article class=\"ai-insight-item\" tabindex=\"0\"><b>" + escapeHtml(item.title) + "</b><p>" + escapeHtml(item.text) + "</p></article>";
    }).join("");
  }

  function registerEvents() {
    fab.addEventListener("click", function () {
      if (state.open) {
        closePanel();
      } else {
        openPanel();
      }
    });

    closeBtn.addEventListener("click", closePanel);
    minBtn.addEventListener("click", closePanel);

    menuBtn.addEventListener("click", function () {
      dropdown.hidden = !dropdown.hidden;
    });

    clearBtn.addEventListener("click", clearConversation);

    document.addEventListener("click", function (event) {
      var inMenu = event.target.closest("#novaAIMenu") || event.target.closest("#novaAIDropdown");
      if (!inMenu) dropdown.hidden = true;
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.open) {
        closePanel();
      }
    });

    input.addEventListener("input", updateSendState);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      sendQuestion(input.value);
    });

    if (window.NovaPayData && typeof window.NovaPayData.subscribe === "function") {
      window.NovaPayData.subscribe(function (snapshot) {
        renderInsights(analysis.safeSnapshot(snapshot));
      });
    }

    window.addEventListener("novapay:data-updated", function (event) {
      renderInsights(analysis.safeSnapshot(event.detail || {}));
    });
  }

  function init() {
    loadMessages();
    var banner = document.getElementById("novaAIBanner");
    if (banner) {
      banner.hidden = !state.isFallback;
    }
    renderMessages(false);
    renderQuickQuestions();
    updateSendState();
    renderInsights(getSnapshot());
    registerEvents();
  }

  init();
})();
