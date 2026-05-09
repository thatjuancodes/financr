import { currentMonthKey } from "./format";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_KEY = /^\d{4}-\d{2}$/;
export const REPORT_HASH_PREFIX = "#/reports/";
export const ALL_ENTITIES_VALUE = "all";

export function isValidMonthKey(value) {
  if (typeof value !== "string" || !MONTH_KEY.test(value)) {
    return false;
  }
  const [year, month] = value.split("-").map(Number);
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

export function parseAppHashRoute(hashValue = "") {
  const hash = String(hashValue || "");
  if (hash.startsWith(REPORT_HASH_PREFIX)) {
    const monthKey = hash.slice(REPORT_HASH_PREFIX.length).trim();
    if (isValidMonthKey(monthKey)) {
      return { view: "reports", reportsMode: "detail", monthKey };
    }
    return { view: "reports", reportsMode: "list", monthKey: "" };
  }
  if (hash === "#/reports") {
    return { view: "reports", reportsMode: "list", monthKey: "" };
  }
  if (hash.startsWith("#/")) {
    const view = hash.slice(2).trim();
    if (
      [
        "balance",
        "accounts",
        "projections",
        "insurance",
        "income",
        "expenses",
        "recurring",
        "debts",
        "config",
      ].includes(view)
    ) {
      return { view, reportsMode: "list", monthKey: "" };
    }
  }
  return null;
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

export function isSuggestionSelectedForEncoding(item) {
  return (
    item?.selected_for_encoding === true ||
    item?.selected_for_encoding === 1 ||
    item?.selected_for_encoding === "1"
  );
}

export function expenseSuggestionKey(name, expenseCategoryId) {
  return `${normalizeSuggestionCategoryId(expenseCategoryId)}::${String(name || "")
    .trim()
    .toLowerCase()}`;
}

export function getStatementDay(config) {
  const day = Number(config?.statement_day);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return null;
  }
  return day;
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function shiftMonthKey(monthKey, monthOffset) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return monthKey;
  }
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + monthOffset);
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function getCalendarMonthWindow(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }
  const endDay = String(daysInMonth(year, month)).padStart(2, "0");
  return {
    startDate: `${monthKey}-01`,
    endDate: `${monthKey}-${endDay}`,
  };
}

export function getStatementCycleWindow(monthKey, statementDay) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }
  const endDay = String(Math.min(statementDay, daysInMonth(year, month))).padStart(
    2,
    "0"
  );
  const endDate = `${monthKey}-${endDay}`;
  const previousMonthKey = shiftMonthKey(monthKey, -1);
  const [prevYear, prevMonth] = previousMonthKey.split("-").map(Number);
  if (!Number.isInteger(prevYear) || !Number.isInteger(prevMonth)) {
    return null;
  }
  const startDay = String(
    Math.min(statementDay, daysInMonth(prevYear, prevMonth))
  ).padStart(2, "0");
  const startDate = `${previousMonthKey}-${startDay}`;
  return { startDate, endDate };
}

export function buildDebtCycleMonthsFromData(debts, loanOriginConfigs) {
  const configMap = new Map();
  loanOriginConfigs.forEach((item) => {
    if (item.loan_origin) {
      configMap.set(item.loan_origin, item);
    }
  });

  const months = new Set([currentMonthKey()]);
  debts.forEach((item) => {
    const statementMonth =
      typeof item?.statement_month === "string" ? item.statement_month : "";
    if (isValidMonthKey(statementMonth)) {
      months.add(statementMonth);
      return;
    }
    const fallbackStatementMonth = getFallbackDebtStatementMonth(item, configMap);
    if (fallbackStatementMonth) {
      months.add(fallbackStatementMonth);
    }
  });

  return Array.from(months).sort().reverse();
}

export function getFallbackDebtStatementMonth(item, configMap) {
  const spentAt = typeof item?.spent_at === "string" ? item.spent_at : "";
  if (!ISO_DATE.test(spentAt)) {
    return null;
  }
  const monthKey = spentAt.slice(0, 7);
  const statementDay = getStatementDay(configMap.get(item.loan_origin));
  if (statementDay === null) {
    return monthKey;
  }
  const day = Number(spentAt.slice(8, 10));
  if (!Number.isInteger(day)) {
    return monthKey;
  }
  return day >= statementDay ? shiftMonthKey(monthKey, 1) : monthKey;
}

export function getDebtStatementMonth(item, configMap) {
  const statementMonth =
    typeof item?.statement_month === "string" ? item.statement_month : "";
  if (isValidMonthKey(statementMonth)) {
    return statementMonth;
  }
  return getFallbackDebtStatementMonth(item, configMap);
}

export function selectDefaultEntityId(entities, preferredId = "") {
  const rows = Array.isArray(entities) ? entities : [];
  const preferred = String(preferredId || "");
  if (preferred === ALL_ENTITIES_VALUE) {
    return ALL_ENTITIES_VALUE;
  }
  if (preferred && rows.some((item) => String(item?.id) === preferred)) {
    return preferred;
  }
  const personal = rows.find((item) => String(item?.type || "") === "personal");
  return String(personal?.id || rows[0]?.id || "");
}

export function summarizeDashboardEntityBalances(accounts) {
  const totals = new Map();
  (Array.isArray(accounts) ? accounts : []).forEach((item) => {
    const currencyCode =
      String(item?.currency_code || "PHP").trim().toUpperCase() || "PHP";
    const amount = Number(item?.balance ?? 0);
    if (!Number.isFinite(amount)) {
      return;
    }
    totals.set(currencyCode, Number(totals.get(currencyCode) || 0) + amount);
  });
  return Array.from(totals.entries())
    .map(([currency_code, total]) => ({ currency_code, total }))
    .sort((left, right) => left.currency_code.localeCompare(right.currency_code));
}

export function debtBelongsToStatementCycle(item, cycleMonth, configMap) {
  return getDebtStatementMonth(item, configMap) === cycleMonth;
}
