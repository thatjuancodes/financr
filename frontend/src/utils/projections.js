import { formatAmountInput, parseAmountInput } from "./format";

export const DEFAULT_PROJECTION_WORKSPACE_ID = "default";

export const DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS = {
  baseline_month_window: 6,
  added_recurring_incomes: [],
  added_recurring_expenses: [],
  expense_category_percent_changes: [],
};

export const DEFAULT_PROJECTION_SCENARIO_PAYLOAD = {
  workspace_id: DEFAULT_PROJECTION_WORKSPACE_ID,
  entity_id: "",
  name: "Projection 1",
  type: "SAVINGS",
  currency: "PHP",
  initial_amount: 0,
  annual_interest_rate: 0.12,
  duration_months: 12,
  monthly_contribution: 0,
  compounding_frequency: "monthly",
  cashflow_assumptions: DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS,
  notes: null,
};

function roundMoney(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function formatDraftNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  const rounded = Math.round((numeric + Number.EPSILON) * 1000000) / 1000000;
  return String(rounded);
}

function formatDraftAmount(value) {
  return formatAmountInput(formatDraftNumber(value));
}

function formatDraftInteger(value, fallback = "0") {
  const numeric = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isInteger(numeric)) {
    return fallback;
  }
  return String(numeric);
}

function normalizeCashflowAssumptions(source = DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS) {
  const value =
    source && typeof source === "object" && !Array.isArray(source) ? source : {};
  return {
    baseline_month_window: Number.parseInt(
      String(
        value.baseline_month_window ??
          DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS.baseline_month_window
      ),
      10
    ) || DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS.baseline_month_window,
    added_recurring_incomes: Array.isArray(value.added_recurring_incomes)
      ? value.added_recurring_incomes
      : [],
    added_recurring_expenses: Array.isArray(value.added_recurring_expenses)
      ? value.added_recurring_expenses
      : [],
    expense_category_percent_changes: Array.isArray(
      value.expense_category_percent_changes
    )
      ? value.expense_category_percent_changes
      : [],
  };
}

function createIncomeAdjustmentDraft(item = {}, index = 0) {
  return {
    id: String(item.id || `income-${index + 1}`),
    name: String(item.name || ""),
    amount: formatDraftAmount(item.amount ?? 0),
    income_category_id:
      item.income_category_id === null || item.income_category_id === undefined
        ? ""
        : String(item.income_category_id),
  };
}

function createExpenseAdjustmentDraft(item = {}, index = 0) {
  return {
    id: String(item.id || `expense-${index + 1}`),
    name: String(item.name || ""),
    amount: formatDraftAmount(item.amount ?? 0),
    expense_category_id:
      item.expense_category_id === null || item.expense_category_id === undefined
        ? ""
        : String(item.expense_category_id),
  };
}

function createExpenseCategoryChangeDraft(item = {}, index = 0) {
  return {
    id: String(item.id || `expense-category-${index + 1}`),
    expense_category_id:
      item.expense_category_id === null || item.expense_category_id === undefined
        ? ""
        : String(item.expense_category_id),
    percent_change: formatDraftNumber(item.percent_change ?? 0),
  };
}

export function createNewProjectionIncomeAdjustmentDraft(index = 0) {
  return createIncomeAdjustmentDraft({}, index);
}

export function createNewProjectionExpenseAdjustmentDraft(index = 0) {
  return createExpenseAdjustmentDraft({}, index);
}

export function createNewProjectionExpenseCategoryChangeDraft(index = 0) {
  return createExpenseCategoryChangeDraft({}, index);
}

export function calculateProjection(
  initial_amount,
  annual_interest_rate,
  duration_months,
  monthly_contribution = 0
) {
  const initialAmount = Number(initial_amount ?? 0);
  const annualInterestRate = Number(annual_interest_rate ?? 0);
  const durationMonths = Number(duration_months ?? 0);
  const monthlyContribution = Number(monthly_contribution ?? 0);

  if (
    !Number.isFinite(initialAmount) ||
    !Number.isFinite(annualInterestRate) ||
    !Number.isInteger(durationMonths) ||
    !Number.isFinite(monthlyContribution) ||
    durationMonths <= 0
  ) {
    return null;
  }

  const monthlyRate = annualInterestRate / 12;
  let value = roundMoney(initialAmount);
  const timeline = [];

  for (let month = 1; month <= durationMonths; month += 1) {
    value = roundMoney(value * (1 + monthlyRate));
    value = roundMoney(value + monthlyContribution);
    const totalContributions = roundMoney(
      initialAmount + monthlyContribution * month
    );
    timeline.push({
      month,
      value,
      total_contributions: totalContributions,
      total_interest: roundMoney(value - totalContributions),
      effective_monthly_contribution: roundMoney(monthlyContribution),
    });
  }

  const totalContributions = roundMoney(
    initialAmount + monthlyContribution * durationMonths
  );
  const finalValue = roundMoney(value);
  const totalInterest = roundMoney(finalValue - totalContributions);

  return {
    final_value: finalValue,
    total_contributions: totalContributions,
    total_interest: totalInterest,
    effective_monthly_contribution: roundMoney(monthlyContribution),
    timeline,
  };
}

export function decorateProjectionResult(
  result,
  initial_amount,
  monthly_contribution = 0
) {
  if (!result || !Array.isArray(result.timeline)) {
    return result;
  }

  const initialAmount = roundMoney(initial_amount);
  const monthlyContribution = roundMoney(monthly_contribution);

  return {
    ...result,
    effective_monthly_contribution: roundMoney(
      result?.effective_monthly_contribution ?? monthlyContribution
    ),
    timeline: result.timeline.map((point, index) => {
      if (
        Number.isFinite(Number(point?.total_contributions)) &&
        Number.isFinite(Number(point?.total_interest))
      ) {
        return {
          ...point,
          total_contributions: roundMoney(point.total_contributions),
          total_interest: roundMoney(point.total_interest),
          effective_monthly_contribution: roundMoney(
            point?.effective_monthly_contribution ?? monthlyContribution
          ),
        };
      }

      const totalContributions = roundMoney(
        initialAmount + monthlyContribution * (index + 1)
      );
      const value = roundMoney(point?.value);
      return {
        ...point,
        value,
        total_contributions: totalContributions,
        total_interest: roundMoney(value - totalContributions),
        effective_monthly_contribution: roundMoney(monthlyContribution),
      };
    }),
  };
}

export function createProjectionDraft(scenario = DEFAULT_PROJECTION_SCENARIO_PAYLOAD) {
  const assumptions = normalizeCashflowAssumptions(scenario.cashflow_assumptions);
  return {
    workspace_id:
      String(scenario.workspace_id || DEFAULT_PROJECTION_WORKSPACE_ID).trim() ||
      DEFAULT_PROJECTION_WORKSPACE_ID,
    entity_id: String(scenario.entity_id || ""),
    name: String(scenario.name || ""),
    type: String(scenario.type || "SAVINGS"),
    currency: String(scenario.currency || "PHP"),
    initial_amount: formatDraftAmount(scenario.initial_amount ?? 0),
    annual_interest_rate_percent: formatDraftNumber(
      Number(scenario.annual_interest_rate ?? 0) * 100
    ),
    duration_months: String(scenario.duration_months ?? 12),
    monthly_contribution: formatDraftAmount(scenario.monthly_contribution ?? 0),
    compounding_frequency: String(scenario.compounding_frequency || "monthly"),
    notes: String(scenario.notes || ""),
    cashflow_assumptions: {
      baseline_month_window: formatDraftInteger(assumptions.baseline_month_window, "6"),
      added_recurring_incomes: assumptions.added_recurring_incomes.map(
        createIncomeAdjustmentDraft
      ),
      added_recurring_expenses: assumptions.added_recurring_expenses.map(
        createExpenseAdjustmentDraft
      ),
      expense_category_percent_changes:
        assumptions.expense_category_percent_changes.map(
          createExpenseCategoryChangeDraft
        ),
    },
  };
}

export function draftToProjectionPayload(draft) {
  const assumptions = normalizeCashflowAssumptions(draft?.cashflow_assumptions);
  return {
    workspace_id:
      String(draft?.workspace_id || DEFAULT_PROJECTION_WORKSPACE_ID).trim() ||
      DEFAULT_PROJECTION_WORKSPACE_ID,
    entity_id: String(draft?.entity_id || "").trim(),
    name: String(draft?.name || "").trim(),
    type: String(draft?.type || "SAVINGS").trim().toUpperCase() || "SAVINGS",
    currency: String(draft?.currency || "PHP").trim().toUpperCase() || "PHP",
    initial_amount: Number(parseAmountInput(String(draft?.initial_amount || ""))),
    annual_interest_rate:
      Number(parseAmountInput(String(draft?.annual_interest_rate_percent || ""))) / 100,
    duration_months: Number.parseInt(String(draft?.duration_months || ""), 10),
    monthly_contribution: Number(
      parseAmountInput(String(draft?.monthly_contribution || "0"))
    ),
    compounding_frequency:
      String(draft?.compounding_frequency || "monthly").trim().toLowerCase() ||
      "monthly",
    cashflow_assumptions: {
      baseline_month_window: Number.parseInt(
        String(assumptions.baseline_month_window || "6"),
        10
      ),
      added_recurring_incomes: (assumptions.added_recurring_incomes || []).map(
        (item, index) => ({
          id: String(item?.id || `income-${index + 1}`),
          name: String(item?.name || "").trim(),
          amount: Number(parseAmountInput(String(item?.amount || "0"))),
          income_category_id:
            item?.income_category_id === null ||
            item?.income_category_id === undefined ||
            String(item.income_category_id).trim() === ""
              ? null
              : Number.parseInt(String(item.income_category_id), 10),
        })
      ),
      added_recurring_expenses: (assumptions.added_recurring_expenses || []).map(
        (item, index) => ({
          id: String(item?.id || `expense-${index + 1}`),
          name: String(item?.name || "").trim(),
          amount: Number(parseAmountInput(String(item?.amount || "0"))),
          expense_category_id:
            item?.expense_category_id === null ||
            item?.expense_category_id === undefined ||
            String(item.expense_category_id).trim() === ""
              ? null
              : Number.parseInt(String(item.expense_category_id), 10),
        })
      ),
      expense_category_percent_changes: (
        assumptions.expense_category_percent_changes || []
      ).map((item, index) => ({
        id: String(item?.id || `expense-category-${index + 1}`),
        expense_category_id: Number.parseInt(
          String(item?.expense_category_id || ""),
          10
        ),
        percent_change: Number(item?.percent_change),
      })),
    },
    notes: String(draft?.notes || "").trim() || null,
  };
}

export function validateProjectionDraft(draft) {
  const payload = draftToProjectionPayload(draft);

  if (!payload.name) {
    return "Name is required.";
  }
  if (!payload.entity_id) {
    return "Entity is required.";
  }
  if (!Number.isFinite(payload.initial_amount) || payload.initial_amount < 0) {
    return "Initial amount must be 0 or greater.";
  }
  if (
    !Number.isFinite(payload.annual_interest_rate) ||
    payload.annual_interest_rate < 0 ||
    payload.annual_interest_rate > 1
  ) {
    return "Interest rate must be between 0% and 100%.";
  }
  if (!Number.isInteger(payload.duration_months) || payload.duration_months <= 0) {
    return "Duration must be greater than 0 months.";
  }
  if (!Number.isFinite(payload.monthly_contribution)) {
    return "Monthly contribution must be a valid amount.";
  }
  if (
    !Number.isInteger(payload.cashflow_assumptions.baseline_month_window) ||
    payload.cashflow_assumptions.baseline_month_window <= 0
  ) {
    return "Historical baseline window must be greater than 0 months.";
  }

  for (const item of payload.cashflow_assumptions.added_recurring_incomes) {
    if (!item.name) {
      return "Each recurring income assumption needs a name.";
    }
    if (!Number.isFinite(item.amount) || item.amount < 0) {
      return "Recurring income assumptions need valid amounts.";
    }
  }

  for (const item of payload.cashflow_assumptions.added_recurring_expenses) {
    if (!item.name) {
      return "Each recurring expense assumption needs a name.";
    }
    if (!Number.isFinite(item.amount) || item.amount < 0) {
      return "Recurring expense assumptions need valid amounts.";
    }
  }

  for (const item of payload.cashflow_assumptions.expense_category_percent_changes) {
    if (!Number.isInteger(item.expense_category_id) || item.expense_category_id < 0) {
      return "Each expense category adjustment needs a category.";
    }
    if (!Number.isFinite(item.percent_change)) {
      return "Expense category adjustments need a valid percent change.";
    }
  }

  return "";
}

export function buildProjectionScenarioSummary(scenario) {
  if (scenario?.result_summary) {
    return scenario;
  }

  const result = calculateProjection(
    scenario.initial_amount,
    scenario.annual_interest_rate,
    scenario.duration_months,
    scenario.monthly_contribution
  );
  if (!result) {
    return scenario;
  }
  return {
    ...scenario,
    result_summary: {
      final_value: result.final_value,
      total_contributions: result.total_contributions,
      total_interest: result.total_interest,
      effective_monthly_contribution: result.effective_monthly_contribution,
      adjusted_monthly_net_cashflow: 0,
    },
  };
}
