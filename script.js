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
  savingsCurrent: 10200
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function money(n){ return `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function amountOnly(n){ return `$${Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function updateBalanceUI(){
  $("#balance").textContent = amountOnly(state.balance);
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
    el.innerHTML=`<div class="panel"><div class="panel-head"><div><p class="eyebrow">Your wallet</p><h2>Cards</h2></div><button class="primary" style="margin:0;padding:8px 14px" id="newCardBtn">＋ New card</button></div><div class="cards-showcase" style="margin-top:20px">${["Primary •••• 4832","Virtual •••• 9011","Travel •••• 2744"].map((x,i)=>`<div class="virtual-card"><span>NOVAPAY</span><strong>${x}</strong><small>UTKARSH TYAGI &nbsp; 08/29</small></div>`).join("")}</div></div>`;
    $("#newCardBtn").onclick=()=>{showToast("Card request submitted");};
  } else if(section==="payments"){
    el.innerHTML=`<div class="panel"><div class="panel-head"><div><p class="eyebrow">Scheduled</p><h2>Upcoming payments</h2></div><button class="primary" style="margin:0;padding:8px 14px" id="sectionAddPayment">＋ Add payment</button></div><div id="fullPayments" style="margin-top:12px"></div></div>`;
    $("#fullPayments").innerHTML=state.payments.map(p=>`<div class="setting-row"><div><b>${p[0]}</b><small>Due ${p[1]} · Automatic payment</small></div><strong>${p[2]}</strong></div>`).join("");
    $("#sectionAddPayment").onclick=()=>openMoneyModal("payment");
  } else if(section==="analytics"){
    el.innerHTML=`<div class="panel"><p class="eyebrow">Insights</p><h2>Analytics</h2><div class="stats-grid" style="margin-top:20px"><div class="mini-card"><span>Income</span><strong>$8,920</strong><small>+14.2% vs last month</small></div><div class="mini-card"><span>Expenses</span><strong>$3,842</strong><small>+4.7% vs last month</small></div><div class="mini-card"><span>Savings</span><strong>$5,078</strong><small>57% savings rate</small></div></div></div>`;
  } else if(section==="settings"){
    el.innerHTML=`<div class="panel"><p class="eyebrow">Preferences</p><h2>Settings</h2><div class="setting-row"><div><b>Transaction notifications</b><small>Get alerts when money moves</small></div><button class="toggle on"><span></span></button></div><div class="setting-row"><div><b>Weekly spending summary</b><small>Receive a weekly overview</small></div><button class="toggle on"><span></span></button></div><div class="setting-row"><div><b>Biometric login</b><small>Use device authentication</small></div><button class="toggle"><span></span></button></div></div>`;
    $$(".toggle").forEach(t=>t.onclick=()=>t.classList.toggle("on"));
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
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");showToast("Theme toggled");};
$("#notifyBtn").onclick=()=>showToast("You have 3 new notifications");
$("#profileBtn").onclick=()=>showToast("Profile menu opened");
$("#helpBtn").onclick=()=>showToast("Help center opened");
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

renderBars();renderActivities();renderHistory();renderPayments();updateBalanceUI();emitFinanceUpdate();

const light = document.createElement("style");
light.textContent=`body.light{--bg:#f4f5fa;--panel:#fff;--panel2:#f8f8fc;--text:#171827;--muted:#707489;background:#eef0f8}body.light .sidebar,body.light .topbar{background:#fff}body.light .panel,body.light .transfer-card,body.light .mini-card{background:#fff}body.light .search,body.light .round-btn,body.light .profile,body.light .nav-item:hover,body.light .nav-item.active,body.light .quick-actions button,body.light .panel-head select{background:#f4f4f9;color:#333}body.light .search input{color:#222}`;
document.head.appendChild(light);
