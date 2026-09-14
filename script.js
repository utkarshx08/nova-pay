const BASE_CHART = [
  ["Sep",2100,1400],["Oct",3400,1800],["Nov",2900,1700],["Dec",4700,2300],
  ["Jan",3800,2100],["Feb",1600,1300],["Mar",4200,2400],["Apr",4600,2200],
  ["May",5100,2500],["Jun",4100,2000],["Jul",4700,2200],["Aug",5400,2600]
];

const state = {
  user: null,
  balance: 0,
  activeSearch: "",
  transactions: [],
  activities: [],
  payments: [],
  chart: [...BASE_CHART],
  monthlyBudget: 0,
  savingsGoal: 0,
  savingsCurrent: 0,
  theme: "dark",
  settings: {
    notifications: true,
    weeklySummary: true,
    biometric: true
  },
  cards: [],
  accounts: [],
  budgets: [],
  goals: []
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// ----------------------------------------------------
// AUTHENTICATION STATE & UI LOGIC
// ----------------------------------------------------

async function checkAuthStatus() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        state.user = data.user;
        hideAuthOverlay();
        await loadDashboardFromAPI();
        return;
      }
    }
  } catch (error) {
    console.warn("Auth check failed:", error);
  }
  state.user = null;
  showAuthOverlay();
}

function showAuthOverlay(tab = "login") {
  const overlay = $("#authOverlay");
  if (overlay) overlay.classList.remove("hidden");
  switchAuthTab(tab);
}

function hideAuthOverlay() {
  const overlay = $("#authOverlay");
  if (overlay) overlay.classList.add("hidden");
}

function switchAuthTab(tab) {
  const tabLogin = $("#tabLogin");
  const tabRegister = $("#tabRegister");
  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");
  const authSubtitle = $("#authSubtitle");
  const loginErr = $("#loginError");
  const regErr = $("#registerError");

  if (loginErr) loginErr.classList.remove("show");
  if (regErr) regErr.classList.remove("show");

  if (tab === "login") {
    if (tabLogin) tabLogin.classList.add("active");
    if (tabRegister) tabRegister.classList.remove("active");
    if (loginForm) loginForm.classList.remove("hidden");
    if (registerForm) registerForm.classList.add("hidden");
    if (authSubtitle) authSubtitle.textContent = "Sign in to access your personal finance dashboard";
  } else {
    if (tabRegister) tabRegister.classList.add("active");
    if (tabLogin) tabLogin.classList.remove("active");
    if (registerForm) registerForm.classList.remove("hidden");
    if (loginForm) loginForm.classList.add("hidden");
    if (authSubtitle) authSubtitle.textContent = "Create an account to start managing your finances with MySQL";
  }
}

function setupAuthEventListeners() {
  const tabLogin = $("#tabLogin");
  const tabRegister = $("#tabRegister");
  const switchToRegister = $("#switchToRegister");
  const switchToLogin = $("#switchToLogin");

  if (tabLogin) tabLogin.onclick = () => switchAuthTab("login");
  if (tabRegister) tabRegister.onclick = () => switchAuthTab("register");
  if (switchToRegister) switchToRegister.onclick = () => switchAuthTab("register");
  if (switchToLogin) switchToLogin.onclick = () => switchAuthTab("login");

  // Toggle Password Visibilities
  const toggleLoginPwd = $("#toggleLoginPwd");
  if (toggleLoginPwd) {
    toggleLoginPwd.onclick = () => {
      const pwdInput = $("#loginPassword");
      if (pwdInput) {
        const isPwd = pwdInput.type === "password";
        pwdInput.type = isPwd ? "text" : "password";
        toggleLoginPwd.textContent = isPwd ? "🙈" : "👁";
      }
    };
  }

  const toggleRegPwd = $("#toggleRegPwd");
  if (toggleRegPwd) {
    toggleRegPwd.onclick = () => {
      const pwdInput = $("#regPassword");
      if (pwdInput) {
        const isPwd = pwdInput.type === "password";
        pwdInput.type = isPwd ? "text" : "password";
        toggleRegPwd.textContent = isPwd ? "🙈" : "👁";
      }
    };
  }

  // Handle Login Submit
  const loginForm = $("#loginForm");
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = $("#loginEmail")?.value?.trim();
      const password = $("#loginPassword")?.value;
      const loginBtn = $("#loginBtn");
      const errBox = $("#loginError");
      const errText = $("#loginErrorText");

      if (errBox) errBox.classList.remove("show");

      if (!email || !password) {
        if (errText) errText.textContent = "Please enter both email and password.";
        if (errBox) errBox.classList.add("show");
        return;
      }

      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Signing In...";
      }

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          state.user = data.user;
          hideAuthOverlay();
          showToast(`Welcome back, ${data.user.name}!`);
          await loadDashboardFromAPI();
        } else {
          if (errText) errText.textContent = data.message || "Invalid email or password";
          if (errBox) errBox.classList.add("show");
        }
      } catch (err) {
        if (errText) errText.textContent = "Network error. Make sure the Node server is running on port 5000.";
        if (errBox) errBox.classList.add("show");
      } finally {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = "Sign In";
        }
      }
    };
  }

  // Handle Registration Submit
  const registerForm = $("#registerForm");
  if (registerForm) {
    registerForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = $("#regName")?.value?.trim();
      const email = $("#regEmail")?.value?.trim();
      const password = $("#regPassword")?.value;
      const confirmPassword = $("#regConfirmPassword")?.value;
      const regBtn = $("#registerBtn");
      const errBox = $("#registerError");
      const errText = $("#registerErrorText");

      if (errBox) errBox.classList.remove("show");

      if (!name || !email || !password || !confirmPassword) {
        if (errText) errText.textContent = "All fields are required.";
        if (errBox) errBox.classList.add("show");
        return;
      }

      if (password !== confirmPassword) {
        if (errText) errText.textContent = "Passwords do not match.";
        if (errBox) errBox.classList.add("show");
        return;
      }

      if (password.length < 6) {
        if (errText) errText.textContent = "Password must be at least 6 characters.";
        if (errBox) errBox.classList.add("show");
        return;
      }

      if (regBtn) {
        regBtn.disabled = true;
        regBtn.textContent = "Creating Account...";
      }

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          state.user = data.user;
          hideAuthOverlay();
          showToast(`Account created successfully! Welcome ${data.user.name}`);
          await loadDashboardFromAPI();
        } else {
          if (errText) errText.textContent = data.message || `Registration failed (HTTP ${res.status}).`;
          if (errBox) errBox.classList.add("show");
        }
      } catch (err) {
        if (errText) errText.textContent = "Network error. Make sure the Node server is running on port 5000.";
        if (errBox) errBox.classList.add("show");
      } finally {
        if (regBtn) {
          regBtn.disabled = false;
          regBtn.textContent = "Create Account & Launch Dashboard";
        }
      }
    };
  }
}

async function performLogout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (e) {
    console.error("Logout error:", e);
  }
  state.user = null;
  showToast("Logged out successfully");
  showAuthOverlay("login");
}

// ----------------------------------------------------
// MYSQL DASHBOARD DATA FETCH & SYNC
// ----------------------------------------------------

async function loadDashboardFromAPI() {
  try {
    const response = await fetch("/api/dashboard", { credentials: "include" });
    if (!response.ok) {
      if (response.status === 401) {
        showAuthOverlay("login");
        return;
      }
      throw new Error("Failed to load dashboard data");
    }

    const resData = await response.json();
    if (resData.success && resData.data) {
      const d = resData.data;
      if (d.user) state.user = d.user;
      state.balance = d.balance || 0;
      state.accounts = d.accounts || [];
      state.cards = (d.cards || []).map(c => ({
        id: c.id,
        name: c.card_name,
        number: c.last_four,
        holder: state.user ? state.user.name : "Card Holder",
        expiry: `${c.expiry_month}/${c.expiry_year ? c.expiry_year.slice(-2) : "29"}`
      }));

      state.transactions = (d.transactions || []).map(t => ({
        id: t.id,
        merchant: t.title,
        date: formatDateDisplay(t.transaction_date),
        amount: t.type === "income" ? Math.abs(t.amount) : -Math.abs(t.amount),
        status: "Completed",
        icon: getCategoryIcon(t.category, t.type)
      }));

      state.activities = state.transactions.slice(0, 7).map(t => [
        t.merchant,
        t.amount > 0 ? "Deposit / Payout received" : "Card payment",
        t.amount,
        t.icon
      ]);

      state.payments = (d.payments || []).map(p => [
        p.title,
        formatDateShort(p.payment_date),
        amountOnly(parseFloat(p.amount) || 0)
      ]);

      state.budgets = d.budgets || [];
      state.goals = d.goals || [];

      if (state.budgets.length > 0) {
        state.monthlyBudget = parseFloat(state.budgets[0].amount) || 0;
      } else {
        state.monthlyBudget = 0;
      }

      applyThemeUI();
      updateProfileUI();
      renderBars();
      renderActivities();
      renderHistory();
      renderPayments();
      updateBalanceUI();
      emitFinanceUpdate();
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    showToast("Error loading MySQL financial data");
  }
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return todayLabel();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function formatDateShort(dateStr) {
  if (!dateStr) return "Sep 15";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function getCategoryIcon(category, type) {
  if (type === "income") return "↗";
  const c = (category || "").toLowerCase();
  if (c.includes("electronics") || c.includes("tech") || c.includes("shopping")) return "✦";
  if (c.includes("insurance") || c.includes("health")) return "◆";
  if (c.includes("grocery") || c.includes("food") || c.includes("dining")) return "✦";
  if (c.includes("transport") || c.includes("uber")) return "◉";
  if (c.includes("utility") || c.includes("bill") || c.includes("electric")) return "ϟ";
  if (c.includes("internet") || c.includes("sub")) return "⌁";
  return "✦";
}

// ----------------------------------------------------
// UI RENDERING & THEME HELPERS
// ----------------------------------------------------

function applyThemeUI() {
  const isLight = state.theme === "light";
  document.body.classList.toggle("light", isLight);
  const themeBtn = $("#themeBtn");
  if (themeBtn) themeBtn.textContent = isLight ? "☀" : "☾";
}

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$"
};

function getCurrencySymbol() {
  const code = state.user?.currency || "INR";
  return CURRENCY_SYMBOLS[code] || "₹";
}

function money(n) {
  const sym = getCurrencySymbol();
  return `${n < 0 ? "-" : "+"}${sym}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function amountOnly(n) {
  const sym = getCurrencySymbol();
  return `${sym}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function updateBalanceUI() {
  const balEl = $("#balance");
  if (balEl) balEl.textContent = amountOnly(state.balance);

  const spent = Math.abs(state.transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
  const budget = state.monthlyBudget || 0;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  const spendingAmount = $("#spendingAmount");
  if (spendingAmount) spendingAmount.textContent = amountOnly(spent);

  const spendingProgress = $("#spendingProgress");
  if (spendingProgress) spendingProgress.style.width = pct + "%";

  const spendingLimit = $("#spendingLimit");
  if (spendingLimit) spendingLimit.textContent = `${amountOnly(budget)} monthly limit`;

  const spendingTrend = $("#spendingTrend");
  if (spendingTrend) {
    spendingTrend.textContent = budget > 0 ? `${pct}% of limit` : "No limit set";
    spendingTrend.className = `trend ${pct > 100 ? 'text-red' : 'positive'}`;
  }
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function emitFinanceUpdate() {
  window.dispatchEvent(new CustomEvent("novapay:data-updated", { detail: getFinancialSnapshot() }));
}

function categorizeMerchant(merchant) {
  const m = String(merchant || "").toLowerCase();
  if (m.includes("salary") || m.includes("income") || m.includes("freelance")) return "Income";
  if (m.includes("grocery") || m.includes("food") || m.includes("restaurant") || m.includes("bistro")) return "Food";
  if (m.includes("insurance") || m.includes("bill") || m.includes("rent") || m.includes("internet") || m.includes("electric")) return "Bills";
  if (m.includes("uber") || m.includes("taxi") || m.includes("fuel") || m.includes("transport")) return "Transport";
  if (m.includes("shop") || m.includes("store") || m.includes("payment")) return "Shopping";
  return "Other";
}

function parsePaymentAmount(value) {
  const num = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function getFinancialSnapshot() {
  const income = state.transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const expenses = Math.abs(state.transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
  const categories = state.transactions.reduce((map, tx) => {
    if (tx.amount >= 0) return map;
    const key = categorizeMerchant(tx.merchant);
    map[key] = (map[key] || 0) + Math.abs(tx.amount);
    return map;
  }, {});

  const upcomingPayments = state.payments.map(payment => ({
    merchant: payment[0],
    dueDate: payment[1],
    amount: parsePaymentAmount(payment[2])
  }));
  const upcomingTotal = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    currency: getCurrencySymbol(),
    currentBalance: state.balance,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    transactionCategories: categories,
    monthlyBudget: state.monthlyBudget,
    upcomingPayments,
    upcomingTotal,
    savingsGoal: state.savingsGoal,
    savingsCurrent: state.savingsCurrent,
    transactions: state.transactions.map(t => ({ ...t }))
  };
}

window.NovaPayData = {
  getSnapshot: getFinancialSnapshot,
  subscribe(listener) {
    const handler = e => listener(e.detail);
    window.addEventListener("novapay:data-updated", handler);
    return () => window.removeEventListener("novapay:data-updated", handler);
  }
};

function showToast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => t.classList.remove("show"), 2200);
}

function renderBars() {
  const bars = $("#bars");
  const labels = $("#xLabels");
  const yLabels = $(".y-labels");
  const sym = getCurrencySymbol();
  if (yLabels) {
    yLabels.innerHTML = `<span>${sym}6k</span><span>${sym}4k</span><span>${sym}2k</span><span>${sym}0</span>`;
  }
  if (!bars || !labels) return;

  bars.innerHTML = "";
  labels.innerHTML = "";
  const max = 6000;
  state.chart.forEach(([m, income, expense]) => {
    const g = document.createElement("div");
    g.className = "bar-group";
    g.innerHTML = `<div class="bar income" style="height:${(income / max) * 100}%"></div><div class="bar expense" style="height:${(expense / max) * 100}%"></div>`;
    bars.appendChild(g);
    const l = document.createElement("span");
    l.textContent = m;
    labels.appendChild(l);
  });
}

function applyDashboardFilters() {
  const q = state.activeSearch.toLowerCase().trim();
  const tx = q
    ? state.transactions.filter(t => `${t.merchant} ${t.status} ${t.date}`.toLowerCase().includes(q))
    : state.transactions;
  const acts = q
    ? state.activities.filter(a => `${a[0]} ${a[1]}`.toLowerCase().includes(q))
    : state.activities;

  renderHistory(tx);
  renderActivities(acts);
  renderAllTransactions(tx);
}

function renderActivities(list = state.activities) {
  const listEl = $("#activityList");
  if (!listEl) return;
  listEl.innerHTML = list.map(a => `
    <div class="activity-item">
      <div class="activity-icon">${a[3]}</div>
      <div class="meta"><b>${a[0]}</b><small>${a[1]}</small></div>
      <span class="amount ${a[2] > 0 ? 'positive' : ''}">${money(a[2])}</span>
    </div>`).join("");
}

function renderHistory(list = state.transactions) {
  const bodyEl = $("#historyBody");
  if (!bodyEl) return;
  bodyEl.innerHTML = list.map(t => `
    <tr data-merchant="${t.merchant}"><td><div class="merchant"><span class="merchant-icon">${t.icon}</span>${t.merchant}</div></td>
    <td>${t.date}</td><td class="${t.amount > 0 ? 'positive' : ''}">${money(t.amount)}</td>
    <td><span class="status ${t.status === 'Pending' ? 'pending' : ''}">${t.status}</span></td></tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:#777">No matching transactions</td></tr>`;
}

function renderAllTransactions(list = state.transactions) {
  const allTransactions = $("#allTransactions");
  if (!allTransactions) return;
  allTransactions.innerHTML = list.map(t => `
    <tr data-merchant="${t.merchant}">
      <td><div class="merchant"><span class="merchant-icon">${t.icon}</span>${t.merchant}</div></td>
      <td>${t.date}</td>
      <td class="${t.amount > 0 ? 'positive' : ''}">${money(t.amount)}</td>
      <td><span class="status ${t.status === 'Pending' ? 'pending' : ''}">${t.status}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="4" style="text-align:center;color:#777">No matching transactions</td></tr>`;
}

function renderPayments() {
  const pList = $("#paymentList");
  if (!pList) return;
  pList.innerHTML = state.payments.map(p => `
    <div class="payment"><div class="date-box">${p[1].replace(" ", "<br>")}</div><div class="meta"><b>${p[0]}</b><small>Automatic payment</small></div><span class="pay-amount">${p[2]}</span></div>`).join("");
}

function setSection(section) {
  const sections = ["dashboard", "transactions", "cards", "payments", "analytics", "settings"];
  sections.forEach(s => {
    const el = $("#" + s + "Section");
    if (el) el.classList.toggle("hidden-section", s !== section);
  });
  const pageTitle = $("#pageTitle");
  if (pageTitle) pageTitle.textContent = section[0].toUpperCase() + section.slice(1);

  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.section === section));

  if (section !== "dashboard") renderFullSection(section);
  if (section === "transactions") applyDashboardFilters();
  emitFinanceUpdate();
}

function renderFullSection(section) {
  const el = $("#" + section + "Section");
  if (!el) return;

  if (section === "transactions") {
    el.innerHTML = `<div class="panel"><div class="panel-head"><div><p class="eyebrow">All activity</p><h2>Transactions</h2></div><div style="display:flex;gap:8px;"><button class="preset-btn" style="margin:0;padding:8px 14px" id="sectionExportBtn">📄 Export statement</button><button class="primary" style="margin:0;padding:8px 14px" id="newTransferBtn">＋ New transfer</button></div></div><div class="table-wrap"><table><thead><tr><th>Merchant</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody id="allTransactions"></tbody></table></div></div>`;
    renderAllTransactions(state.transactions);
    if ($("#newTransferBtn")) $("#newTransferBtn").onclick = () => openMoneyModal("transfer");
    if ($("#sectionExportBtn")) $("#sectionExportBtn").onclick = () => openExportStatementModal();
  } else if (section === "cards") {
    const cardsHtml = state.cards.map((card) => `
      <div class="virtual-card">
        <span>NOVAPAY</span>
        <strong>${card.name} •••• ${card.number}</strong>
        <small>${(card.holder || "CARD HOLDER").toUpperCase()} &nbsp; ${card.expiry}</small>
        <button class="delete-card-btn" data-id="${card.id}" title="Remove Card">×</button>
      </div>
    `).join("");

    el.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div><p class="eyebrow">Your wallet</p><h2>Cards</h2></div>
          <button class="primary" style="margin:0;padding:8px 14px" id="newCardBtn">＋ New card</button>
        </div>
        <div class="cards-showcase" style="margin-top:20px">
          ${cardsHtml || '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">No active cards. Request one above.</p>'}
        </div>
      </div>
    `;

    if ($("#newCardBtn")) $("#newCardBtn").onclick = () => openNewCardModal();

    $$(".delete-card-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        removeCard(id);
      };
    });
  } else if (section === "payments") {
    el.innerHTML = `<div class="panel"><div class="panel-head"><div><p class="eyebrow">Scheduled</p><h2>Upcoming payments</h2></div><button class="primary" style="margin:0;padding:8px 14px" id="sectionAddPayment">＋ Add payment</button></div><div id="fullPayments" style="margin-top:12px"></div></div>`;
    const fullP = $("#fullPayments");
    if (fullP) {
      fullP.innerHTML = state.payments.map(p => `<div class="setting-row"><div><b>${p[0]}</b><small>Due ${p[1]} · Automatic payment</small></div><strong>${p[2]}</strong></div>`).join("");
    }
    if ($("#sectionAddPayment")) $("#sectionAddPayment").onclick = () => openMoneyModal("payment");
  } else if (section === "analytics") {
    const inc = state.transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const exp = Math.abs(state.transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    const sav = state.balance;
    const savRate = inc > 0 ? Math.min(100, Math.round((sav / inc) * 100)) : 0;

    el.innerHTML = `<div class="panel"><p class="eyebrow">Insights</p><h2>Analytics</h2><div class="stats-grid" style="margin-top:20px"><div class="mini-card"><span>Income</span><strong>${amountOnly(inc)}</strong><small>Live total income</small></div><div class="mini-card"><span>Expenses</span><strong>${amountOnly(exp)}</strong><small>Live total expenses</small></div><div class="mini-card"><span>Savings</span><strong>${amountOnly(sav)}</strong><small>${savRate}% savings rate</small></div></div></div>`;
  } else if (section === "settings") {
    const user = state.user || { name: "User", email: "", avatar: "NP", currency: "INR" };
    el.innerHTML = `
      <div class="panel">
        <p class="eyebrow">Preferences</p><h2>Account Settings</h2>
        
        <form id="profileForm" style="margin:20px 0;display:grid;gap:14px;max-width:400px;">
          <div class="field-group">
            <label>Full Name</label>
            <input type="text" id="settingName" value="${user.name}" required style="background:#0f1019;border:1px solid var(--line);padding:10px;border-radius:8px;color:#fff;" />
          </div>
          <div class="field-group">
            <label>Email Address</label>
            <input type="email" id="settingEmail" value="${user.email}" required style="background:#0f1019;border:1px solid var(--line);padding:10px;border-radius:8px;color:#fff;" />
          </div>
          <div class="field-group">
            <label>Currency</label>
            <select id="settingCurrency" style="background:#0f1019;border:1px solid var(--line);padding:10px;border-radius:8px;color:#fff;">
              <option value="INR" ${user.currency === 'INR' ? 'selected' : ''}>INR (₹)</option>
              <option value="USD" ${user.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="EUR" ${user.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
              <option value="GBP" ${user.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
            </select>
          </div>
          <button type="submit" class="primary" style="margin-top:5px;">Save Profile Changes</button>
        </form>

        <hr style="border:0;border-top:1px solid var(--line);margin:24px 0;">

        <div class="setting-row"><div><b>Transaction notifications</b><small>Get alerts when money moves</small></div><button class="toggle ${state.settings?.notifications ? 'on' : ''}" id="toggleNotifications"><span></span></button></div>
        <div class="setting-row"><div><b>Weekly spending summary</b><small>Receive a weekly overview</small></div><button class="toggle ${state.settings?.weeklySummary ? 'on' : ''}" id="toggleWeeklySummary"><span></span></button></div>
        <div class="setting-row"><div><b>Biometric login</b><small>Use device authentication</small></div><button class="toggle ${state.settings?.biometric ? 'on' : ''}" id="toggleBiometric"><span></span></button></div>
      </div>
    `;

    const profileForm = $("#profileForm");
    if (profileForm) {
      profileForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = $("#settingName").value;
        const email = $("#settingEmail").value;
        const currency = $("#settingCurrency").value;

        try {
          const res = await fetch("/api/users/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, email, currency })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            state.user = data.user;
            updateProfileUI();
            showToast("Profile updated successfully!");
          } else {
            showToast(data.message || "Failed to update profile");
          }
        } catch (err) {
          showToast("Network error updating profile");
        }
      };
    }

    if ($("#toggleNotifications")) {
      $("#toggleNotifications").onclick = () => {
        $("#toggleNotifications").classList.toggle("on");
        state.settings.notifications = $("#toggleNotifications").classList.contains("on");
      };
    }
    if ($("#toggleWeeklySummary")) {
      $("#toggleWeeklySummary").onclick = () => {
        $("#toggleWeeklySummary").classList.toggle("on");
        state.settings.weeklySummary = $("#toggleWeeklySummary").classList.contains("on");
      };
    }
    if ($("#toggleBiometric")) {
      $("#toggleBiometric").onclick = () => {
        $("#toggleBiometric").classList.toggle("on");
        state.settings.biometric = $("#toggleBiometric").classList.contains("on");
      };
    }
  }
}

function openMoneyModal(type) {
  const titles = { add: "Add money", transfer: "Transfer money", request: "Request money", payment: "Schedule payment" };
  const modalContent = $("#modalContent");
  if (!modalContent) return;

  modalContent.innerHTML = `<h2>${titles[type]}</h2><p>Enter the details below. This updates your MySQL financial records.</p>
    <div class="form">
      <label>${type === "request" ? "From" : "Amount"}<input id="modalAmount" type="number" min="1" step=".01" placeholder="0.00" autofocus></label>
      ${type !== "add" ? `<label>Recipient / merchant<input id="modalName" type="text" placeholder="e.g. Alex or Rent"></label>` : `<label>Source<select id="modalSource"><option>Bank account •••• 1920</option><option>Debit card •••• 4832</option></select></label>`}
      <button class="primary" id="confirmModal">${type === "add" ? "Add funds" : type === "transfer" ? "Send transfer" : type === "request" ? "Send request" : "Schedule payment"}</button>
    </div>`;

  const modalBackdrop = $("#modalBackdrop");
  if (modalBackdrop) modalBackdrop.classList.add("open");

  const confirmBtn = $("#confirmModal");
  if (confirmBtn) confirmBtn.onclick = () => confirmMoney(type);

  const amountInput = $("#modalAmount");
  if (amountInput) {
    amountInput.addEventListener("keydown", e => { if (e.key === "Enter") confirmMoney(type); });
  }
}

async function confirmMoney(type) {
  const amount = Number($("#modalAmount")?.value);
  if (!amount || amount <= 0) { showToast("Enter a valid amount"); return; }
  const name = $("#modalName")?.value?.trim() || (type === "add" ? "Bank Top-up" : "New Payment");

  try {
    if (type === "add" || type === "transfer") {
      const txType = type === "add" ? "income" : "expense";
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: txType,
          title: name,
          category: type === "add" ? "Deposit" : "Transfer",
          amount: amount,
          description: type === "add" ? "Bank account top-up" : "Money transfer",
          transaction_date: new Date().toISOString().split("T")[0]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(type === "add" ? `${amountOnly(amount)} added!` : `Transfer of ${amountOnly(amount)} sent!`);
        await loadDashboardFromAPI();
      } else {
        showToast(data.message || "Failed to record transaction");
      }
    } else if (type === "payment") {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: name,
          amount: amount,
          category: "Scheduled",
          status: "pending",
          payment_date: new Date().toISOString().split("T")[0]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Payment scheduled successfully!");
        await loadDashboardFromAPI();
      } else {
        showToast(data.message || "Failed to schedule payment");
      }
    } else if (type === "request") {
      showToast("Money request sent!");
    }
  } catch (err) {
    showToast("Network error submitting request");
  }

  const modalBackdrop = $("#modalBackdrop");
  if (modalBackdrop) modalBackdrop.classList.remove("open");
}

function openNewCardModal() {
  const currentName = state.user ? state.user.name : "Utkarsh Tyagi";
  const modalContent = $("#modalContent");
  if (!modalContent) return;

  modalContent.innerHTML = `
    <h2>Request a new card</h2>
    <p>Add a new virtual or physical card to your wallet.</p>
    <div class="form">
      <label>Card Name / Type
        <select id="newCardName">
          <option value="Primary Rewards">Primary Visa</option>
          <option value="Virtual Shopping Card">Virtual Card</option>
          <option value="Travel Elite Visa">Travel Card</option>
          <option value="Business Platinum">Business Card</option>
        </select>
      </label>
      <label>Cardholder Name
        <input id="newCardHolder" type="text" value="${currentName}" required>
      </label>
      <button class="primary" id="confirmNewCard">Create Card</button>
    </div>
  `;
  const modalBackdrop = $("#modalBackdrop");
  if (modalBackdrop) modalBackdrop.classList.add("open");

  if ($("#confirmNewCard")) $("#confirmNewCard").onclick = () => createNewCard();
}

async function createNewCard() {
  const cardName = $("#newCardName")?.value || "Primary Visa";
  const holder = $("#newCardHolder")?.value?.trim();

  if (!holder) {
    showToast("Please enter cardholder name");
    return;
  }

  try {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        card_name: cardName,
        card_number: "4832" + Math.floor(100000000000 + Math.random() * 900000000000),
        card_type: cardName.includes("Visa") ? "Visa" : "Mastercard",
        credit_limit: 50000,
        available_limit: 50000,
        expiry_month: "08",
        expiry_year: "2030"
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`${cardName} created successfully!`);
      await loadDashboardFromAPI();
      renderFullSection("cards");
    } else {
      showToast(data.message || "Failed to create card");
    }
  } catch (err) {
    showToast("Error creating card");
  }

  const modalBackdrop = $("#modalBackdrop");
  if (modalBackdrop) modalBackdrop.classList.remove("open");
}

async function removeCard(id) {
  const confirmed = confirm("Are you sure you want to remove this card?");
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/cards/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (res.ok) {
      showToast("Card removed successfully");
      await loadDashboardFromAPI();
      renderFullSection("cards");
    } else {
      showToast("Failed to remove card");
    }
  } catch (err) {
    showToast("Error removing card");
  }
}

function updateProfileUI() {
  if (!state.user) return;
  const user = state.user;

  const currCode = user.currency || "INR";
  const currSym = CURRENCY_SYMBOLS[currCode] || "₹";

  const codeEl = $("#currentCurrencyCode");
  const symEl = $("#currentCurrencySymbol");
  if (codeEl) codeEl.textContent = currCode;
  if (symEl) symEl.textContent = currSym;

  const profileBtn = $("#profileBtn");
  if (profileBtn) {
    profileBtn.innerHTML = `<span class="avatar small">${user.avatar || 'NP'}</span><span>${user.name}</span><b>⌄</b>`;
  }

  const miniUser = $(".mini-user");
  if (miniUser) {
    miniUser.innerHTML = `
      <div class="avatar">${user.avatar || 'NP'}</div>
      <div><strong>${user.name}</strong><small>${user.email}</small></div>
      <button id="logoutBtn" aria-label="Log out" title="Log out">↗</button>
    `;
    const logoutBtn = $("#logoutBtn");
    if (logoutBtn) logoutBtn.onclick = performLogout;
  }
}

// Attach Event Listeners
function setupGlobalEventListeners() {
  $$(".nav-item[data-section]").forEach(b => b.onclick = () => setSection(b.dataset.section));
  $$("[data-section]").forEach(b => { if (!b.classList.contains("nav-item")) b.onclick = () => setSection(b.dataset.section); });
  $$(".quick-actions button").forEach(b => b.onclick = () => openMoneyModal(b.dataset.action));

  const addPaymentBtn = $("#addPaymentBtn");
  if (addPaymentBtn) addPaymentBtn.onclick = () => openMoneyModal("payment");

  const dotsBtn = $(".dots");
  if (dotsBtn) dotsBtn.onclick = () => showToast("Card actions: Freeze, Limits, PIN");

  const modalClose = $("#modalClose");
  if (modalClose) modalClose.onclick = () => $("#modalBackdrop")?.classList.remove("open");

  const modalBackdrop = $("#modalBackdrop");
  if (modalBackdrop) {
    modalBackdrop.onclick = e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove("open"); };
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") $("#modalBackdrop")?.classList.remove("open");
  });

  const currencySelectorBtn = $("#currencySelectorBtn");
  if (currencySelectorBtn) {
    currencySelectorBtn.onclick = (e) => {
      e.stopPropagation();
      const dropdown = $("#currencyDropdown");
      if (dropdown) {
        const wasHidden = dropdown.hidden;
        $$(".profile-dropdown").forEach(d => d.hidden = true);
        dropdown.hidden = !wasHidden;
      }
    };
  }

  $$(".currency-item").forEach(item => {
    item.onclick = async (e) => {
      e.stopPropagation();
      const code = item.dataset.code;
      const symbol = item.dataset.symbol;
      if ($("#currencyDropdown")) $("#currencyDropdown").hidden = true;

      if (state.user) {
        state.user.currency = code;
        try {
          await fetch("/api/users/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ currency: code })
          });
        } catch (err) {
          console.warn("Could not save currency preference:", err);
        }
      }

      updateProfileUI();
      updateBalanceUI();
      renderActivities();
      renderHistory();
      renderPayments();
      emitFinanceUpdate();
      showToast(`Currency updated to ${code} (${symbol})`);
    };
  });

  const themeBtn = $("#themeBtn");
  if (themeBtn) {
    themeBtn.onclick = () => {
      state.theme = state.theme === "light" ? "dark" : "light";
      applyThemeUI();
      showToast(state.theme === "light" ? "Light theme enabled" : "Dark theme enabled");
    };
  }

  const notifyBtn = $("#notifyBtn");
  if (notifyBtn) {
    notifyBtn.onclick = (e) => {
      e.stopPropagation();
      const dropdown = $("#notifyDropdown");
      if (dropdown) {
        const wasHidden = dropdown.hidden;
        $$(".profile-dropdown").forEach(d => d.hidden = true);
        dropdown.hidden = !wasHidden;
      }
    };
  }

  const profileBtn = $("#profileBtn");
  if (profileBtn) {
    profileBtn.onclick = (e) => {
      e.stopPropagation();
      const dropdown = $("#profileDropdown");
      if (dropdown) {
        const wasHidden = dropdown.hidden;
        $$(".profile-dropdown").forEach(d => d.hidden = true);
        dropdown.hidden = !wasHidden;
      }
    };
  }

  document.addEventListener("click", e => {
    if (!e.target.closest(".profile-dropdown")) {
      $$(".profile-dropdown").forEach(d => d.hidden = true);
    }
  });

  const dropdownLogout = $("#dropdownLogout");
  if (dropdownLogout) dropdownLogout.onclick = performLogout;

  const helpBtn = $("#helpBtn");
  if (helpBtn) helpBtn.onclick = openHelpModal;

  const exportBtn = $("#exportStatementBtn");
  if (exportBtn) exportBtn.onclick = () => openExportStatementModal();

  const searchInput = $("#searchInput");
  if (searchInput) {
    searchInput.oninput = e => {
      state.activeSearch = e.target.value;
      applyDashboardFilters();
    };
  }

  const chartRange = $("#chartRange");
  if (chartRange) {
    chartRange.onchange = e => {
      const value = e.target.value;
      if (value === "Last 6 months") state.chart = BASE_CHART.slice(-6);
      if (value === "Last 30 days") state.chart = [["W1", 1300, 680], ["W2", 1700, 920], ["W3", 1490, 770], ["W4", 1820, 980]];
      if (value === "Last 12 months") state.chart = [...BASE_CHART];
      showToast(`${value} selected`);
      renderBars();
      emitFinanceUpdate();
    };
  }

  document.addEventListener("click", e => {
    const row = e.target.closest("tr[data-merchant]");
    if (!row) return;
    const merchant = row.dataset.merchant;
    const match = state.transactions.find(t => t.merchant === merchant);
    if (!match) return;
    const modalContent = $("#modalContent");
    if (modalContent) {
      modalContent.innerHTML = `<h2>${match.merchant}</h2><p>${match.date} · ${match.status}</p><div class="form"><label>Amount<input type="text" value="${money(match.amount)}" readonly></label><button class="primary" id="closeDetailsBtn">Close</button></div>`;
      $("#modalBackdrop")?.classList.add("open");
      if ($("#closeDetailsBtn")) $("#closeDetailsBtn").onclick = () => $("#modalBackdrop")?.classList.remove("open");
    }
  });
}

function openHelpModal() {
  const modalContent = $("#modalContent");
  if (!modalContent) return;
  modalContent.innerHTML = `<h2>Help Center</h2><p>How can we help you today?</p>
    <div class="form">
      <div style="margin-bottom:10px">
        <b style="color:var(--text);font-size:11px">How do I transfer money?</b>
        <p style="margin-top:4px">Use the "Transfer" button in the Quick Actions menu on your dashboard.</p>
      </div>
      <div style="margin-bottom:10px">
        <b style="color:var(--text);font-size:11px">Where is my card?</b>
        <p style="margin-top:4px">Navigate to the Cards section to view or request a new physical card.</p>
      </div>
      <button class="primary" id="closeHelpBtn" style="margin-top:10px">Contact Support</button>
    </div>`;
  $("#modalBackdrop")?.classList.add("open");
  if ($("#closeHelpBtn")) {
    $("#closeHelpBtn").onclick = () => {
      showToast("Support request initiated");
      $("#modalBackdrop")?.classList.remove("open");
    };
  }
}

// Statement Export Logic
let currentExportPeriod = "1m";
let currentExportFilter = "all";

function getFilteredTransactionsForStatement(period, filterType, customStart, customEnd) {
  const now = new Date();
  let startDate = new Date();

  if (period === "1m") {
    startDate.setDate(now.getDate() - 30);
  } else if (period === "3m") {
    startDate.setDate(now.getDate() - 90);
  } else if (period === "6m") {
    startDate.setDate(now.getDate() - 180);
  } else if (period === "1y") {
    startDate.setDate(now.getDate() - 365);
  } else if (period === "custom" && customStart) {
    startDate = new Date(customStart);
  }

  let endDate = (period === "custom" && customEnd) ? new Date(customEnd + "T23:59:59") : now;

  return state.transactions.filter(t => {
    const txDate = new Date(t.date);
    const dateValid = isNaN(txDate.getTime()) || (txDate >= startDate && txDate <= endDate);
    if (!dateValid) return false;

    if (filterType === "expenses") return t.amount < 0;
    if (filterType === "income") return t.amount > 0;
    return true;
  });
}

function openExportStatementModal() {
  currentExportPeriod = "1m";
  currentExportFilter = "all";
  renderExportStatementModal();
}

function renderExportStatementModal() {
  const customStartVal = $("#stmtStartDate") ? $("#stmtStartDate").value : "";
  const customEndVal = $("#stmtEndDate") ? $("#stmtEndDate").value : "";

  const txs = getFilteredTransactionsForStatement(currentExportPeriod, currentExportFilter, customStartVal, customEndVal);
  const totalIncome = txs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = Math.abs(txs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
  const netFlow = totalIncome - totalExpenses;

  const userName = state.user ? state.user.name : "Utkarsh";

  const modalContent = $("#modalContent");
  if (!modalContent) return;

  modalContent.innerHTML = `
    <h2>📄 Export Financial Statement</h2>
    <p style="color:var(--muted);margin-bottom:16px;">Download or print account statements for <strong>${userName}</strong>.</p>
    
    <div class="export-modal-container">
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:8px;">Statement Period</label>
        <div class="preset-grid">
          <button class="preset-btn ${currentExportPeriod === '1m' ? 'active' : ''}" data-period="1m">1 Month</button>
          <button class="preset-btn ${currentExportPeriod === '3m' ? 'active' : ''}" data-period="3m">3 Months</button>
          <button class="preset-btn ${currentExportPeriod === '6m' ? 'active' : ''}" data-period="6m">6 Months</button>
          <button class="preset-btn ${currentExportPeriod === '1y' ? 'active' : ''}" data-period="1y">1 Year</button>
          <button class="preset-btn ${currentExportPeriod === 'custom' ? 'active' : ''}" data-period="custom">Custom</button>
        </div>
      </div>

      ${currentExportPeriod === 'custom' ? `
        <div class="custom-date-grid">
          <div>
            <label>From Date</label>
            <input type="date" id="stmtStartDate" value="${customStartVal}">
          </div>
          <div>
            <label>To Date</label>
            <input type="date" id="stmtEndDate" value="${customEndVal}">
          </div>
        </div>
      ` : ''}

      <div class="statement-filter-row">
        <label style="font-size:12px;font-weight:600;">Transaction Type</label>
        <div class="filter-chip-group">
          <button class="filter-chip ${currentExportFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
          <button class="filter-chip ${currentExportFilter === 'expenses' ? 'active' : ''}" data-filter="expenses">Expenses Only</button>
          <button class="filter-chip ${currentExportFilter === 'income' ? 'active' : ''}" data-filter="income">Income Only</button>
        </div>
      </div>

      <div class="statement-summary-box">
        <div>
          <span>Total Income</span>
          <strong style="color:var(--green, #4caf50);">${money(totalIncome)}</strong>
        </div>
        <div>
          <span>Total Expenses</span>
          <strong style="color:#ef5350;">${money(-totalExpenses)}</strong>
        </div>
        <div>
          <span>Net Cash Flow (${txs.length} txs)</span>
          <strong style="color:${netFlow >= 0 ? 'var(--green, #4caf50)' : '#ef5350'};">${money(netFlow)}</strong>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:8px;">
        <button class="primary" id="downloadCsvBtn" style="flex:1;">📥 Download CSV</button>
        <button class="preset-btn" id="printStatementBtn" style="flex:1;">🖨️ Print / Preview</button>
      </div>
    </div>
  `;

  $("#modalBackdrop")?.classList.add("open");

  $$(".preset-grid .preset-btn").forEach(btn => {
    btn.onclick = () => {
      currentExportPeriod = btn.dataset.period;
      renderExportStatementModal();
    };
  });

  $$(".filter-chip").forEach(chip => {
    chip.onclick = () => {
      currentExportFilter = chip.dataset.filter;
      renderExportStatementModal();
    };
  });

  if ($("#stmtStartDate")) $("#stmtStartDate").onchange = () => renderExportStatementModal();
  if ($("#stmtEndDate")) $("#stmtEndDate").onchange = () => renderExportStatementModal();

  if ($("#downloadCsvBtn")) {
    $("#downloadCsvBtn").onclick = () => downloadStatementCSV(txs, currentExportPeriod, userName);
  }
  if ($("#printStatementBtn")) {
    $("#printStatementBtn").onclick = () => printStatementPreview(txs, currentExportPeriod, totalIncome, totalExpenses, netFlow, userName);
  }
}

function downloadStatementCSV(txs, period, profileName) {
  if (!txs.length) {
    showToast("No transactions to export for selected range");
    return;
  }

  let csvContent = "Date,Merchant,Category,Type,Amount,Status\n";
  txs.forEach(t => {
    const type = t.amount < 0 ? "Expense" : "Income";
    const cat = categorizeMerchant(t.merchant);
    csvContent += `"${t.date}","${t.merchant.replace(/"/g, '""')}","${cat}","${type}",${t.amount},"${t.status}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NovaPay_Statement_${profileName.replace(/\s+/g, "_")}_${period}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${txs.length} transactions to CSV!`);
}

function printStatementPreview(txs, period, income, expenses, net, profileName) {
  const printWin = window.open("", "_blank");
  if (!printWin) {
    showToast("Please allow popups to preview/print statement");
    return;
  }

  const periodLabels = { "1m": "Last 1 Month (30 Days)", "3m": "Last 3 Months (90 Days)", "6m": "Last 6 Months (180 Days)", "1y": "Last 1 Year (365 Days)", "custom": "Custom Period" };
  const periodText = periodLabels[period] || period;

  const rowsHtml = txs.map(t => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #ddd;">${t.date}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;">${t.merchant}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;">${categorizeMerchant(t.merchant)}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;color:${t.amount < 0 ? '#d32f2f' : '#2e7d32'};font-weight:bold;">
        ${money(t.amount)}
      </td>
      <td style="padding:8px;border-bottom:1px solid #ddd;">${t.status}</td>
    </tr>
  `).join("");

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NovaPay Statement - ${profileName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #222; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e53935; padding-bottom: 15px; margin-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #e53935; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { text-align: left; padding: 10px; background: #e53935; color: white; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">✦ NovaPay Statement</div>
          <p style="margin:4px 0 0 0;color:#666;">Account Statement for <strong>${profileName}</strong></p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-weight:bold;">Period: ${periodText}</p>
          <p style="margin:4px 0 0 0;color:#666;font-size:12px;">Generated: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div class="summary-grid">
        <div><small>Total Income</small><br><strong style="color:#2e7d32;font-size:18px;">${money(income)}</strong></div>
        <div><small>Total Expenses</small><br><strong style="color:#d32f2f;font-size:18px;">${money(-expenses)}</strong></div>
        <div><small>Net Cash Flow</small><br><strong style="color:${net >= 0 ? '#2e7d32' : '#d32f2f'};font-size:18px;">${money(net)}</strong></div>
      </div>

      <h3>Transaction Details (${txs.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Merchant</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">No transactions found</td></tr>'}
        </tbody>
      </table>
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWin.document.close();
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  setupAuthEventListeners();
  setupGlobalEventListeners();
  checkAuthStatus();
});
