(function () {
  function fmt(amount, currency) {
    const symbol = currency || "$";
    return symbol + Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function normalizeText(text) {
    return String(text || "").toLowerCase().trim();
  }

  function parseAmountFromQuestion(question) {
    const cleaned = String(question || "").replace(/,/g, "");
    const match = cleaned.match(/(?:rs\.?|inr|\$|₹)?\s*(\d+(?:\.\d+)?)/i);
    return match ? Number(match[1]) : null;
  }

  function detectQuestionCurrency(question, fallback) {
    var q = String(question || "");
    if (/₹|\binr\b|\brs\b/i.test(q)) return "₹";
    if (/\$|usd/i.test(q)) return "$";
    return fallback || "$";
  }

  function getExpenses(snapshot) {
    return Math.abs((snapshot.transactions || [])
      .filter(function (t) { return t.amount < 0; })
      .reduce(function (sum, t) { return sum + t.amount; }, 0));
  }

  function getIncome(snapshot) {
    return (snapshot.transactions || [])
      .filter(function (t) { return t.amount > 0; })
      .reduce(function (sum, t) { return sum + t.amount; }, 0);
  }

  function topCategories(snapshot) {
    var categories = snapshot.transactionCategories || {};
    return Object.keys(categories)
      .map(function (key) { return { name: key, value: categories[key] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  function largestExpenses(snapshot, count) {
    var limit = count || 3;
    return (snapshot.transactions || [])
      .filter(function (t) { return t.amount < 0; })
      .sort(function (a, b) { return Math.abs(b.amount) - Math.abs(a.amount); })
      .slice(0, limit);
  }

  function budgetSummary(snapshot) {
    var budget = Number(snapshot.monthlyBudget || 0);
    var spent = getExpenses(snapshot);
    var remaining = budget - spent;
    return {
      budget: budget,
      spent: spent,
      remaining: remaining,
      withinBudget: remaining >= 0
    };
  }

  function affordability(snapshot, amount) {
    var price = Number(amount || 0);
    var balance = Number(snapshot.currentBalance || 0);
    var budget = budgetSummary(snapshot);
    var upcoming = Number(snapshot.upcomingTotal || 0);
    var freeCashAfterUpcoming = balance - upcoming;
    var canAffordNow = balance >= price;
    var canAffordAfterUpcoming = freeCashAfterUpcoming >= price;
    return {
      amount: price,
      balance: balance,
      upcoming: upcoming,
      freeCashAfterUpcoming: freeCashAfterUpcoming,
      canAffordNow: canAffordNow,
      canAffordAfterUpcoming: canAffordAfterUpcoming,
      shortfall: Math.max(0, price - balance),
      budgetRemaining: budget.remaining
    };
  }

  function detectAnomalies(snapshot) {
    var expenses = (snapshot.transactions || []).filter(function (t) { return t.amount < 0; });
    if (!expenses.length) return [];

    var categoryBuckets = {};
    expenses.forEach(function (tx) {
      var cat = tx.category || "Other";
      if (!categoryBuckets[cat]) categoryBuckets[cat] = [];
      categoryBuckets[cat].push(Math.abs(tx.amount));
    });

    var anomalies = [];
    expenses.forEach(function (tx) {
      var category = tx.category || "Other";
      var bucket = categoryBuckets[category] || [Math.abs(tx.amount)];
      var avg = bucket.reduce(function (sum, val) { return sum + val; }, 0) / bucket.length;
      var current = Math.abs(tx.amount);
      if (avg > 0 && current >= avg * 2.5 && current > 100) {
        anomalies.push({
          merchant: tx.merchant,
          amount: current,
          category: category,
          multiple: current / avg
        });
      }
    });

    return anomalies
      .sort(function (a, b) { return b.multiple - a.multiple; })
      .slice(0, 3);
  }

  function inferCategory(merchant) {
    var m = normalizeText(merchant);
    if (/salary|income|freelance/.test(m)) return "Income";
    if (/grocery|food|restaurant/.test(m)) return "Food";
    if (/insurance|bill|rent|internet|electric/.test(m)) return "Bills";
    if (/uber|taxi|fuel|transport/.test(m)) return "Transport";
    if (/shop|store|payment/.test(m)) return "Shopping";
    return "Other";
  }

  function decorateTransactions(snapshot) {
    return (snapshot.transactions || []).map(function (tx) {
      return {
        merchant: tx.merchant,
        amount: tx.amount,
        date: tx.date,
        status: tx.status,
        category: tx.category || inferCategory(tx.merchant)
      };
    });
  }

  function safeSnapshot(snapshot) {
    var copy = Object.assign({}, snapshot || {});
    copy.transactions = decorateTransactions(copy);
    if (!copy.transactionCategories) {
      copy.transactionCategories = copy.transactions.reduce(function (acc, tx) {
        if (tx.amount < 0) {
          acc[tx.category] = (acc[tx.category] || 0) + Math.abs(tx.amount);
        }
        return acc;
      }, {});
    }
    copy.monthlyIncome = Number(copy.monthlyIncome || getIncome(copy));
    copy.monthlyExpenses = Number(copy.monthlyExpenses || getExpenses(copy));
    copy.upcomingTotal = Number(copy.upcomingTotal || (copy.upcomingPayments || []).reduce(function (sum, p) { return sum + Number(p.amount || 0); }, 0));
    copy.currency = copy.currency || "$";
    return copy;
  }

  function generateInsights(rawSnapshot) {
    var snapshot = safeSnapshot(rawSnapshot);
    var currency = snapshot.currency;
    var budget = budgetSummary(snapshot);
    var cats = topCategories(snapshot);
    var large = largestExpenses(snapshot, 1)[0];
    var anomalies = detectAnomalies(snapshot);
    var goal = Number(snapshot.savingsGoal || 0);
    var currentGoal = Number(snapshot.savingsCurrent || 0);
    var goalPct = goal > 0 ? Math.min(100, Math.round((currentGoal / goal) * 100)) : 0;

    var insights = [];
    if (cats.length) {
      insights.push({
        title: "⚠️ High spending detected",
        text: "Top spending category is " + cats[0].name + " at " + fmt(cats[0].value, currency) + "."
      });
    }

    if (budget.withinBudget) {
      insights.push({
        title: "💰 You can still save more",
        text: "You are " + fmt(budget.remaining, currency) + " under your monthly budget."
      });
    } else {
      insights.push({
        title: "⚠️ Budget exceeded",
        text: "You are over budget by " + fmt(Math.abs(budget.remaining), currency) + "."
      });
    }

    if (goal > 0) {
      insights.push({
        title: "🎯 Savings goal progress",
        text: "You are " + goalPct + "% toward your savings goal."
      });
    }

    if (large) {
      insights.push({
        title: "📈 Largest recent expense",
        text: large.merchant + " was " + fmt(Math.abs(large.amount), currency) + " on " + large.date + "."
      });
    }

    if (anomalies.length) {
      insights.push({
        title: "⚠️ Unusual spending",
        text: anomalies[0].merchant + " is " + anomalies[0].multiple.toFixed(1) + "x above your category average."
      });
    }

    return insights.slice(0, 4);
  }

  function localAnswer(question, rawSnapshot) {
    var snapshot = safeSnapshot(rawSnapshot);
    var q = normalizeText(question);
    var currency = detectQuestionCurrency(question, snapshot.currency);
    var expenses = snapshot.monthlyExpenses;
    var income = snapshot.monthlyIncome;
    var categories = topCategories(snapshot);
    var budget = budgetSummary(snapshot);
    var anomalies = detectAnomalies(snapshot);

    if (/spend.*month|monthly expense|expenses this month/.test(q)) {
      return "You spent approximately " + fmt(expenses, currency) + " this month.";
    }

    if (/spending the most|where am i spending|largest category|top category/.test(q)) {
      if (!categories.length) return "I do not have enough categorized expenses yet.";
      var first = categories[0];
      var second = categories[1];
      var message = "Your largest spending category is " + first.name + " at " + fmt(first.value, currency) + ".";
      if (second) {
        message += " Next is " + second.name + " at " + fmt(second.value, currency) + ".";
      }
      return message;
    }

    if (/how much money|current balance|balance/.test(q)) {
      return "Your current NovaPay balance is " + fmt(snapshot.currentBalance, currency) + ".";
    }

    if (/largest expenses|top expenses|biggest expenses/.test(q)) {
      var top = largestExpenses(snapshot, 3);
      if (!top.length) return "No expenses found to rank right now.";
      return "Your 3 largest expenses are:\n1. " + top[0].merchant + "  " + fmt(Math.abs(top[0].amount), currency) +
        (top[1] ? "\n2. " + top[1].merchant + "  " + fmt(Math.abs(top[1].amount), currency) : "") +
        (top[2] ? "\n3. " + top[2].merchant + "  " + fmt(Math.abs(top[2].amount), currency) : "");
    }

    if (/within.*budget|am i within my budget|budget status/.test(q)) {
      return "Monthly budget: " + fmt(budget.budget, currency) + "\nCurrent spending: " + fmt(budget.spent, currency) + "\nRemaining: " + fmt(Math.abs(budget.remaining), currency) +
        "\n\n" + (budget.withinBudget
          ? "Yes. You are currently " + fmt(budget.remaining, currency) + " under your monthly budget."
          : "You are currently " + fmt(Math.abs(budget.remaining), currency) + " over your monthly budget.");
    }

    if (/afford|can i buy|can i purchase/.test(q)) {
      var amount = parseAmountFromQuestion(question);
      if (!amount) {
        return "Tell me the purchase amount and I will estimate affordability using your balance, budget, and upcoming payments.";
      }
      var result = affordability(snapshot, amount);
      if (result.canAffordAfterUpcoming) {
        return "You currently have " + fmt(result.balance, currency) + " available. After upcoming payments, you would still have " + fmt(result.freeCashAfterUpcoming - result.amount, currency) + " left. This purchase looks affordable.";
      }
      if (result.canAffordNow && !result.canAffordAfterUpcoming) {
        return "You can afford this from your current balance, but after upcoming payments you would be short by " + fmt(Math.abs(result.freeCashAfterUpcoming - result.amount), currency) + ".";
      }
      return "You currently have " + fmt(result.balance, currency) + " available. A " + fmt(result.amount, currency) + " purchase would exceed your available balance by " + fmt(result.shortfall, currency) + ".";
    }

    if (/unusual expense|anomal|unusual spending/.test(q)) {
      if (!anomalies.length) return "I did not detect strong anomalies with the current transactions.";
      var a = anomalies[0];
      return "⚠️ Unusual spending\n\nYour " + fmt(a.amount, currency) + " transaction at " + a.merchant + " is approximately " + a.multiple.toFixed(1) + "x higher than your average " + a.category + " transaction.";
    }

    if (/save|savings|financial advice|advice/.test(q)) {
      var saveTarget = Math.max(0, budget.remaining * 0.5);
      return "A practical target is to save about " + fmt(saveTarget, currency) + " this month by capping your top category spend and paying high-priority bills first.";
    }

    if (/invest|stock|crypto|mutual fund|returns/.test(q)) {
      return "I can share general educational information only, not personalized investment advice. Based on your current cash flow, build an emergency buffer first, then consider diversified long-term options with risk you understand.";
    }

    return "I can help with spending breakdowns, budget status, affordability checks, unusual expenses, and savings planning. Try asking: 'Am I within my budget?'";
  }

  function buildAIContext(rawSnapshot) {
    var snapshot = safeSnapshot(rawSnapshot);
    return {
      currentBalance: snapshot.currentBalance,
      monthlyIncome: snapshot.monthlyIncome,
      monthlyExpenses: snapshot.monthlyExpenses,
      monthlyBudget: snapshot.monthlyBudget,
      categories: snapshot.transactionCategories,
      upcomingPayments: snapshot.upcomingPayments,
      savingsGoal: snapshot.savingsGoal,
      savingsCurrent: snapshot.savingsCurrent,
      transactions: snapshot.transactions.slice(0, 40)
    };
  }

  window.NovaAIAnalysis = {
    safeSnapshot: safeSnapshot,
    generateInsights: generateInsights,
    detectAnomalies: detectAnomalies,
    largestExpenses: largestExpenses,
    budgetSummary: budgetSummary,
    affordability: affordability,
    localAnswer: localAnswer,
    buildAIContext: buildAIContext
  };
})();
