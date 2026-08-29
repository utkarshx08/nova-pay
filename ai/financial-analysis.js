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

    var matchedCategory = null;
    if (/food|grocery|groceries|restaurant|eat/.test(q)) matchedCategory = "Food";
    else if (/bill|bills|rent|internet|electric|water|utility|utilities|insurance/.test(q)) matchedCategory = "Bills";
    else if (/transport|travel|uber|taxi|fuel|car/.test(q)) matchedCategory = "Transport";
    else if (/shop|shopping|store|purchase/.test(q) && !/afford|can i buy|can i purchase/.test(q)) matchedCategory = "Shopping";
    else if (/income|salary|earnings|freelance/.test(q) && !/spend|expenses/.test(q)) matchedCategory = "Income";

    // 1. Income query
    if (matchedCategory === "Income" || /income|earned|earning|salary|paycheck|freelance|received/.test(q)) {
      var positiveTx = (snapshot.transactions || []).filter(function (t) { return t.amount > 0; });
      var totalIncome = positiveTx.reduce(function (sum, t) { return sum + t.amount; }, 0);
      var reply = "Your total income this month is " + fmt(totalIncome, currency) + ". Here are your income sources:\n";
      if (positiveTx.length === 0) {
        reply = "I didn't detect any income transactions for this month yet.";
      } else {
        positiveTx.forEach(function (tx) {
          reply += "- " + tx.merchant + ": " + fmt(tx.amount, currency) + " on " + tx.date + "\n";
        });
        reply += "\n💡 Suggestion: Consider allocating 15-20% of your earnings (" + fmt(totalIncome * 0.15, currency) + " - " + fmt(totalIncome * 0.20, currency) + ") directly to your savings goal.";
      }
      return {
        reply: reply,
        suggestions: ["How much did I spend this month?", "How much should I save?", "Am I within my budget?"]
      };
    }

    // 2. Category spending query
    if (matchedCategory) {
      var catExpenses = Math.abs((snapshot.transactions || [])
        .filter(function (t) { return t.amount < 0 && (t.category === matchedCategory || inferCategory(t.merchant) === matchedCategory); })
        .reduce(function (sum, t) { return sum + t.amount; }, 0));
      
      var reply = "You spent " + fmt(catExpenses, currency) + " on " + matchedCategory + " this month.";
      if (expenses > 0) {
        var pct = Math.round((catExpenses / expenses) * 100);
        reply += " This accounts for " + pct + "% of your total monthly expenses.";
      }
      
      if (matchedCategory === "Food") {
        reply += "\n\n💡 Suggestion: Groceries and eating out can add up quickly. Try tracking dining expenses or planning meals to reduce impulse eating.";
      } else if (matchedCategory === "Bills") {
        reply += "\n\n💡 Suggestion: Review recurring subscriptions. Canceling just one unused streaming service or utility upgrade can free up cash flow.";
      } else if (matchedCategory === "Transport") {
        reply += "\n\n💡 Suggestion: Look into weekly/monthly transport passes or ridesharing pools to optimize your commute budget.";
      } else if (matchedCategory === "Shopping") {
        reply += "\n\n💡 Suggestion: Consider a '24-hour rule' for shopping: wait 24 hours before buying non-essentials to avoid impulse shopping.";
      }
      
      return {
        reply: reply,
        suggestions: ["Where am I spending the most?", "Am I within my budget?", "Show my unusual expenses"]
      };
    }

    // 3. Savings query
    if (/save|savings|goal|progress/.test(q)) {
      var goal = Number(snapshot.savingsGoal || 0);
      var current = Number(snapshot.savingsCurrent || 0);
      var pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
      var remaining = Math.max(0, goal - current);
      
      var reply = "You have saved " + fmt(current, currency) + " toward your savings goal of " + fmt(goal, currency) + " (" + pct + "% complete).\n";
      if (remaining > 0) {
        reply += "You need " + fmt(remaining, currency) + " more to reach your goal.\n\n";
        var saveTarget = Math.max(0, budget.remaining * 0.5);
        if (saveTarget > 0) {
          reply += "💡 Suggestion: You have " + fmt(budget.remaining, currency) + " left in your monthly budget. If you move " + fmt(saveTarget, currency) + " of this surplus to savings, you'll be " + Math.round(((current + saveTarget) / goal) * 100) + "% closer to your goal!";
        } else {
          reply += "💡 Suggestion: You are currently over budget. Focus on cutting discretionary shopping to free up cash for your savings goal.";
        }
      } else {
        reply += "🎉 Congratulations! You have fully achieved your savings goal for this month!\n\n💡 Suggestion: Consider increasing your savings target next month or investing your surplus cash.";
      }
      return {
        reply: reply,
        suggestions: ["Give me financial advice", "Where am I spending the most?", "Am I within my budget?"]
      };
    }

    // 4. Spending/Expenses query
    if (/spend.*month|monthly expense|expenses this month|outgoings|spent/.test(q)) {
      var reply = "You spent approximately " + fmt(expenses, currency) + " this month.\n\n";
      if (categories.length > 0) {
        reply += "Top spending category: " + categories[0].name + " (" + fmt(categories[0].value, currency) + ").\n\n";
      }
      if (budget.withinBudget) {
        reply += "💡 Suggestion: You are " + fmt(budget.remaining, currency) + " under your monthly budget limit. You're doing great! Keep it up.";
      } else {
        reply += "⚠️ Suggestion: You have exceeded your monthly budget by " + fmt(Math.abs(budget.remaining), currency) + ". Look into cutting down on " + (categories[0] ? categories[0].name : "discretionary categories") + ".";
      }
      return {
        reply: reply,
        suggestions: ["Where am I spending the most?", "Am I within my budget?", "Give me financial advice"]
      };
    }

    // 5. Spending Location / Top Category query
    if (/spending the most|where am i spending|largest category|top category|category breakdown/.test(q)) {
      if (!categories.length) {
        return {
          reply: "I do not have enough categorized expenses yet.",
          suggestions: ["How much did I spend this month?", "Am I within my budget?"]
        };
      }
      var first = categories[0];
      var second = categories[1];
      var reply = "Your largest spending category is " + first.name + " at " + fmt(first.value, currency) + " (" + Math.round((first.value / expenses) * 100) + "% of total spent).\n";
      if (second) {
        reply += "Your second largest is " + second.name + " at " + fmt(second.value, currency) + " (" + Math.round((second.value / expenses) * 100) + "%).\n";
      }
      reply += "\n💡 Suggestion: Review your " + first.name + " expenses. Even a minor 10% reduction here can save you " + fmt(first.value * 0.1, currency) + " this month.";
      return {
        reply: reply,
        suggestions: ["Am I within my budget?", "Show my unusual expenses", "How much should I save?"]
      };
    }

    // 6. Balance query
    if (/how much money|current balance|balance|available balance/.test(q)) {
      var upcoming = Number(snapshot.upcomingTotal || 0);
      var reply = "Your current NovaPay balance is " + fmt(snapshot.currentBalance, currency) + ".\n\n";
      if (upcoming > 0) {
        var remaining = snapshot.currentBalance - upcoming;
        reply += "You have " + fmt(upcoming, currency) + " in upcoming bills due within 30 days. Your net safe-to-spend balance is " + fmt(remaining, currency) + ".\n\n💡 Suggestion: Make sure to keep at least " + fmt(upcoming, currency) + " in your account to cover bills automatically.";
      } else {
        reply += "💡 Suggestion: With zero upcoming bills registered, you can afford to invest a portion of your balance or allocate it to your savings goal.";
      }
      return {
        reply: reply,
        suggestions: ["Can I afford a ₹20,000 purchase?", "Am I within my budget?", "How much should I save?"]
      };
    }

    // 7. Largest expenses / Top expenses query
    if (/largest expenses|top expenses|biggest expenses|expensive/.test(q)) {
      var top = largestExpenses(snapshot, 3);
      if (!top.length) {
        return {
          reply: "No expenses found to rank right now.",
          suggestions: ["How much did I spend this month?", "Am I within my budget?"]
        };
      }
      var reply = "Your 3 largest expenses are:\n";
      top.forEach(function (item, index) {
        reply += (index + 1) + ". " + item.merchant + ": " + fmt(Math.abs(item.amount), currency) + " (" + item.date + ")\n";
      });
      reply += "\n💡 Suggestion: If any of these are recurring subscriptions or optional shopping, consider cancelling or pausing them temporarily.";
      return {
        reply: reply,
        suggestions: ["Where am I spending the most?", "Show my unusual expenses", "Give me financial advice"]
      };
    }

    // 8. Budget status query
    if (/within.*budget|am i within my budget|budget status|budget health/.test(q)) {
      var reply = "Monthly budget: " + fmt(budget.budget, currency) + "\n";
      reply += "Current spending: " + fmt(budget.spent, currency) + "\n";
      reply += "Remaining: " + fmt(Math.abs(budget.remaining), currency) + "\n\n";
      
      if (budget.withinBudget) {
        reply += "Yes. You are currently " + fmt(budget.remaining, currency) + " under your monthly budget.\n\n💡 Suggestion: You are on track! Keep monitoring category spending, especially in Shopping, to maintain this positive cash flow.";
      } else {
        reply += "⚠️ You are currently " + fmt(Math.abs(budget.remaining), currency) + " over your monthly budget limit.\n\n💡 Suggestion: Pause non-essential purchases immediately. Check 'Show my unusual expenses' to see where the budget leaked.";
      }
      return {
        reply: reply,
        suggestions: ["Show my unusual expenses", "Where am I spending the most?", "How much should I save?"]
      };
    }

    // 9. Affordability check query
    if (/afford|can i buy|can i purchase/.test(q)) {
      var amount = parseAmountFromQuestion(question);
      if (!amount) {
        return {
          reply: "Tell me the purchase amount (e.g. 'Can I afford a ₹15,000 purchase?') and I will estimate affordability using your balance, budget, and upcoming payments.",
          suggestions: ["Can I afford a ₹20,000 purchase?", "Am I within my budget?"]
        };
      }
      var result = affordability(snapshot, amount);
      var reply = "";
      if (result.canAffordAfterUpcoming) {
        reply = "You currently have " + fmt(result.balance, currency) + " available. After upcoming payments, you would still have " + fmt(result.freeCashAfterUpcoming - result.amount, currency) + " left.\n\n💡 Recommendation: Yes, this purchase looks affordable and safe.";
      } else if (result.canAffordNow && !result.canAffordAfterUpcoming) {
        reply = "You can afford this from your current balance, but after upcoming payments of " + fmt(result.upcoming, currency) + ", you would be short by " + fmt(Math.abs(result.freeCashAfterUpcoming - result.amount), currency) + ".\n\n⚠️ Recommendation: Proceed with caution. You might want to delay this until after your next salary payment.";
      } else {
        reply = "You currently have " + fmt(result.balance, currency) + " available. A " + fmt(result.amount, currency) + " purchase would exceed your available balance by " + fmt(result.shortfall, currency) + ".\n\n⚠️ Recommendation: This is currently not affordable. Consider saving up for a few more weeks or lowering your shopping budget.";
      }
      return {
        reply: reply,
        suggestions: ["Where am I spending the most?", "Am I within my budget?", "How much should I save?"]
      };
    }

    // 10. Anomalies / Unusual Spending query
    if (/unusual expense|anomal|unusual spending|strange expense/.test(q)) {
      if (!anomalies.length) {
        return {
          reply: "I did not detect strong anomalies with the current transactions.",
          suggestions: ["What are my largest expenses?", "Am I within my budget?"]
        };
      }
      var a = anomalies[0];
      var reply = "⚠️ Unusual spending detected:\nYour " + fmt(a.amount, currency) + " transaction at " + a.merchant + " is approximately " + a.multiple.toFixed(1) + "x higher than your average " + a.category + " transaction.\n\n💡 Suggestion: Inspect this transaction on the dashboard to ensure it is correct and not fraudulent.";
      return {
        reply: reply,
        suggestions: ["What are my largest expenses?", "Am I within my budget?", "Give me financial advice"]
      };
    }

    // 11. Advice / Recommendations query
    if (/advice|financial advice|suggestion|recommendation|help/.test(q)) {
      var reply = "Here are custom recommendations based on your current financial state:\n\n";
      
      var upcomingList = snapshot.upcomingPayments || [];
      if (upcomingList.length > 0) {
        var nextPay = upcomingList[0];
        reply += "1. **Upcoming Bill**: You have " + nextPay[0] + " due on " + nextPay[1] + " (" + nextPay[2] + "). Make sure you maintain sufficient funds.\n";
      } else {
        reply += "1. **Cash Reserve**: Keep a baseline buffer of at least 10% of your balance untouched as emergency cash.\n";
      }

      if (!budget.withinBudget) {
        reply += "2. **Budget Alert**: You are over budget by " + fmt(Math.abs(budget.remaining), currency) + ". Reduce optional Shopping and dining out immediately.\n";
      } else if (budget.remaining < budget.budget * 0.15) {
        reply += "2. **Budget Warning**: You have less than 15% left of your monthly budget. Watch category spending carefully.\n";
      } else {
        reply += "2. **Savings Plan**: You are " + fmt(budget.remaining, currency) + " under budget. Consider transferring " + fmt(budget.remaining * 0.5, currency) + " to your savings goal.\n";
      }

      var topCat = categories[0];
      if (topCat) {
        reply += "3. **Spending Category**: Your top expense category is " + topCat.name + " (" + fmt(topCat.value, currency) + "). Look into small cuts here to increase monthly savings.\n";
      }

      reply += "\n💡 Dynamic Suggestion: Try setting up automated transfers to your savings goal immediately after salary payouts.";
      
      return {
        reply: reply,
        suggestions: ["How much should I save?", "Am I within my budget?", "Show my unusual expenses"]
      };
    }

    // 12. Investment query
    if (/invest|stock|crypto|mutual fund|returns/.test(q)) {
      return {
        reply: "I can share general educational information only, not personalized investment advice.\n\n💡 Suggestion: Based on your current cash flow, prioritize building a 3-6 month emergency fund before allocating capital to volatile assets like stocks or cryptocurrency.",
        suggestions: ["Give me financial advice", "How much should I save?"]
      };
    }

    // 13. Default query
    return {
      reply: "I can help with spending breakdowns, budget status, affordability checks, unusual expenses, and savings planning. Try asking:\n- 'Am I within my budget?'\n- 'Where am I spending the most?'\n- 'Can I afford a ₹15,000 purchase?'",
      suggestions: ["Am I within my budget?", "Where am I spending the most?", "Can I afford a ₹20,000 purchase?"]
    };
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
