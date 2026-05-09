import { normalizeSemiMonthlyDays } from "./recurring";

const MONTH_KEY = /^\d{4}-\d{2}$/;

export function normalizeExpenseExpectation(value) {
  return value === "expected" ? "expected" : "unexpected";
}

export function expenseExpectationLabel(value) {
  return normalizeExpenseExpectation(value) === "expected"
    ? "Expected"
    : "Unexpected";
}

export function statementLabel(monthKey) {
  if (typeof monthKey !== "string") {
    return "Statement";
  }
  const [year, month] = monthKey.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return "Statement";
  }
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleString(undefined, { month: "long" });
  return `${monthName} statement`;
}

export function parseMonthKey(monthKey) {
  if (typeof monthKey !== "string" || !MONTH_KEY.test(monthKey)) {
    return null;
  }
  const [year, month] = monthKey.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function getDueDateForStatementMonth(statementMonth, dueDay) {
  const parsedMonth = parseMonthKey(statementMonth);
  const numericDueDay = Number(dueDay);
  if (!parsedMonth || !Number.isInteger(numericDueDay) || numericDueDay < 1 || numericDueDay > 31) {
    return null;
  }
  const nextMonth = parsedMonth.month === 12 ? 1 : parsedMonth.month + 1;
  const nextYear = parsedMonth.month === 12 ? parsedMonth.year + 1 : parsedMonth.year;
  const clampedDay = Math.min(numericDueDay, getDaysInMonth(nextYear, nextMonth));
  return new Date(nextYear, nextMonth - 1, clampedDay);
}

export function diffDaysFromToday(dateValue) {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return null;
  }
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(
    dateValue.getFullYear(),
    dateValue.getMonth(),
    dateValue.getDate()
  );
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((targetStart.getTime() - todayStart.getTime()) / dayMs);
}

export function formatRemainingDaysLabel(days) {
  if (!Number.isInteger(days)) {
    return "-";
  }
  if (days === 0) {
    return "Due today";
  }
  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const overdueDays = Math.abs(days);
  return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
}

export function normalizeMoneyValue(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.abs(numeric) < 0.005 ? 0 : numeric;
}

export function normalizeSuggestionCategoryId(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function suggestionKey(itemOrCategory, maybeCategoryId = null) {
  if (typeof itemOrCategory === "object" && itemOrCategory !== null) {
    return `${normalizeSuggestionCategoryId(itemOrCategory.expense_category_id)}::${String(
      itemOrCategory.category || ""
    )
      .trim()
      .toLowerCase()}`;
  }
  return `${normalizeSuggestionCategoryId(maybeCategoryId)}::${String(
    itemOrCategory || ""
  )
    .trim()
    .toLowerCase()}`;
}

export function isSuggestionSelectedForEncoding(value) {
  return value === true || value === 1 || value === "1";
}

export function formatRecurringFrequencyDisplay(item) {
  if (item?.frequency !== "semi_monthly") {
    return item?.frequency || "";
  }
  const normalized = normalizeSemiMonthlyDays(
    item?.semi_monthly_day_1,
    item?.semi_monthly_day_2
  );
  if (!normalized.valid) {
    return "semi-monthly";
  }
  return `semi-monthly (${normalized.day1}, ${normalized.day2})`;
}

export function formatPercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return "0.0%";
  }
  return `${(numeric * 100).toFixed(1)}%`;
}

export function buildPieSlicePaths(slices, center = 120, radius = 110) {
  const normalizedSlices = Array.isArray(slices)
    ? slices.filter((slice) => Number(slice?.percent ?? 0) > 0)
    : [];
  const totalPercent = normalizedSlices.reduce(
    (sum, slice) => sum + Number(slice?.percent ?? 0),
    0
  );
  if (totalPercent <= 0) {
    return [];
  }
  let cumulative = 0;
  return normalizedSlices.map((slice) => {
    const normalizedPercent = (Number(slice?.percent ?? 0) / totalPercent) * 100;
    const startAngle = (cumulative / 100) * Math.PI * 2;
    cumulative += normalizedPercent;
    const endAngle = (cumulative / 100) * Math.PI * 2;
    const x1 = center + radius * Math.cos(startAngle - Math.PI / 2);
    const y1 = center + radius * Math.sin(startAngle - Math.PI / 2);
    const x2 = center + radius * Math.cos(endAngle - Math.PI / 2);
    const y2 = center + radius * Math.sin(endAngle - Math.PI / 2);
    const largeArc = normalizedPercent > 50 ? 1 : 0;
    return {
      d: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: slice.color,
      category: slice.category,
    };
  });
}
