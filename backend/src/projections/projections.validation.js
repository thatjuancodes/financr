const { normalizeProjectionCashflowAssumptions } = require("../projections");
const { AppError } = require("../errors");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeWorkspaceId(value, defaultWorkspaceId) {
  const normalized = normalizeText(value);
  return normalized || defaultWorkspaceId;
}

function normalizeProjectionScenarioInput(input = {}, options = {}) {
  const {
    defaultWorkspaceId = "default",
    defaultType = "SAVINGS",
    defaultCurrency = "PHP",
    defaultCompoundingFrequency = "monthly",
  } = options;

  let cashflowAssumptions;
  try {
    cashflowAssumptions = normalizeProjectionCashflowAssumptions(
      input.cashflow_assumptions
    );
  } catch (error) {
    throw new AppError(error.message, 400);
  }

  return {
    workspace_id: normalizeWorkspaceId(input.workspace_id, defaultWorkspaceId),
    entity_id: normalizeText(input.entity_id),
    name: normalizeText(input.name),
    type: normalizeText(input.type).toUpperCase() || defaultType,
    currency: normalizeText(input.currency).toUpperCase() || defaultCurrency,
    initial_amount: Number(input.initial_amount),
    annual_interest_rate: Number(input.annual_interest_rate),
    duration_months: Number(input.duration_months),
    monthly_contribution:
      input.monthly_contribution === undefined || input.monthly_contribution === null
        ? 0
        : Number(input.monthly_contribution),
    compounding_frequency:
      normalizeText(input.compounding_frequency).toLowerCase() ||
      defaultCompoundingFrequency,
    cashflow_assumptions: cashflowAssumptions,
    notes: normalizeOptionalText(input.notes),
  };
}

function validateProjectionScenarioInput(input, options = {}) {
  const {
    allowedTypes = new Set(["SAVINGS"]),
    allowedCompoundingFrequencies = new Set(["monthly"]),
  } = options;

  if (!input.workspace_id) {
    throw new AppError("workspace_id is required", 400);
  }
  if (!input.entity_id) {
    throw new AppError("entity_id is required", 400);
  }
  if (!input.name) {
    throw new AppError("name is required", 400);
  }
  if (!allowedTypes.has(input.type)) {
    throw new AppError("type is invalid", 400);
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new AppError("currency is invalid", 400);
  }
  if (!Number.isFinite(input.initial_amount) || input.initial_amount < 0) {
    throw new AppError("initial_amount must be a non-negative number", 400);
  }
  if (
    !Number.isFinite(input.annual_interest_rate) ||
    input.annual_interest_rate < 0 ||
    input.annual_interest_rate > 1
  ) {
    throw new AppError(
      "annual_interest_rate must be between 0 and 1",
      400
    );
  }
  if (
    !Number.isInteger(input.duration_months) ||
    input.duration_months <= 0
  ) {
    throw new AppError("duration_months must be a positive integer", 400);
  }
  if (
    !Number.isFinite(input.monthly_contribution) ||
    input.monthly_contribution < 0
  ) {
    throw new AppError(
      "monthly_contribution must be a non-negative number",
      400
    );
  }
  if (!allowedCompoundingFrequencies.has(input.compounding_frequency)) {
    throw new AppError("compounding_frequency is invalid", 400);
  }
  if (
    !input.cashflow_assumptions ||
    typeof input.cashflow_assumptions !== "object" ||
    Array.isArray(input.cashflow_assumptions)
  ) {
    throw new AppError("cashflow_assumptions is invalid", 400);
  }

  return input;
}

function normalizeProjectionScenarioId(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new AppError("Invalid projection scenario id", 400);
  }
  return normalized;
}

function normalizeProjectionScenarioFilters(query = {}, options = {}) {
  return {
    workspace_id: normalizeWorkspaceId(query.workspace_id, options.defaultWorkspaceId),
    entity_id: query.entity_id === undefined ? null : normalizeText(query.entity_id),
  };
}

module.exports = {
  normalizeProjectionScenarioInput,
  validateProjectionScenarioInput,
  normalizeProjectionScenarioId,
  normalizeProjectionScenarioFilters,
};
