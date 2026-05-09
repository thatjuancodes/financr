const {
  calculateProjection,
  buildProjectionResultSummary,
} = require("../projections");

function computeProjectionResult(input) {
  return calculateProjection(
    input.initial_amount,
    input.annual_interest_rate,
    input.duration_months,
    input.monthly_contribution ?? 0
  );
}

function computeProjectionSummary(input) {
  return buildProjectionResultSummary(computeProjectionResult(input));
}

module.exports = {
  computeProjectionResult,
  computeProjectionSummary,
};
