const DEFAULT_EXPECTED_EXPENSE = true;
const STABLE_TOLERANCE_RATIO = 0.01;
const OPTIMIZATION_CUTS = [0.1, 0.2];
const BREAKDOWN_TYPES = new Set(["fixed", "variable", "debt", "savings"]);

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function roundTo(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((toFiniteNumber(value) + Number.EPSILON) * factor) / factor;
}

function safeDivide(numerator, denominator, fallback = 0) {
  const num = toFiniteNumber(numerator);
  const den = toFiniteNumber(denominator);
  if (!Number.isFinite(den) || den === 0) {
    return fallback;
  }
  return num / den;
}

function normalizeType(type, amount) {
  if (type === "income" || type === "expense") {
    return type;
  }
  return toFiniteNumber(amount) >= 0 ? "income" : "expense";
}

function normalizeCategory(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "Uncategorized";
}

function normalizeTransaction(tx, index = 0) {
  const amount = toFiniteNumber(tx?.amount, 0);
  const type = normalizeType(tx?.type, amount);
  const normalizedAmount = type === "expense" ? -Math.abs(amount) : Math.abs(amount);
  const expected =
    tx?.expected === undefined || tx?.expected === null
      ? DEFAULT_EXPECTED_EXPENSE
      : Boolean(tx.expected);

  return {
    id: String(tx?.id ?? `${type}-${index}`),
    date: String(tx?.date || ""),
    amount: roundTo(normalizedAmount, 2),
    category: normalizeCategory(tx?.category),
    type,
    expected,
    breakdownType:
      typeof tx?.breakdownType === "string"
        ? tx.breakdownType.trim().toLowerCase()
        : null,
  };
}

function normalizeTransactions(transactions = []) {
  return Array.isArray(transactions)
    ? transactions.map((tx, index) => normalizeTransaction(tx, index))
    : [];
}

function sortTransactionsByDateDesc(transactions = []) {
  return [...transactions].sort((a, b) => {
    const dateCmp = String(b.date || "").localeCompare(String(a.date || ""));
    if (dateCmp !== 0) {
      return dateCmp;
    }
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}

function summarizeIncome(transactions = []) {
  return transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(toFiniteNumber(tx.amount)), 0);
}

function summarizeExpenses(transactions = []) {
  return transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(toFiniteNumber(tx.amount)), 0);
}

function computeSummary(transactions = [], previousMonthTransactions = []) {
  const income = summarizeIncome(transactions);
  const expenses = summarizeExpenses(transactions);
  const net = income - expenses;

  const previousIncome = summarizeIncome(previousMonthTransactions);
  const previousExpenses = summarizeExpenses(previousMonthTransactions);

  return {
    income: roundTo(income, 2),
    expenses: roundTo(expenses, 2),
    net: roundTo(net, 2),
    savingsRate: roundTo(safeDivide(net, income, 0), 4),
    incomeMoM: roundTo(
      previousIncome === 0 ? 0 : safeDivide(income - previousIncome, previousIncome, 0),
      4
    ),
    expenseMoM: roundTo(
      previousExpenses === 0
        ? 0
        : safeDivide(expenses - previousExpenses, previousExpenses, 0),
      4
    ),
    previousIncome: roundTo(previousIncome, 2),
    previousExpenses: roundTo(previousExpenses, 2),
    previousNet: roundTo(previousIncome - previousExpenses, 2),
  };
}

function sumAccountBalances(accounts = []) {
  if (!Array.isArray(accounts)) {
    return 0;
  }
  return accounts.reduce((sum, account) => sum + toFiniteNumber(account?.balance), 0);
}

function computeBuffer({ summary, accounts = [], previousMonthTransactions = [], previousAccounts = [] }) {
  const currentCash = sumAccountBalances(accounts);
  const previousCash =
    Array.isArray(previousAccounts) && previousAccounts.length > 0
      ? sumAccountBalances(previousAccounts)
      : currentCash - toFiniteNumber(summary?.net);

  const currentExpenses = toFiniteNumber(summary?.expenses);
  const previousExpenses = summarizeExpenses(previousMonthTransactions);

  const current = safeDivide(currentCash, currentExpenses === 0 ? 1 : currentExpenses, 0);
  const previous = safeDivide(previousCash, previousExpenses === 0 ? 1 : previousExpenses, 0);

  return {
    current: roundTo(current, 4),
    previous: roundTo(previous, 4),
    change: roundTo(current - previous, 4),
  };
}

function classifyExpenseTransaction(tx) {
  const explicit = typeof tx?.breakdownType === "string" ? tx.breakdownType : "";
  if (BREAKDOWN_TYPES.has(explicit)) {
    return explicit;
  }

  const category = String(tx?.category || "").trim().toLowerCase();
  if (category.includes("debt") || category.includes("loan")) {
    return "debt";
  }

  return "variable";
}

function computeBreakdown(transactions = [], summary = null) {
  const breakdown = {
    fixed: 0,
    variable: 0,
    debt: 0,
    savings: 0,
  };

  transactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      const type = classifyExpenseTransaction(tx);
      breakdown[type] += Math.abs(toFiniteNumber(tx.amount));
    });

  breakdown.savings = Math.max(toFiniteNumber(summary?.net), 0);

  return {
    fixed: roundTo(breakdown.fixed, 2),
    variable: roundTo(breakdown.variable, 2),
    debt: roundTo(breakdown.debt, 2),
    savings: roundTo(breakdown.savings, 2),
  };
}

function computeExpectedUnexpected(transactions = [], totalExpenses = 0, options = {}) {
  const expectedDefault =
    options?.expectedDefault === undefined
      ? DEFAULT_EXPECTED_EXPENSE
      : Boolean(options.expectedDefault);

  let expected = 0;
  let unexpected = 0;

  transactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      const amount = Math.abs(toFiniteNumber(tx.amount));
      const isExpected =
        tx.expected === undefined || tx.expected === null
          ? expectedDefault
          : Boolean(tx.expected);
      if (isExpected) {
        expected += amount;
      } else {
        unexpected += amount;
      }
    });

  const denominator = totalExpenses === 0 ? 1 : totalExpenses;

  return {
    expected: roundTo(expected, 2),
    unexpected: roundTo(unexpected, 2),
    expectedPercent: roundTo(safeDivide(expected, denominator, 0), 4),
    unexpectedPercent: roundTo(safeDivide(unexpected, denominator, 0), 4),
  };
}

function buildCategoryMap(transactions = []) {
  const map = new Map();
  transactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      const category = normalizeCategory(tx.category);
      const amount = Math.abs(toFiniteNumber(tx.amount));
      map.set(category, (map.get(category) || 0) + amount);
    });
  return map;
}

function computeCategories({ transactions = [], previousMonthTransactions = [], totalExpenses = 0 }) {
  const current = buildCategoryMap(transactions);
  const previous = buildCategoryMap(previousMonthTransactions);

  const categories = Array.from(current.entries()).map(([category, amount]) => {
    const previousAmount = previous.get(category) || 0;
    const percent = safeDivide(amount, totalExpenses === 0 ? 1 : totalExpenses, 0);
    return {
      category,
      amount: roundTo(amount, 2),
      percent: roundTo(percent, 4),
      delta: roundTo(amount - previousAmount, 2),
    };
  });

  categories.sort((a, b) => {
    if (b.amount !== a.amount) {
      return b.amount - a.amount;
    }
    return a.category.localeCompare(b.category);
  });

  return categories;
}

function computeTransactionsList(transactions = []) {
  const normalized = sortTransactionsByDateDesc(transactions);
  return {
    income: normalized.filter((tx) => tx.type === "income"),
    expenses: normalized.filter((tx) => tx.type === "expense"),
  };
}

function computeDeltas(categories = []) {
  const increases = categories
    .filter((item) => toFiniteNumber(item.delta) > 0)
    .sort((a, b) => toFiniteNumber(b.delta) - toFiniteNumber(a.delta));
  const decreases = categories
    .filter((item) => toFiniteNumber(item.delta) < 0)
    .sort((a, b) => toFiniteNumber(a.delta) - toFiniteNumber(b.delta));

  return {
    biggestIncrease: increases.length > 0 ? increases[0].category : null,
    biggestDecrease: decreases.length > 0 ? decreases[0].category : null,
  };
}

function getTrend(values = []) {
  const series = Array.isArray(values)
    ? values.map((value) => toFiniteNumber(value)).filter((value) => Number.isFinite(value))
    : [];
  if (series.length < 2) {
    return "stable";
  }

  const first = series[0];
  const last = series[series.length - 1];
  const delta = last - first;
  const scale = Math.max(Math.abs(first), Math.abs(last), 1);

  if (Math.abs(delta) <= scale * STABLE_TOLERANCE_RATIO) {
    return "stable";
  }

  return delta > 0 ? "up" : "down";
}

function computeTrends({
  summary,
  trendSeries = null,
}) {
  const incomeSeries =
    Array.isArray(trendSeries?.income) && trendSeries.income.length > 0
      ? trendSeries.income
      : [toFiniteNumber(summary.previousIncome), toFiniteNumber(summary.income)];

  const expenseSeries =
    Array.isArray(trendSeries?.expenses) && trendSeries.expenses.length > 0
      ? trendSeries.expenses
      : [toFiniteNumber(summary.previousExpenses), toFiniteNumber(summary.expenses)];

  const netSeries =
    Array.isArray(trendSeries?.net) && trendSeries.net.length > 0
      ? trendSeries.net
      : [toFiniteNumber(summary.previousNet), toFiniteNumber(summary.net)];

  return {
    income: getTrend(incomeSeries),
    expenses: getTrend(expenseSeries),
    net: getTrend(netSeries),
  };
}

function normalizeDebtApr(apr) {
  const numeric = toFiniteNumber(apr, NaN);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (Math.abs(numeric) > 1) {
    return numeric / 100;
  }
  return numeric;
}

function normalizeDebt(debt, index = 0) {
  const aprRate = normalizeDebtApr(debt?.apr);
  return {
    id: String(debt?.id ?? `debt-${index}`),
    balance: roundTo(toFiniteNumber(debt?.balance), 2),
    monthlyPayment: roundTo(Math.abs(toFiniteNumber(debt?.monthlyPayment)), 2),
    ...(aprRate === null ? {} : { apr: aprRate }),
  };
}

function computeDebt({ debts = [], income = 0 }) {
  const normalizedDebts = Array.isArray(debts)
    ? debts.map((debt, index) => normalizeDebt(debt, index))
    : [];

  const total = normalizedDebts.reduce((sum, debt) => sum + toFiniteNumber(debt.balance), 0);
  const monthlyPayment = normalizedDebts.reduce(
    (sum, debt) => sum + Math.abs(toFiniteNumber(debt.monthlyPayment)),
    0
  );

  let hasApr = false;
  const estimatedMonthlyInterest = normalizedDebts.reduce((sum, debt) => {
    if (debt.apr === undefined) {
      return sum;
    }
    hasApr = true;
    const balance = Math.max(toFiniteNumber(debt.balance), 0);
    return sum + balance * safeDivide(toFiniteNumber(debt.apr), 12, 0);
  }, 0);

  const result = {
    total: roundTo(total, 2),
    monthlyPayment: roundTo(monthlyPayment, 2),
    dti: roundTo(safeDivide(monthlyPayment, toFiniteNumber(income), 0), 4),
    debts: normalizedDebts,
  };

  if (hasApr) {
    result.estimatedMonthlyInterest = roundTo(estimatedMonthlyInterest, 2);
  }

  return result;
}

function computeProjection({ income = 0, expenses = 0, accounts = [] }) {
  const monthlyNet = toFiniteNumber(income) - toFiniteNumber(expenses);
  let cash = sumAccountBalances(accounts);
  let lowestPoint = cash;

  for (let i = 0; i < 6; i += 1) {
    cash += monthlyNet;
    if (cash < lowestPoint) {
      lowestPoint = cash;
    }
  }

  const denominator = toFiniteNumber(expenses) === 0 ? 1 : toFiniteNumber(expenses);

  return {
    month6Cash: roundTo(cash, 2),
    lowestPoint: roundTo(lowestPoint, 2),
    bufferAfter: roundTo(safeDivide(cash, denominator, 0), 4),
  };
}

function computeOptimizations(categories = []) {
  const options = [];

  categories.forEach((category) => {
    const amount = toFiniteNumber(category?.amount);
    if (amount <= 0) {
      return;
    }
    OPTIMIZATION_CUTS.forEach((cut) => {
      options.push({
        category: category.category,
        cutPercent: Math.round(cut * 100),
        impact: roundTo(amount * cut * 6, 2),
      });
    });
  });

  options.sort((a, b) => {
    if (b.impact !== a.impact) {
      return b.impact - a.impact;
    }
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.cutPercent - b.cutPercent;
  });

  return options.slice(0, 3);
}

function computeAllowance(categories = [], totalExpenses = 0) {
  const allowanceRow = categories.find(
    (item) => String(item?.category || "").trim().toLowerCase() === "allowance"
  );
  if (!allowanceRow) {
    return undefined;
  }

  const total = toFiniteNumber(allowanceRow.amount);
  return {
    total: roundTo(total, 2),
    percentOfExpenses: roundTo(safeDivide(total, totalExpenses === 0 ? 1 : totalExpenses, 0), 4),
  };
}

function generateMonthlyReport({
  transactions = [],
  previousMonthTransactions = [],
  accounts = [],
  debts = [],
  previousAccounts = [],
  trendSeries = null,
  options = {},
}) {
  const normalizedTransactions = normalizeTransactions(transactions);
  const normalizedPreviousTransactions = normalizeTransactions(previousMonthTransactions);

  const summary = computeSummary(normalizedTransactions, normalizedPreviousTransactions);
  const buffer = computeBuffer({
    summary,
    accounts,
    previousMonthTransactions: normalizedPreviousTransactions,
    previousAccounts,
  });
  const breakdown = computeBreakdown(normalizedTransactions, summary);
  const expectedVsUnexpected = computeExpectedUnexpected(
    normalizedTransactions,
    summary.expenses,
    options
  );
  const categories = computeCategories({
    transactions: normalizedTransactions,
    previousMonthTransactions: normalizedPreviousTransactions,
    totalExpenses: summary.expenses,
  });
  const transactionsList = computeTransactionsList(normalizedTransactions);
  const deltas = computeDeltas(categories);
  const trends = computeTrends({ summary, trendSeries });
  const debt = computeDebt({ debts, income: summary.income });
  const projection = computeProjection({
    income: summary.income,
    expenses: summary.expenses,
    accounts,
  });
  const optimizations = computeOptimizations(categories);
  const allowance = computeAllowance(categories, summary.expenses);

  const report = {
    summary: {
      income: summary.income,
      expenses: summary.expenses,
      net: summary.net,
      savingsRate: summary.savingsRate,
      incomeMoM: summary.incomeMoM,
      expenseMoM: summary.expenseMoM,
    },
    buffer,
    breakdown,
    expectedVsUnexpected,
    categories,
    transactionsList,
    deltas,
    trends,
    debt,
    projection,
    optimizations,
  };

  if (allowance) {
    report.allowance = allowance;
  }

  return report;
}

module.exports = {
  generateMonthlyReport,
  getTrend,
  computeSummary,
  computeBuffer,
  computeExpectedUnexpected,
  computeCategories,
  computeTransactionsList,
  computeTrends,
  computeDebt,
  computeProjection,
  computeOptimizations,
};
