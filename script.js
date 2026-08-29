const BASE_CHART = [
  ["Sep",2100,1400],["Oct",3400,1800],["Nov",2900,1700],["Dec",4700,2300],
  ["Jan",3800,2100],["Feb",1600,1300],["Mar",4200,2400],["Apr",4600,2200],
  ["May",5100,2500],["Jun",4100,2000],["Jul",4700,2200],["Aug",5400,2600]
];

const state = {
  balance: 12480,
  activeSearch: "",
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
  chart: [...BASE_CHART],
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
  ],
  profiles: [],
  activeProfileId: "utkarsh"
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// Profile sync helpers
function createProfileFromCurrentState(id, name, avatar) {
  return {
    id: id,
    name: name,
    avatar: avatar,
    balance: state.balance,
    transactions: [...state.transactions],
    activities: [...state.activities],
    payments: [...state.payments],
    monthlyBudget: state.monthlyBudget,
    savingsGoal: state.savingsGoal,
    savingsCurrent: state.savingsCurrent,
    theme: state.theme,
    settings: { ...state.settings },
    cards: state.cards ? [...state.cards] : [
      { name: "Primary", number: "4832", holder: name + " Tyagi", expiry: "08/29" },
      { name: "Virtual", number: "9011", holder: name + " Tyagi", expiry: "08/29" },
      { name: "Travel", number: "2744", holder: name + " Tyagi", expiry: "08/29" }
    ]
  };
}

function copyProfileToState(profile) {
  state.balance = profile.balance;
  state.transactions = [...profile.transactions];
  state.activities = [...profile.activities];
  state.payments = [...profile.payments];
  state.monthlyBudget = profile.monthlyBudget;
  state.savingsGoal = profile.savingsGoal;
  state.savingsCurrent = profile.savingsCurrent;
  state.theme = profile.theme;
  state.settings = { ...profile.settings };
  state.cards = profile.cards ? [...profile.cards] : [];
}

function saveStateToCurrentProfile() {
  const current = state.profiles.find(p => p.id === state.activeProfileId);
  if (current) {
    current.balance = state.balance;
    current.transactions = [...state.transactions];
    current.activities = [...state.activities];
    current.payments = [...state.payments];
    current.monthlyBudget = state.monthlyBudget;
    current.savingsGoal = state.savingsGoal;
    current.savingsCurrent = state.savingsCurrent;
    current.theme = state.theme;
    current.settings = { ...state.settings };
    current.cards = state.cards ? [...state.cards] : [];
  }
}

async function saveStateToServer() {
  saveStateToCurrentProfile();
  try {
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId
      })
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
  } catch (error) {
    console.warn("Could not save to server, saving to localStorage instead:", error);
    try {
      localStorage.setItem("novapayState", JSON.stringify({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId
      }));
    } catch (e) {
      console.error(e);
    }
  }
}

async function loadStateFromServer() {
  try {
    const response = await fetch("/api/state");
    if (response.ok) {
      const data = await response.json();
      state.profiles = data.profiles || [];
      state.activeProfileId = data.activeProfileId || "utkarsh";
      
      if (!state.profiles.length) {
        state.profiles = [createProfileFromCurrentState("utkarsh", "Utkarsh", "UT")];
        state.activeProfileId = "utkarsh";
      }
      
      const current = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
      copyProfileToState(current);
      return;
    }
  } catch (error) {
    console.warn("Could not load from server, checking localStorage:", error);
  }
  try {
    const localData = localStorage.getItem("novapayState");
    if (localData) {
      const data = JSON.parse(localData);
      state.profiles = data.profiles || [];
      state.activeProfileId = data.activeProfileId || "utkarsh";
      
      if (!state.profiles.length) {
        state.profiles = [createProfileFromCurrentState("utkarsh", "Utkarsh", "UT")];
        state.activeProfileId = "utkarsh";
      }
      
      const current = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
      copyProfileToState(current);
    }
  } catch (e) {
    console.error(e);
  }

  if (!state.profiles || !state.profiles.length) {
    state.profiles = [createProfileFromCurrentState("utkarsh", "Utkarsh", "UT")];
    state.activeProfileId = "utkarsh";
    const current = state.profiles[0];
    copyProfileToState(current);
  }
}

function applyThemeUI() {
  const isLight = state.theme === "light";
  document.body.classList.toggle("light", isLight);
  $("#themeBtn").textContent = isLight ? "☀" : "☾";
}

function money(n){ return `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function amountOnly(n){ return `$${Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function updateBalanceUI(){
  $("#balance").textContent = amountOnly(state.balance);
  
  // Dynamic monthly spending mini-card
  const spent = Math.abs(state.transactions.filter(t=>t.amount<0).reduce((sum,t)=>sum+t.amount,0));
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
function todayLabel(){
  return new Date().toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}
function emitFinanceUpdate(){
  window.dispatchEvent(new CustomEvent("novapay:data-updated", { detail: getFinancialSnapshot() }));
}

function categorizeMerchant(merchant){
  const m = merchant.toLowerCase();
  if(m.includes("salary") || m.includes("income") || m.includes("freelance")) return "Income";
  if(m.includes("grocery") || m.includes("food") || m.includes("restaurant")) return "Food";
  if(m.includes("insurance") || m.includes("bill") || m.includes("rent") || m.includes("internet") || m.includes("electric")) return "Bills";
  if(m.includes("uber") || m.includes("taxi") || m.includes("fuel") || m.includes("transport")) return "Transport";
  if(m.includes("shop") || m.includes("store") || m.includes("payment")) return "Shopping";
  return "Other";
}

function parsePaymentAmount(value){
  const num = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function getFinancialSnapshot(){
  const income = state.transactions.filter(t=>t.amount>0).reduce((sum,t)=>sum+t.amount,0);
  const expenses = Math.abs(state.transactions.filter(t=>t.amount<0).reduce((sum,t)=>sum+t.amount,0));
  const categories = state.transactions.reduce((map,tx)=>{
    if(tx.amount >= 0) return map;
    const key = categorizeMerchant(tx.merchant);
    map[key] = (map[key] || 0) + Math.abs(tx.amount);
    return map;
  }, {});
  const upcomingPayments = state.payments.map(payment => ({
    merchant: payment[0],
    dueDate: payment[1],
    amount: parsePaymentAmount(payment[2])
  }));
  const upcomingTotal = upcomingPayments.reduce((sum,p)=>sum + p.amount,0);
  return {
    currency: "$",
    currentBalance: state.balance,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    transactionCategories: categories,
    monthlyBudget: state.monthlyBudget,
    upcomingPayments,
    upcomingTotal,
    savingsGoal: state.savingsGoal,
    savingsCurrent: state.savingsCurrent,
    transactions: state.transactions.map(t=>({ ...t }))
  };
}

window.NovaPayData = {
  getSnapshot: getFinancialSnapshot,
  subscribe(listener){
    const handler = e => listener(e.detail);
    window.addEventListener("novapay:data-updated", handler);
    return () => window.removeEventListener("novapay:data-updated", handler);
  }
};

function showToast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove("show"),2200);
}

function renderBars(){
  const bars=$("#bars"), labels=$("#xLabels"); bars.innerHTML=""; labels.innerHTML="";
  const max=6000;
  state.chart.forEach(([m,income,expense])=>{
    const g=document.createElement("div"); g.className="bar-group";
    g.innerHTML=`<div class="bar income" style="height:${income/max*100}%"></div><div class="bar expense" style="height:${expense/max*100}%"></div>`;
    bars.appendChild(g);
    const l=document.createElement("span"); l.textContent=m; labels.appendChild(l);
  });
}
function applyDashboardFilters(){
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
function renderActivities(list=state.activities){
  $("#activityList").innerHTML=list.map(a=>`
    <div class="activity-item">
      <div class="activity-icon">${a[3]}</div>
      <div class="meta"><b>${a[0]}</b><small>${a[1]}</small></div>
      <span class="amount ${a[2]>0?'positive':''}">${money(a[2])}</span>
    </div>`).join("");
}
function renderHistory(list=state.transactions){
  $("#historyBody").innerHTML=list.map(t=>`
    <tr data-merchant="${t.merchant}"><td><div class="merchant"><span class="merchant-icon">${t.icon}</span>${t.merchant}</div></td>
    <td>${t.date}</td><td class="${t.amount>0?'positive':''}">${money(t.amount)}</td>
    <td><span class="status ${t.status==='Pending'?'pending':''}">${t.status}</span></td></tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:#777">No matching transactions</td></tr>`;
}
function renderAllTransactions(list=state.transactions){
  const allTransactions = $("#allTransactions");
  if(!allTransactions) return;
  allTransactions.innerHTML = list.map(t => `
    <tr data-merchant="${t.merchant}">
      <td><div class="merchant"><span class="merchant-icon">${t.icon}</span>${t.merchant}</div></td>
      <td>${t.date}</td>
      <td class="${t.amount>0?'positive':''}">${money(t.amount)}</td>
      <td><span class="status ${t.status==='Pending'?'pending':''}">${t.status}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="4" style="text-align:center;color:#777">No matching transactions</td></tr>`;
}
function renderPayments(){
  $("#paymentList").innerHTML=state.payments.map(p=>`
    <div class="payment"><div class="date-box">${p[1].replace(" ","<br>")}</div><div class="meta"><b>${p[0]}</b><small>Automatic payment</small></div><span class="pay-amount">${p[2]}</span></div>`).join("");
}

function setSection(section){
  const sections=["dashboard","transactions","cards","payments","analytics","settings"];
  sections.forEach(s=>{ const el=$("#"+s+"Section"); if(el) el.classList.toggle("hidden-section",s!==section); });
  $("#pageTitle").textContent=section[0].toUpperCase()+section.slice(1);
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.section===section));
  if(section!=="dashboard") renderFullSection(section);
  if(section === "transactions") applyDashboardFilters();
  emitFinanceUpdate();
}
function renderFullSection(section){
  const el=$("#"+section+"Section");
  if(section==="transactions"){
    el.innerHTML=`<div class="panel"><div class="panel-head"><div><p class="eyebrow">All activity</p><h2>Transactions</h2></div><button class="primary" style="margin:0;padding:8px 14px" id="newTransferBtn">＋ New transfer</button></div><div class="table-wrap"><table><thead><tr><th>Merchant</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody id="allTransactions"></tbody></table></div></div>`;
    renderAllTransactions(state.transactions);
    $("#newTransferBtn").onclick=()=>openMoneyModal("transfer");
  } else if(section==="cards"){
    const cardsHtml = state.cards.map((card, i) => `
      <div class="virtual-card">
        <span>NOVAPAY</span>
        <strong>${card.name} •••• ${card.number}</strong>
        <small>${card.holder.toUpperCase()} &nbsp; ${card.expiry}</small>
        <button class="delete-card-btn" data-index="${i}" title="Remove Card">×</button>
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

    $("#newCardBtn").onclick = () => openNewCardModal();

    $$(".delete-card-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const index = Number(btn.dataset.index);
        removeCard(index);
      };
    });
  } else if(section==="payments"){
    el.innerHTML=`<div class="panel"><div class="panel-head"><div><p class="eyebrow">Scheduled</p><h2>Upcoming payments</h2></div><button class="primary" style="margin:0;padding:8px 14px" id="sectionAddPayment">＋ Add payment</button></div><div id="fullPayments" style="margin-top:12px"></div></div>`;
    $("#fullPayments").innerHTML=state.payments.map(p=>`<div class="setting-row"><div><b>${p[0]}</b><small>Due ${p[1]} · Automatic payment</small></div><strong>${p[2]}</strong></div>`).join("");
    $("#sectionAddPayment").onclick=()=>openMoneyModal("payment");
  } else if(section==="analytics"){
    el.innerHTML=`<div class="panel"><p class="eyebrow">Insights</p><h2>Analytics</h2><div class="stats-grid" style="margin-top:20px"><div class="mini-card"><span>Income</span><strong>$8,920</strong><small>+14.2% vs last month</small></div><div class="mini-card"><span>Expenses</span><strong>$3,842</strong><small>+4.7% vs last month</small></div><div class="mini-card"><span>Savings</span><strong>$5,078</strong><small>57% savings rate</small></div></div></div>`;
  } else if(section==="settings"){
    el.innerHTML=`<div class="panel"><p class="eyebrow">Preferences</p><h2>Settings</h2>
      <div class="setting-row"><div><b>Transaction notifications</b><small>Get alerts when money moves</small></div><button class="toggle ${state.settings?.notifications ? 'on' : ''}" id="toggleNotifications"><span></span></button></div>
      <div class="setting-row"><div><b>Weekly spending summary</b><small>Receive a weekly overview</small></div><button class="toggle ${state.settings?.weeklySummary ? 'on' : ''}" id="toggleWeeklySummary"><span></span></button></div>
      <div class="setting-row"><div><b>Biometric login</b><small>Use device authentication</small></div><button class="toggle ${state.settings?.biometric ? 'on' : ''}" id="toggleBiometric"><span></span></button></div>
      
      <hr style="border:0;border-top:1px solid var(--line);margin:24px 0;">
      <p class="eyebrow">Profile Management</p><h2>Switch & Manage Profiles</h2>
      <div id="settingsProfileList" style="margin-top:15px;display:grid;gap:12px;"></div>
      <button class="primary" style="margin-top:15px;max-width:200px" id="settingsAddProfileBtn">＋ Add new profile</button>
    </div>`;

    renderSettingsProfileList();

    $("#settingsAddProfileBtn").onclick = () => {
      openAddProfileModal();
    };
    
    $("#toggleNotifications").onclick=()=>{
      $("#toggleNotifications").classList.toggle("on");
      state.settings.notifications = $("#toggleNotifications").classList.contains("on");
      saveStateToServer();
    };
    $("#toggleWeeklySummary").onclick=()=>{
      $("#toggleWeeklySummary").classList.toggle("on");
      state.settings.weeklySummary = $("#toggleWeeklySummary").classList.contains("on");
      saveStateToServer();
    };
    $("#toggleBiometric").onclick=()=>{
      $("#toggleBiometric").classList.toggle("on");
      state.settings.biometric = $("#toggleBiometric").classList.contains("on");
      saveStateToServer();
    };
  }
}

function openMoneyModal(type){
  const titles={add:"Add money",transfer:"Transfer money",request:"Request money",payment:"Schedule payment"};
  $("#modalContent").innerHTML=`<h2>${titles[type]}</h2><p>Enter the details below. This demo updates the dashboard instantly.</p>
    <div class="form">
      <label>${type==="request"?"From":"Amount"}<input id="modalAmount" type="number" min="1" step=".01" placeholder="0.00" autofocus></label>
      ${type!=="add" ? `<label>Recipient / merchant<input id="modalName" type="text" placeholder="e.g. Alex or Rent"></label>` : `<label>Source<select id="modalSource"><option>Bank account •••• 1920</option><option>Debit card •••• 4832</option></select></label>`}
      <button class="primary" id="confirmModal">${type==="add"?"Add funds":type==="transfer"?"Send transfer":type==="request"?"Send request":"Schedule payment"}</button>
    </div>`;
  $("#modalBackdrop").classList.add("open");
  $("#confirmModal").onclick=()=>confirmMoney(type);
  $("#modalAmount").addEventListener("keydown", e=>{ if(e.key === "Enter") confirmMoney(type); });
}
function confirmMoney(type){
  const amount=Number($("#modalAmount").value);
  if(!amount || amount<=0){showToast("Enter a valid amount");return}
  const name=$("#modalName")?.value?.trim() || (type==="add"?"Bank top-up":"New payment");
  if(type==="add"){state.balance+=amount; updateBalanceUI(); showToast(`$${amount.toFixed(2)} added`);}
  if(type==="transfer"){
    state.balance-=amount;
    state.transactions.unshift({merchant:name,date:todayLabel(),amount:-amount,status:"Completed",icon:"↗"});
    updateBalanceUI();
    showToast(`Transfer of $${amount.toFixed(2)} sent`);
  }
  if(type==="request"){state.activities.unshift([name||"Money request","Request sent",amount,"↓"]);renderActivities();showToast("Money request sent");}
  if(type==="payment"){state.payments.unshift([name||"New payment","Sep 12",`$${amount.toFixed(2)}`]);renderPayments();showToast("Payment scheduled");}
  applyDashboardFilters();
  emitFinanceUpdate();
  saveStateToServer();
  $("#modalBackdrop").classList.remove("open");
}

$$(".nav-item[data-section]").forEach(b=>b.onclick=()=>setSection(b.dataset.section));
$$("[data-section]").forEach(b=>{if(!b.classList.contains("nav-item")) b.onclick=()=>setSection(b.dataset.section)});
$$(".quick-actions button").forEach(b=>b.onclick=()=>openMoneyModal(b.dataset.action));
$("#addPaymentBtn").onclick=()=>openMoneyModal("payment");
$(".dots").onclick=()=>showToast("Card actions: Freeze, Limits, PIN");
$("#modalClose").onclick=()=>$("#modalBackdrop").classList.remove("open");
$("#modalBackdrop").onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove("open")};
document.addEventListener("keydown", e=>{
  if(e.key === "Escape") $("#modalBackdrop").classList.remove("open");
});
$("#themeBtn").onclick=()=>{
  const isLight = document.body.classList.toggle("light");
  state.theme = isLight ? "light" : "dark";
  $("#themeBtn").textContent = isLight ? "☀" : "☾";
  saveStateToServer();
  showToast("Theme toggled");
};
$("#notifyBtn").onclick=(e)=> {
  e.stopPropagation();
  const dropdown = $("#notifyDropdown");
  if(dropdown) {
    const wasHidden = dropdown.hidden;
    $$(".profile-dropdown").forEach(d => d.hidden = true);
    dropdown.hidden = !wasHidden;
  }
};
function openHelpModal() {
  $("#modalContent").innerHTML = `<h2>Help Center</h2><p>How can we help you today?</p>
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
  $("#modalBackdrop").classList.add("open");
  $("#closeHelpBtn").onclick = () => {
    showToast("Support request initiated");
    $("#modalBackdrop").classList.remove("open");
  };
}

$("#profileBtn").onclick=(e)=> {
  e.stopPropagation();
  const dropdown = $("#profileDropdown");
  if(dropdown) {
    const wasHidden = dropdown.hidden;
    $$(".profile-dropdown").forEach(d => d.hidden = true);
    dropdown.hidden = !wasHidden;
  }
};
document.addEventListener("click", e => {
  if(!e.target.closest(".profile-dropdown")) {
    $$(".profile-dropdown").forEach(d => d.hidden = true);
  }
});
if($("#dropdownLogout")) $("#dropdownLogout").onclick=()=>showToast("Logged out successfully");

$("#helpBtn").onclick=openHelpModal;
$("#logoutBtn").onclick=()=>showToast("Demo logout — session kept for preview");
$("#searchInput").oninput=e=>{
  state.activeSearch = e.target.value;
  applyDashboardFilters();
};
$("#chartRange").onchange=e=>{
  const value = e.target.value;
  if(value === "Last 6 months") state.chart = BASE_CHART.slice(-6);
  if(value === "Last 30 days") state.chart = [["W1",1300,680],["W2",1700,920],["W3",1490,770],["W4",1820,980]];
  if(value === "Last 12 months") state.chart = [...BASE_CHART];
  showToast(`${value} selected`);
  renderBars();
  emitFinanceUpdate();
  saveStateToServer();
};

document.addEventListener("click", e=>{
  const row = e.target.closest("tr[data-merchant]");
  if(!row) return;
  const merchant = row.dataset.merchant;
  const match = state.transactions.find(t=>t.merchant === merchant);
  if(!match) return;
  $("#modalContent").innerHTML = `<h2>${match.merchant}</h2><p>${match.date} · ${match.status}</p><div class="form"><label>Amount<input type="text" value="${money(match.amount)}" readonly></label><button class="primary" id="closeDetailsBtn">Close</button></div>`;
  $("#modalBackdrop").classList.add("open");
  $("#closeDetailsBtn").onclick = ()=>$("#modalBackdrop").classList.remove("open");
});

// Profile and Card management helpers
function updateProfileUI() {
  const current = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
  if (!current) return;

  const profileBtn = $("#profileBtn");
  if (profileBtn) {
    profileBtn.innerHTML = `<span class="avatar small">${current.avatar}</span><span>${current.name}</span><b>⌄</b>`;
  }
  
  const miniUser = $(".mini-user");
  if (miniUser) {
    miniUser.innerHTML = `
      <div class="avatar">${current.avatar}</div>
      <div><strong>${current.name}</strong><small>Personal account</small></div>
      <button id="logoutBtn" aria-label="Log out">↗</button>
    `;
    const newLogoutBtn = $("#logoutBtn");
    if (newLogoutBtn) {
      newLogoutBtn.onclick = () => showToast("Demo logout — session kept for preview");
    }
  }
}

function renderProfileDropdown() {
  const dropdown = $("#profileDropdown");
  if (!dropdown) return;
  
  const profilesHtml = state.profiles.map(p => {
    const isActive = p.id === state.activeProfileId;
    return `
      <button class="dropdown-item profile-select-btn ${isActive ? 'active-profile' : ''}" data-id="${p.id}">
        <span class="avatar small" style="display:inline-grid;margin-right:8px;vertical-align:middle;width:24px;height:24px;font-size:8px;">${p.avatar}</span>
        <span style="vertical-align:middle;">${p.name} ${isActive ? '✓' : ''}</span>
      </button>
    `;
  }).join("");

  dropdown.innerHTML = `
    <div style="padding:4px 12px;font-size:10px;font-weight:bold;color:var(--muted)">PROFILES</div>
    ${profilesHtml}
    <hr>
    <button class="dropdown-item" id="addProfileBtn" style="color:var(--primary-color, #6d6bff);font-weight:bold;">＋ Add new profile</button>
    <hr>
    <button class="dropdown-item">Preferences</button>
    <button class="dropdown-item text-red" id="dropdownLogout">Log out</button>
  `;

  $$(".profile-select-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      switchProfile(id);
    };
  });

  $("#addProfileBtn").onclick = () => {
    openAddProfileModal();
  };

  if($("#dropdownLogout")) $("#dropdownLogout").onclick=()=>showToast("Logged out successfully");
}

function renderSettingsProfileList() {
  const container = $("#settingsProfileList");
  if (!container) return;

  container.innerHTML = state.profiles.map(p => {
    const isActive = p.id === state.activeProfileId;
    const canDelete = !isActive && state.profiles.length > 1;
    
    return `
      <div class="setting-row" style="padding:10px 0;border-bottom:1px solid var(--line);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="avatar" style="width:36px;height:36px;font-size:11px;">${p.avatar}</div>
          <div>
            <b style="font-size:12px;">${p.name}</b>
            <small style="display:block;color:var(--muted);font-size:9px;">${isActive ? 'Active profile' : 'Inactive profile'}</small>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${isActive 
            ? `<span style="font-size:10px;color:var(--green);font-weight:bold;padding:6px 12px;background:rgba(87,220,168,0.1);border-radius:20px;">Active</span>` 
            : `<button class="primary settings-switch-profile-btn" data-id="${p.id}" style="margin:0;padding:6px 12px;font-size:10px;background:var(--panel2);border:1px solid var(--line);color:var(--text);">Switch</button>`
          }
          ${canDelete
            ? `<button class="primary settings-delete-profile-btn text-red" data-id="${p.id}" style="margin:0;padding:6px 12px;font-size:10px;background:rgba(255,110,138,0.1);border:1px solid rgba(255,110,138,0.2);color:var(--red);">Delete</button>`
            : ''
          }
        </div>
      </div>
    `;
  }).join("");

  $$(".settings-switch-profile-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      switchProfile(id);
      renderSettingsProfileList();
    };
  });

  $$(".settings-delete-profile-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      deleteProfile(id);
    };
  });
}

function deleteProfile(id) {
  const target = state.profiles.find(p => p.id === id);
  if (!target) return;

  const confirmed = confirm(`Are you sure you want to delete the profile "${target.name}"? This will permanently delete all its data, including transactions and cards.`);
  if (!confirmed) return;

  state.profiles = state.profiles.filter(p => p.id !== id);
  saveStateToServer();
  renderSettingsProfileList();
  renderProfileDropdown();
  showToast(`Profile "${target.name}" deleted`);
}

function switchProfile(id) {
  if (id === state.activeProfileId) return;
  saveStateToCurrentProfile();
  const next = state.profiles.find(p => p.id === id);
  if (next) {
    state.activeProfileId = id;
    copyProfileToState(next);
    
    applyThemeUI();
    updateBalanceUI();
    renderBars();
    renderActivities();
    renderHistory();
    renderPayments();
    
    const activeNav = $(".nav-item.active");
    if (activeNav) {
      const section = activeNav.dataset.section;
      if (section !== "dashboard") {
        renderFullSection(section);
      }
    }
    
    updateProfileUI();
    renderProfileDropdown();
    emitFinanceUpdate();
    saveStateToServer();
    showToast(`Switched to profile: ${next.name}`);
  }
}

function openAddProfileModal() {
  $("#modalContent").innerHTML = `
    <h2>Add new profile</h2>
    <p>Create a new profile with its own balance, transactions, and settings.</p>
    <div class="form">
      <label>Profile Name
        <input id="newProfileName" type="text" placeholder="e.g. John Doe" maxlength="20" required autofocus>
      </label>
      <label>Avatar Initials
        <input id="newProfileAvatar" type="text" placeholder="e.g. JD" maxlength="2" required>
      </label>
      <button class="primary" id="confirmNewProfile">Create Profile</button>
    </div>
  `;
  $("#modalBackdrop").classList.add("open");
  
  $("#confirmNewProfile").onclick = () => createNewProfile();
  
  $("#newProfileName").addEventListener("keydown", e => { if (e.key === "Enter") $("#newProfileAvatar").focus(); });
  $("#newProfileAvatar").addEventListener("keydown", e => { if (e.key === "Enter") createNewProfile(); });
}

function createNewProfile() {
  const name = $("#newProfileName").value.trim();
  const avatar = $("#newProfileAvatar").value.trim().toUpperCase();
  
  if (!name) {
    showToast("Please enter a name");
    return;
  }
  if (!avatar || avatar.length > 2) {
    showToast("Please enter 1 or 2 initials for the avatar");
    return;
  }
  
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now().toString().slice(-4);
  
  const newProfile = {
    id: id,
    name: name,
    avatar: avatar,
    balance: 0,
    transactions: [],
    activities: [],
    payments: [],
    monthlyBudget: 0,
    savingsGoal: 0,
    savingsCurrent: 0,
    theme: "dark",
    settings: {
      notifications: true,
      weeklySummary: true,
      biometric: false
    },
    cards: []
  };
  
  state.profiles.push(newProfile);
  saveStateToServer();
  switchProfile(id);
  
  $("#modalBackdrop").classList.remove("open");
  showToast(`Profile "${name}" created`);
}

function openNewCardModal() {
  const current = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
  $("#modalContent").innerHTML = `
    <h2>Request a new card</h2>
    <p>Add a new virtual or physical card to your wallet.</p>
    <div class="form">
      <label>Card Name / Type
        <select id="newCardName">
          <option value="Primary">Primary Visa</option>
          <option value="Virtual">Virtual Card</option>
          <option value="Travel">Travel Card</option>
          <option value="Business">Business Card</option>
        </select>
      </label>
      <label>Cardholder Name
        <input id="newCardHolder" type="text" value="${current.name}" required>
      </label>
      <button class="primary" id="confirmNewCard">Create Card</button>
    </div>
  `;
  $("#modalBackdrop").classList.add("open");
  
  $("#confirmNewCard").onclick = () => createNewCard();
}

function createNewCard() {
  const name = $("#newCardName").value;
  const holder = $("#newCardHolder").value.trim();
  
  if (!holder) {
    showToast("Please enter cardholder name");
    return;
  }
  
  const number = Math.floor(1000 + Math.random() * 9000).toString();
  const expiry = "09/31";
  
  state.cards.push({ name, number, holder, expiry });
  saveStateToServer();
  renderFullSection("cards");
  $("#modalBackdrop").classList.remove("open");
  showToast(`${name} Card created!`);
}

function removeCard(index) {
  const confirmed = confirm("Are you sure you want to remove this card?");
  if (!confirmed) return;
  
  const removed = state.cards.splice(index, 1)[0];
  saveStateToServer();
  renderFullSection("cards");
  showToast(`${removed.name} Card removed`);
}

async function initApp() {
  await loadStateFromServer();
  applyThemeUI();
  updateProfileUI();
  renderProfileDropdown();
  renderBars();
  renderActivities();
  renderHistory();
  renderPayments();
  updateBalanceUI();
  emitFinanceUpdate();
}
initApp();

const light = document.createElement("style");
light.textContent=`body.light{--bg:#f4f5fa;--panel:#fff;--panel2:#f8f8fc;--text:#171827;--muted:#707489;background:#eef0f8}body.light .sidebar,body.light .topbar{background:#fff}body.light .panel,body.light .transfer-card,body.light .mini-card{background:#fff}body.light .search,body.light .round-btn,body.light .profile,body.light .nav-item:hover,body.light .nav-item.active,body.light .quick-actions button,body.light .panel-head select{background:#f4f4f9;color:#333}body.light .search input{color:#222}`;
document.head.appendChild(light);
