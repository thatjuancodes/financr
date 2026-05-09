export function sortProjectionScenarios(items) {
  return [...items].sort((left, right) =>
    String(right.updated_at || "").localeCompare(String(left.updated_at || ""))
  );
}

export function buildNewScenarioName(existingScenarios) {
  const existingNames = new Set(
    existingScenarios.map((item) => String(item?.name || "").trim().toLowerCase())
  );
  let index = existingScenarios.length + 1;
  let nextName = `Projection ${index}`;
  while (existingNames.has(nextName.toLowerCase())) {
    index += 1;
    nextName = `Projection ${index}`;
  }
  return nextName;
}

export function scenarioMatchesPayload(scenario, payload) {
  if (!scenario || !payload) {
    return false;
  }
  return (
    String(scenario.workspace_id || "") === String(payload.workspace_id || "") &&
    String(scenario.entity_id || "") === String(payload.entity_id || "") &&
    String(scenario.name || "") === String(payload.name || "") &&
    String(scenario.type || "") === String(payload.type || "") &&
    String(scenario.currency || "") === String(payload.currency || "") &&
    Number(scenario.initial_amount ?? 0) === Number(payload.initial_amount ?? 0) &&
    Number(scenario.annual_interest_rate ?? 0) ===
      Number(payload.annual_interest_rate ?? 0) &&
    Number(scenario.duration_months ?? 0) === Number(payload.duration_months ?? 0) &&
    Number(scenario.monthly_contribution ?? 0) ===
      Number(payload.monthly_contribution ?? 0) &&
    String(scenario.compounding_frequency || "") ===
      String(payload.compounding_frequency || "") &&
    String(scenario.notes || "") === String(payload.notes || "") &&
    JSON.stringify(scenario.cashflow_assumptions || {}) ===
      JSON.stringify(payload.cashflow_assumptions || {})
  );
}

export function getCategoryAverageAmount(result, categoryId) {
  const numericCategoryId = Number.parseInt(String(categoryId || ""), 10);
  if (!result || !Number.isInteger(numericCategoryId)) {
    return 0;
  }
  const match = (result.baseline_summary?.average_expenses_by_category || []).find(
    (item) => Number(item?.expense_category_id) === numericCategoryId
  );
  return Number(match?.average_monthly_amount ?? 0);
}
