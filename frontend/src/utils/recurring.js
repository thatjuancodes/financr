export const RECURRING_FREQUENCIES = [
  "weekly",
  "monthly",
  "yearly",
  "semi_monthly",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const RECURRING_INCOME_ONLY_FREQUENCIES = new Set(["semi_monthly"]);

export function normalizeRecurringDayInput(value) {
  return String(value ?? "")
    .replace(/[^\d]/g, "")
    .slice(0, 2);
}

function parseRecurringDay(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return null;
  }
  return numeric;
}

function parseIsoDate(value) {
  if (!ISO_DATE.test(String(value || ""))) {
    return null;
  }
  const [year, month, day] = String(value).split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  return { year, month, day };
}

function formatIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInIsoMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addIsoMonths(dateString, monthCount) {
  const parsed = parseIsoDate(dateString);
  if (!parsed) {
    throw new Error("Invalid date");
  }
  const totalMonths = parsed.year * 12 + (parsed.month - 1) + monthCount;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  const nextDay = Math.min(parsed.day, daysInIsoMonth(nextYear, nextMonth));
  return formatIsoDate(nextYear, nextMonth, nextDay);
}

export function normalizeSemiMonthlyDays(day1Raw, day2Raw) {
  const day1 = parseRecurringDay(day1Raw);
  const day2 = parseRecurringDay(day2Raw);
  if (day1 === null && day2 === null) {
    return { valid: true, day1: 15, day2: 30 };
  }
  if (day1 === null || day2 === null) {
    return { valid: false, day1: null, day2: null };
  }
  if (day1 < 1 || day1 > 31 || day2 < 1 || day2 > 31 || day1 === day2) {
    return { valid: false, day1: null, day2: null };
  }
  return day1 < day2
    ? { valid: true, day1, day2 }
    : { valid: true, day1: day2, day2: day1 };
}

export function recurringFrequencyLabel(frequency) {
  if (frequency === "semi_monthly") {
    return "Semi-monthly";
  }
  return String(frequency || "")
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

export function recurringFrequencyOptionsForType(type) {
  return RECURRING_FREQUENCIES.filter((frequency) => {
    if (type === "income") {
      return true;
    }
    return !RECURRING_INCOME_ONLY_FREQUENCIES.has(frequency);
  });
}

export function recurringAccountOptionLabel(account) {
  const name = String(account?.name || "Unnamed account").trim() || "Unnamed account";
  const entityName = String(account?.entity_name || "").trim();
  const currencyCode = String(account?.currency_code || "PHP").trim().toUpperCase() || "PHP";
  return entityName ? `${name} · ${entityName} · ${currencyCode}` : `${name} · ${currencyCode}`;
}

export function recurringTransferRouteLabel(item) {
  const fromLabel = String(item?.from_account_name || "Unknown source").trim();
  const toLabel = String(item?.to_account_name || "Unknown destination").trim();
  return `${fromLabel} → ${toLabel}`;
}

export function getRecurringTransferDirection(item, activeEntityFilterId) {
  if (item?.type !== "transfer") {
    return "neutral";
  }
  const scopedEntityId = String(activeEntityFilterId || "").trim();
  if (!scopedEntityId) {
    return "neutral";
  }
  const fromEntityId = String(item?.from_account_entity_id || "").trim();
  const toEntityId = String(item?.to_account_entity_id || "").trim();
  if (fromEntityId === scopedEntityId && toEntityId === scopedEntityId) {
    return "internal";
  }
  if (fromEntityId === scopedEntityId) {
    return "outgoing";
  }
  if (toEntityId === scopedEntityId) {
    return "incoming";
  }
  return "neutral";
}

export function getRecurringTransferName(item, activeEntityFilterId) {
  const direction = getRecurringTransferDirection(item, activeEntityFilterId);
  if (direction === "outgoing") {
    return `To ${String(item?.to_account_name || "Unknown destination").trim()}`;
  }
  if (direction === "incoming") {
    return `From ${String(item?.from_account_name || "Unknown source").trim()}`;
  }
  return recurringTransferRouteLabel(item);
}

export function getRecurringTransferCategoryLabel(item, activeEntityFilterId) {
  const direction = getRecurringTransferDirection(item, activeEntityFilterId);
  if (direction === "outgoing") {
    if (item?.mirror_as_income_expense) {
      return item?.expense_category_name || "Expense transfer";
    }
    return "Transfer out";
  }
  if (direction === "incoming") {
    if (item?.mirror_as_income_expense) {
      return item?.income_category_name || "Income transfer";
    }
    return "Transfer in";
  }
  if (direction === "internal") {
    return "Internal transfer";
  }
  return item?.mirror_as_income_expense ? "Transfer + income/expense" : "Transfer";
}

export function buildRecurringTransferDestinationAccounts(accounts, sourceAccount) {
  if (!sourceAccount) {
    return [];
  }
  const sourceId = String(sourceAccount.id);
  const sourceCurrency = String(sourceAccount.currency_code || "PHP").trim().toUpperCase();
  return (Array.isArray(accounts) ? accounts : []).filter((account) => {
    if (String(account?.id) === sourceId) {
      return false;
    }
    return String(account?.currency_code || "PHP").trim().toUpperCase() === sourceCurrency;
  });
}

export function isCrossEntityRecurringTransfer(sourceAccount, destinationAccount) {
  if (!sourceAccount || !destinationAccount) {
    return false;
  }
  return String(sourceAccount.entity_id || "") !== String(destinationAccount.entity_id || "");
}

function recurringAmountByFrequency(item) {
  const amount = Number(item?.amount ?? 0);
  if (!Number.isFinite(amount)) {
    return { weekly: 0, monthly: 0 };
  }
  if (item.frequency === "weekly") {
    return { weekly: amount, monthly: amount * (52 / 12) };
  }
  if (item.frequency === "monthly") {
    return { weekly: amount * (12 / 52), monthly: amount };
  }
  if (item.frequency === "yearly") {
    return { weekly: amount / 52, monthly: amount / 12 };
  }
  if (item.frequency === "semi_monthly") {
    return { weekly: amount * (24 / 52), monthly: amount * 2 };
  }
  return { weekly: 0, monthly: 0 };
}

export function recurringMonthlyAmount(item) {
  return recurringAmountByFrequency(item).monthly;
}

export function advanceRecurringDate(dateString, frequency, item = null) {
  if (frequency === "weekly") {
    const parsed = parseIsoDate(dateString);
    if (!parsed) {
      throw new Error("Invalid date");
    }
    const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
    date.setUTCDate(date.getUTCDate() + 7);
    return date.toISOString().slice(0, 10);
  }
  if (frequency === "monthly") {
    return addIsoMonths(dateString, 1);
  }
  if (frequency === "yearly") {
    return addIsoMonths(dateString, 12);
  }
  if (frequency === "semi_monthly") {
    const parsed = parseIsoDate(dateString);
    if (!parsed) {
      throw new Error("Invalid date");
    }
    const normalizedDays = normalizeSemiMonthlyDays(
      item?.semi_monthly_day_1,
      item?.semi_monthly_day_2
    );
    if (!normalizedDays.valid) {
      throw new Error("Invalid semi-monthly days");
    }
    const { day1, day2 } = normalizedDays;
    const monthDays = daysInIsoMonth(parsed.year, parsed.month);
    const currentMonthCandidates = [
      formatIsoDate(parsed.year, parsed.month, Math.min(day1, monthDays)),
      formatIsoDate(parsed.year, parsed.month, Math.min(day2, monthDays)),
    ]
      .filter((candidate) => candidate > dateString)
      .sort();
    if (currentMonthCandidates.length > 0) {
      return currentMonthCandidates[0];
    }
    const nextMonthStart = addIsoMonths(formatIsoDate(parsed.year, parsed.month, 1), 1);
    const nextParsed = parseIsoDate(nextMonthStart);
    const nextMonthDays = daysInIsoMonth(nextParsed.year, nextParsed.month);
    return formatIsoDate(
      nextParsed.year,
      nextParsed.month,
      Math.min(day1, nextMonthDays)
    );
  }
  throw new Error("Invalid recurring frequency");
}

export function getRecurringOccurrencesWithinWindow(item, startDate, endDate) {
  if (
    !item ||
    Number.isNaN(Number(item.amount)) ||
    !ISO_DATE.test(String(item.next_due_date || ""))
  ) {
    return [];
  }
  const occurrences = [];
  let dueDate = String(item.next_due_date);
  while (dueDate < startDate) {
    dueDate = advanceRecurringDate(dueDate, item.frequency, item);
  }
  while (dueDate <= endDate) {
    occurrences.push(dueDate);
    dueDate = advanceRecurringDate(dueDate, item.frequency, item);
  }
  return occurrences;
}

export function getNextRecurringOccurrenceOnOrAfter(item, startDate) {
  if (!item || !ISO_DATE.test(String(item.next_due_date || ""))) {
    return null;
  }
  let dueDate = String(item.next_due_date);
  while (dueDate < startDate) {
    dueDate = advanceRecurringDate(dueDate, item.frequency, item);
  }
  return dueDate;
}

export function calculateRecurringRateTotals(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (totals, item) => {
      const amount = recurringAmountByFrequency(item);
      totals.weekly += amount.weekly;
      totals.monthly += amount.monthly;
      return totals;
    },
    { weekly: 0, monthly: 0 }
  );
}

export function calculateRecurringPerspectiveTotals(items, activeEntityFilterId) {
  return (Array.isArray(items) ? items : []).reduce(
    (totals, item) => {
      if (item?.type !== "transfer") {
        return totals;
      }
      const direction = getRecurringTransferDirection(item, activeEntityFilterId);
      const recurringTotals = recurringAmountByFrequency(item);
      if (direction === "incoming") {
        totals.income.weekly += recurringTotals.weekly;
        totals.income.monthly += recurringTotals.monthly;
      } else if (direction === "outgoing") {
        totals.expense.weekly += recurringTotals.weekly;
        totals.expense.monthly += recurringTotals.monthly;
      }
      return totals;
    },
    {
      income: { weekly: 0, monthly: 0 },
      expense: { weekly: 0, monthly: 0 },
    }
  );
}
