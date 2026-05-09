const test = require("node:test");
const assert = require("node:assert/strict");
const { generateMonthlyReport } = require("./generateMonthlyReport");

function approxEqual(actual, expected, precision = 0.0001) {
  assert.ok(
    Math.abs(actual - expected) <= precision,
    `Expected ${actual} to be within ${precision} of ${expected}`
  );
}

test("generateMonthlyReport computes deterministic monthly report fields", () => {
  const report = generateMonthlyReport({
    transactions: [
      {
        id: "income-1",
        date: "2026-03-30",
        amount: 5000,
        category: "Salary",
        type: "income",
      },
      {
        id: "expense-1",
        date: "2026-03-05",
        amount: -2000,
        category: "Rent",
        type: "expense",
        expected: true,
      },
      {
        id: "expense-2",
        date: "2026-03-12",
        amount: -600,
        category: "Groceries",
        type: "expense",
        expected: false,
      },
      {
        id: "expense-3",
        date: "2026-03-20",
        amount: -200,
        category: "Allowance",
        type: "expense",
      },
    ],
    previousMonthTransactions: [
      {
        id: "income-prev-1",
        date: "2026-02-28",
        amount: 4500,
        category: "Salary",
        type: "income",
      },
      {
        id: "expense-prev-1",
        date: "2026-02-05",
        amount: -1900,
        category: "Rent",
        type: "expense",
        expected: true,
      },
      {
        id: "expense-prev-2",
        date: "2026-02-12",
        amount: -400,
        category: "Groceries",
        type: "expense",
        expected: false,
      },
    ],
    accounts: [{ id: "cash", balance: 3200 }],
    debts: [{ id: "loan-a", balance: 5000, monthlyPayment: 300, apr: 12 }],
    trendSeries: {
      income: [4300, 4500, 5000],
      expenses: [2100, 2300, 2800],
      net: [2300, 2200, 2290],
    },
  });

  assert.deepEqual(report.summary, {
    income: 5000,
    expenses: 2800,
    net: 2200,
    savingsRate: 0.44,
    incomeMoM: 0.1111,
    expenseMoM: 0.2174,
  });

  assert.deepEqual(report.buffer, {
    current: 1.1429,
    previous: 0.4348,
    change: 0.7081,
  });

  assert.deepEqual(report.expectedVsUnexpected, {
    expected: 2200,
    unexpected: 600,
    expectedPercent: 0.7857,
    unexpectedPercent: 0.2143,
  });

  assert.equal(report.categories.length, 3);
  assert.equal(report.categories[0].category, "Rent");
  assert.equal(report.categories[0].amount, 2000);
  assert.equal(report.categories[0].delta, 100);

  assert.equal(report.deltas.biggestIncrease, "Groceries");
  assert.equal(report.deltas.biggestDecrease, null);

  assert.deepEqual(report.trends, {
    income: "up",
    expenses: "up",
    net: "stable",
  });

  assert.deepEqual(report.debt, {
    total: 5000,
    monthlyPayment: 300,
    dti: 0.06,
    estimatedMonthlyInterest: 50,
    debts: [{ id: "loan-a", balance: 5000, monthlyPayment: 300, apr: 0.12 }],
  });

  approxEqual(report.projection.month6Cash, 16400, 0.001);
  approxEqual(report.projection.lowestPoint, 3200, 0.001);
  approxEqual(report.projection.bufferAfter, 5.8571, 0.0001);

  assert.equal(report.optimizations.length, 3);
  assert.deepEqual(report.optimizations[0], {
    category: "Rent",
    cutPercent: 20,
    impact: 2400,
  });

  assert.deepEqual(report.allowance, {
    total: 200,
    percentOfExpenses: 0.0714,
  });

  assert.equal(report.transactionsList.income[0].id, "income-1");
  assert.deepEqual(
    report.transactionsList.expenses.map((tx) => tx.id),
    ["expense-3", "expense-2", "expense-1"]
  );
});

test("generateMonthlyReport handles zero income/expense and negative balances", () => {
  const report = generateMonthlyReport({
    transactions: [],
    previousMonthTransactions: [],
    accounts: [{ id: "cash", balance: -200 }],
    debts: [],
  });

  assert.deepEqual(report.summary, {
    income: 0,
    expenses: 0,
    net: 0,
    savingsRate: 0,
    incomeMoM: 0,
    expenseMoM: 0,
  });

  assert.deepEqual(report.buffer, {
    current: -200,
    previous: -200,
    change: 0,
  });

  assert.deepEqual(report.categories, []);
  assert.deepEqual(report.expectedVsUnexpected, {
    expected: 0,
    unexpected: 0,
    expectedPercent: 0,
    unexpectedPercent: 0,
  });

  assert.deepEqual(report.trends, {
    income: "stable",
    expenses: "stable",
    net: "stable",
  });

  assert.deepEqual(report.projection, {
    month6Cash: -200,
    lowestPoint: -200,
    bufferAfter: -200,
  });

  assert.equal(report.allowance, undefined);
});
