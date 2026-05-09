const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeProjectionResult,
  computeProjectionSummary,
} = require("./engine/projectionsEngine");

test("projections engine computes deterministic projection result", () => {
  const result = computeProjectionResult({
    initial_amount: 1000,
    annual_interest_rate: 0.12,
    duration_months: 12,
    monthly_contribution: 100,
  });

  assert.equal(result.timeline.length, 12);
  assert.equal(result.final_value, 2395.07);
  assert.equal(result.total_contributions, 2200);
  assert.equal(result.total_interest, 195.07);
});

test("projections engine builds compact summary", () => {
  const summary = computeProjectionSummary({
    initial_amount: 5000,
    annual_interest_rate: 0,
    duration_months: 6,
    monthly_contribution: 250,
  });

  assert.deepEqual(summary, {
    final_value: 6500,
    total_contributions: 6500,
    total_interest: 0,
    effective_monthly_contribution: 0,
    adjusted_monthly_net_cashflow: 0,
  });
});
