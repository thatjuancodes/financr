function roundMoney(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function normalizeProjectionNumber(value, fieldName) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  return numeric;
}

const DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS = Object.freeze({
  baseline_month_window: 6,
  added_recurring_incomes: [],
  added_recurring_expenses: [],
  expense_category_percent_changes: [],
});

function normalizeProjectionCashflowAssumptions(rawValue) {
  const source =
    rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? rawValue
      : {};

  const baselineMonthWindow = Number.parseInt(
    String(
      source.baseline_month_window ??
        DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS.baseline_month_window
    ),
    10
  );

  const normalizeRecurringAdjustments = (items, type) => {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((item, index) => {
      const name = String(item?.name || "").trim();
      const amount = roundMoney(item?.amount);
      const categoryField =
        type === "income" ? "income_category_id" : "expense_category_id";
      const categoryIdRaw = item?.[categoryField];
      const categoryId =
        categoryIdRaw === null || categoryIdRaw === undefined || categoryIdRaw === ""
          ? null
          : Number.parseInt(String(categoryIdRaw), 10);

      if (!name) {
        throw new Error(
          `${type} recurring adjustment ${index + 1} must include a name`
        );
      }
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error(
          `${type} recurring adjustment ${index + 1} must include a valid amount`
        );
      }
      if (
        categoryId !== null &&
        (!Number.isInteger(categoryId) || categoryId < 0)
      ) {
        throw new Error(
          `${type} recurring adjustment ${index + 1} has an invalid category`
        );
      }

      return {
        id: String(item?.id || `${type}-${index + 1}`),
        name,
        amount,
        [categoryField]: categoryId,
      };
    });
  };

  const normalizeExpenseCategoryPercentChanges = (items) => {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((item, index) => {
      const categoryId = Number.parseInt(
        String(item?.expense_category_id ?? ""),
        10
      );
      const percentChange = Number(item?.percent_change);
      if (!Number.isInteger(categoryId) || categoryId < 0) {
        throw new Error(
          `Expense category adjustment ${index + 1} must include a valid category`
        );
      }
      if (!Number.isFinite(percentChange)) {
        throw new Error(
          `Expense category adjustment ${index + 1} must include a valid percent change`
        );
      }
      return {
        id: String(item?.id || `expense-category-${index + 1}`),
        expense_category_id: categoryId,
        percent_change: roundMoney(percentChange),
      };
    });
  };

  if (!Number.isInteger(baselineMonthWindow) || baselineMonthWindow <= 0) {
    throw new Error("baseline_month_window must be a positive integer");
  }

  return {
    baseline_month_window: baselineMonthWindow,
    added_recurring_incomes: normalizeRecurringAdjustments(
      source.added_recurring_incomes,
      "income"
    ),
    added_recurring_expenses: normalizeRecurringAdjustments(
      source.added_recurring_expenses,
      "expense"
    ),
    expense_category_percent_changes: normalizeExpenseCategoryPercentChanges(
      source.expense_category_percent_changes
    ),
  };
}

function calculateProjection(
  initial_amount,
  annual_interest_rate,
  duration_months,
  monthly_contribution = 0
) {
  const initialAmount = normalizeProjectionNumber(
    initial_amount,
    "initial_amount"
  );
  const annualInterestRate = normalizeProjectionNumber(
    annual_interest_rate,
    "annual_interest_rate"
  );
  const durationMonths = Number(duration_months);
  const monthlyContribution = normalizeProjectionNumber(
    monthly_contribution,
    "monthly_contribution"
  );

  if (!Number.isInteger(durationMonths) || durationMonths <= 0) {
    throw new Error("duration_months must be a positive integer");
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
    timeline,
  };
}

function buildProjectionResultSummary(result) {
  return {
    final_value: roundMoney(result?.final_value ?? 0),
    total_contributions: roundMoney(result?.total_contributions ?? 0),
    total_interest: roundMoney(result?.total_interest ?? 0),
    effective_monthly_contribution: roundMoney(
      result?.effective_monthly_contribution ?? 0
    ),
    adjusted_monthly_net_cashflow: roundMoney(
      result?.scenario_cashflow_summary?.adjusted_monthly_net_cashflow ?? 0
    ),
  };
}

function sortMonthKeysDescending(left, right) {
  return String(right || "").localeCompare(String(left || ""));
}

function buildProjectionScenarioResult({
  initial_amount,
  annual_interest_rate,
  duration_months,
  monthly_contribution = 0,
  cashflow_assumptions = DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS,
  monthly_income_history = [],
  monthly_expense_history = [],
  expense_category_monthly_history = [],
}) {
  const assumptions = normalizeProjectionCashflowAssumptions(cashflow_assumptions);
  const manualMonthlyContribution = roundMoney(monthly_contribution);
  const incomeHistory = Array.isArray(monthly_income_history)
    ? monthly_income_history
    : [];
  const expenseHistory = Array.isArray(monthly_expense_history)
    ? monthly_expense_history
    : [];
  const categoryHistory = Array.isArray(expense_category_monthly_history)
    ? expense_category_monthly_history
    : [];

  const monthKeys = Array.from(
    new Set(
      [...incomeHistory, ...expenseHistory]
        .map((item) => String(item?.month_key || "").trim())
        .filter(Boolean)
    )
  )
    .sort(sortMonthKeysDescending)
    .slice(0, assumptions.baseline_month_window);

  const monthsUsed = monthKeys.length;
  const monthKeySet = new Set(monthKeys);

  const averageForHistory = (items) => {
    if (monthsUsed === 0) {
      return 0;
    }
    const total = items.reduce((sum, item) => {
      const monthKey = String(item?.month_key || "").trim();
      if (!monthKeySet.has(monthKey)) {
        return sum;
      }
      return sum + roundMoney(item?.total);
    }, 0);
    return roundMoney(total / monthsUsed);
  };

  const averageMonthlyIncome = averageForHistory(incomeHistory);
  const averageMonthlyExpenses = averageForHistory(expenseHistory);
  const averageMonthlyNetCashflow = roundMoney(
    averageMonthlyIncome - averageMonthlyExpenses
  );

  const expenseCategoryAveragesMap = new Map();
  categoryHistory.forEach((item) => {
    const monthKey = String(item?.month_key || "").trim();
    if (!monthKeySet.has(monthKey)) {
      return;
    }
    const categoryId = Number.parseInt(
      String(item?.expense_category_id ?? 0),
      10
    );
    if (!Number.isInteger(categoryId) || categoryId < 0) {
      return;
    }
    const existing = expenseCategoryAveragesMap.get(categoryId) || {
      expense_category_id: categoryId,
      expense_category_name:
        item?.expense_category_name === null || item?.expense_category_name === undefined
          ? "Uncategorized"
          : String(item.expense_category_name),
      total: 0,
    };
    existing.total += roundMoney(item?.total);
    expenseCategoryAveragesMap.set(categoryId, existing);
  });

  const averageExpensesByCategory = Array.from(expenseCategoryAveragesMap.values())
    .map((item) => ({
      expense_category_id: item.expense_category_id,
      expense_category_name: item.expense_category_name,
      average_monthly_amount:
        monthsUsed === 0 ? 0 : roundMoney(item.total / monthsUsed),
    }))
    .sort((left, right) =>
      String(left.expense_category_name || "").localeCompare(
        String(right.expense_category_name || "")
      )
    );

  const averageExpenseByCategoryId = new Map(
    averageExpensesByCategory.map((item) => [
      item.expense_category_id,
      item.average_monthly_amount,
    ])
  );

  const addedRecurringIncome = roundMoney(
    assumptions.added_recurring_incomes.reduce(
      (sum, item) => sum + roundMoney(item.amount),
      0
    )
  );
  const addedRecurringExpense = roundMoney(
    assumptions.added_recurring_expenses.reduce(
      (sum, item) => sum + roundMoney(item.amount),
      0
    )
  );

  const expenseCategoryAdjustments = assumptions.expense_category_percent_changes.map(
    (item) => {
      const categoryAverage = roundMoney(
        averageExpenseByCategoryId.get(item.expense_category_id) ?? 0
      );
      const monthlyExpenseDelta = roundMoney(
        categoryAverage * (roundMoney(item.percent_change) / 100)
      );
      const categoryRecord =
        averageExpensesByCategory.find(
          (row) => row.expense_category_id === item.expense_category_id
        ) || null;
      return {
        id: item.id,
        expense_category_id: item.expense_category_id,
        expense_category_name:
          categoryRecord?.expense_category_name || "Uncategorized",
        baseline_average_monthly_amount: categoryAverage,
        percent_change: roundMoney(item.percent_change),
        monthly_expense_delta: monthlyExpenseDelta,
      };
    }
  );

  const expenseCategoryAdjustmentTotal = roundMoney(
    expenseCategoryAdjustments.reduce(
      (sum, item) => sum + roundMoney(item.monthly_expense_delta),
      0
    )
  );

  const adjustedMonthlyIncome = roundMoney(addedRecurringIncome);
  const adjustedMonthlyExpenses = roundMoney(
    addedRecurringExpense + expenseCategoryAdjustmentTotal
  );
  const adjustedMonthlyNetCashflow = roundMoney(
    addedRecurringIncome - addedRecurringExpense - expenseCategoryAdjustmentTotal
  );
  const effectiveMonthlyContribution = roundMoney(
    manualMonthlyContribution + adjustedMonthlyNetCashflow
  );

  const projection = calculateProjection(
    initial_amount,
    annual_interest_rate,
    duration_months,
    effectiveMonthlyContribution
  );

  return {
    ...projection,
    effective_monthly_contribution: effectiveMonthlyContribution,
    manual_monthly_contribution: manualMonthlyContribution,
    baseline_summary: {
      months_used: monthsUsed,
      month_keys: monthKeys,
      average_monthly_income: averageMonthlyIncome,
      average_monthly_expenses: averageMonthlyExpenses,
      average_monthly_net_cashflow: averageMonthlyNetCashflow,
      average_expenses_by_category: averageExpensesByCategory,
    },
    scenario_cashflow_summary: {
      added_recurring_income: addedRecurringIncome,
      added_recurring_expense: addedRecurringExpense,
      expense_category_adjustment_total: expenseCategoryAdjustmentTotal,
      adjusted_monthly_income: adjustedMonthlyIncome,
      adjusted_monthly_expenses: adjustedMonthlyExpenses,
      adjusted_monthly_net_cashflow: adjustedMonthlyNetCashflow,
      expense_category_adjustments: expenseCategoryAdjustments,
    },
    cashflow_assumptions: assumptions,
    timeline: projection.timeline.map((item) => ({
      ...item,
      effective_monthly_contribution: effectiveMonthlyContribution,
    })),
  };
}

module.exports = {
  DEFAULT_PROJECTION_CASHFLOW_ASSUMPTIONS,
  buildProjectionResultSummary,
  buildProjectionScenarioResult,
  calculateProjection,
  normalizeProjectionCashflowAssumptions,
  roundMoney,
};
