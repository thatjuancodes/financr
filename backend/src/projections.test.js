const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateProjection,
  buildProjectionScenarioResult,
  normalizeProjectionCashflowAssumptions,
} = require("./projections");

function approxEqual(actual, expected, precision = 0.0001) {
  assert.ok(
    Math.abs(actual - expected) <= precision,
    `Expected ${actual} to be within ${precision} of ${expected}`
  );
}

test("calculateProjection compounds monthly with recurring contributions", () => {
  const result = calculateProjection(1000, 0.12, 12, 100);

  approxEqual(result.final_value, 2395.07, 0.0001);
  approxEqual(result.total_contributions, 2200, 0.0001);
  approxEqual(result.total_interest, 195.07, 0.0001);
  assert.equal(result.timeline.length, 12);
  approxEqual(result.timeline[0].value, 1110, 0.0001);
  approxEqual(result.timeline[11].value, 2395.07, 0.0001);
});

test("calculateProjection handles zero interest", () => {
  const result = calculateProjection(5000, 0, 6, 250);

  approxEqual(result.final_value, 6500, 0.0001);
  approxEqual(result.total_contributions, 6500, 0.0001);
  approxEqual(result.total_interest, 0, 0.0001);
});

test("calculateProjection handles zero monthly contributions", () => {
  const result = calculateProjection(10000, 0.06, 12, 0);

  approxEqual(result.final_value, 10616.79, 0.0001);
  approxEqual(result.total_contributions, 10000, 0.0001);
  approxEqual(result.total_interest, 616.79, 0.0001);
});

test("calculateProjection stays stable for large durations", () => {
  const result = calculateProjection(0, 0.08, 360, 500);

  assert.equal(result.timeline.length, 360);
  approxEqual(result.total_contributions, 180000, 0.0001);
  approxEqual(result.final_value, 745179.23, 0.0001);
  approxEqual(result.total_interest, 565179.23, 0.0001);
});

test("normalizeProjectionCashflowAssumptions applies defaults", () => {
  const result = normalizeProjectionCashflowAssumptions({});

  assert.equal(result.baseline_month_window, 6);
  assert.deepEqual(result.added_recurring_incomes, []);
  assert.deepEqual(result.added_recurring_expenses, []);
  assert.deepEqual(result.expense_category_percent_changes, []);
});

test("buildProjectionScenarioResult applies historical net cashflow and assumptions", () => {
  const result = buildProjectionScenarioResult({
    initial_amount: 1000,
    annual_interest_rate: 0.12,
    duration_months: 12,
    monthly_contribution: 100,
    cashflow_assumptions: {
      baseline_month_window: 2,
      added_recurring_incomes: [
        {
          id: "income-1",
          name: "Side gig",
          amount: 400,
          income_category_id: null,
        },
      ],
      added_recurring_expenses: [
        {
          id: "expense-1",
          name: "Gym",
          amount: 100,
          expense_category_id: 1,
        },
      ],
      expense_category_percent_changes: [
        {
          id: "category-1",
          expense_category_id: 1,
          percent_change: -20,
        },
      ],
    },
    monthly_income_history: [
      { month_key: "2026-04", total: 3000 },
      { month_key: "2026-03", total: 2800 },
      { month_key: "2026-02", total: 1000 },
    ],
    monthly_expense_history: [
      { month_key: "2026-04", total: 2000 },
      { month_key: "2026-03", total: 1800 },
      { month_key: "2026-02", total: 800 },
    ],
    expense_category_monthly_history: [
      {
        month_key: "2026-04",
        expense_category_id: 1,
        expense_category_name: "Food",
        total: 1000,
      },
      {
        month_key: "2026-03",
        expense_category_id: 1,
        expense_category_name: "Food",
        total: 800,
      },
      {
        month_key: "2026-04",
        expense_category_id: 2,
        expense_category_name: "Transport",
        total: 1000,
      },
      {
        month_key: "2026-03",
        expense_category_id: 2,
        expense_category_name: "Transport",
        total: 1000,
      },
    ],
  });

  approxEqual(result.baseline_summary.average_monthly_income, 2900, 0.0001);
  approxEqual(result.baseline_summary.average_monthly_expenses, 1900, 0.0001);
  approxEqual(result.baseline_summary.average_monthly_net_cashflow, 1000, 0.0001);
  approxEqual(
    result.scenario_cashflow_summary.expense_category_adjustment_total,
    -180,
    0.0001
  );
  approxEqual(
    result.scenario_cashflow_summary.adjusted_monthly_net_cashflow,
    480,
    0.0001
  );
  approxEqual(result.effective_monthly_contribution, 580, 0.0001);
  approxEqual(result.total_contributions, 7960, 0.0001);
  approxEqual(result.final_value, 8482.69, 0.0001);
  approxEqual(result.total_interest, 522.69, 0.0001);
  assert.equal(result.timeline.length, 12);
  approxEqual(result.timeline[0].value, 1590, 0.0001);
  approxEqual(result.timeline[11].effective_monthly_contribution, 580, 0.0001);
});
