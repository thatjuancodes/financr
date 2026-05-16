import { monthLabel, todayISO } from "@/utils/format";
import {
  getNextRecurringOccurrenceOnOrAfter,
  recurringMonthlyAmount,
} from "@/utils/recurring";
import type {
  AccountRecord,
  BalanceRecord,
  BudgetRecord,
  CategoryRecord,
  DebtRecord,
  ExpenseRecord,
  IncomeRecord,
  RecurringItemRecord,
  TransactionRecord,
} from "@/types/finance";

export const ALL_ENTITIES_ID = "all";

export function formatCurrency(value: number, currency = "PHP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatCompactCurrency(value: number, currency = "PHP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isoDateKey(value: string) {
  return String(value || "").slice(0, 10);
}

export function monthKey(value: string) {
  return String(value || "").slice(0, 7);
}

export function localMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function sortByDateDesc<T extends { created_at?: string; next_due_date?: string }>(
  items: T[],
  field: "created_at" | "next_due_date" = "created_at"
) {
  return [...items].sort((a, b) =>
    String(b?.[field] || "").localeCompare(String(a?.[field] || ""))
  );
}

export function buildAccountAccent(account: AccountRecord) {
  const palette = {
    bank: "#2563EB",
    ewallet: "#14B8A6",
    cash: "#F97316",
    card: "#DC2626",
    credit: "#DC2626",
    savings: "#16A34A",
  } as Record<string, string>;
  const normalized = String(account.type || "").trim().toLowerCase();
  return palette[normalized] || "#64748B";
}

export function buildAccountIcon(account: AccountRecord) {
  const normalized = String(account.type || "").trim().toLowerCase();
  if (normalized.includes("cash")) return "ri-wallet-3-line";
  if (normalized.includes("credit") || normalized.includes("card")) {
    return "ri-bank-card-line";
  }
  if (normalized.includes("ewallet")) return "ri-smartphone-line";
  if (normalized.includes("savings")) return "ri-safe-2-line";
  return "ri-bank-line";
}

export function transactionMatchesEntity(
  transaction: TransactionRecord,
  selectedEntityId: string
) {
  if (!selectedEntityId || selectedEntityId === ALL_ENTITIES_ID) {
    return true;
  }
  return (
    String(transaction.from_entity_id || "") === selectedEntityId ||
    String(transaction.to_entity_id || "") === selectedEntityId
  );
}

export function scopedTransactions(
  transactions: TransactionRecord[],
  selectedEntityId: string
) {
  return transactions.filter((transaction) =>
    transactionMatchesEntity(transaction, selectedEntityId)
  );
}

export function buildCashflowSeries(transactions: TransactionRecord[], months = 4) {
  const bucket = new Map<string, { month: string; income: number; expense: number; net: number }>();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - (months - 1));
  cutoff.setDate(1);

  transactions.forEach((transaction) => {
    const date = new Date(transaction.created_at);
    if (Number.isNaN(date.getTime()) || date < cutoff) {
      return;
    }
    if (transaction.type === "transfer") {
      return;
    }
    const key = monthKey(transaction.created_at);
    const row = bucket.get(key) || { month: key, income: 0, expense: 0, net: 0 };
    if (transaction.type === "income") {
      row.income += Number(transaction.amount || 0);
    } else {
      row.expense += Number(transaction.amount || 0);
    }
    row.net = row.income - row.expense;
    bucket.set(key, row);
  });

  return Array.from(bucket.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      ...row,
      label: monthLabel(row.month),
      shortLabel: formatMonthShort(row.month),
    }));
}

export function buildCashflowTimeline(transactions: TransactionRecord[], days = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - Math.max(days - 1, 0));

  const buckets = new Map<
    string,
    { date: string; label: string; income: number; expense: number; net: number }
  >();

  for (let cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const dateKey = cursor.toISOString().slice(0, 10);
    buckets.set(dateKey, {
      date: dateKey,
      label: cursor.toLocaleDateString(undefined, {
        month: days > 31 ? "short" : undefined,
        day: "numeric",
      }),
      income: 0,
      expense: 0,
      net: 0,
    });
  }

  transactions.forEach((transaction) => {
    if (transaction.type === "transfer") {
      return;
    }
    const date = new Date(transaction.created_at);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    date.setHours(0, 0, 0, 0);
    if (date < start || date > today) {
      return;
    }
    const dateKey = date.toISOString().slice(0, 10);
    const row = buckets.get(dateKey);
    if (!row) {
      return;
    }
    if (transaction.type === "income") {
      row.income += Number(transaction.amount || 0);
    } else {
      row.expense += Number(transaction.amount || 0);
    }
    row.net = row.income - row.expense;
  });

  return Array.from(buckets.values());
}

export function summarizeCashflowSeries(
  series: Array<{ income: number; expense: number; net: number }>
) {
  return series.reduce(
    (totals, point) => {
      totals.totalIncome += Number(point.income || 0);
      totals.totalExpenses += Number(point.expense || 0);
      totals.netSavings += Number(point.net || 0);
      return totals;
    },
    { totalIncome: 0, totalExpenses: 0, netSavings: 0 }
  );
}

export function buildCashflowTrendTimeline(
  transactions: TransactionRecord[],
  debts: DebtRecord[],
  days = 30
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - Math.max(days - 1, 0));

  const buckets = new Map<
    string,
    { date: string; label: string; income: number; expenses: number; debt: number }
  >();

  for (let cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const dateKey = cursor.toISOString().slice(0, 10);
    buckets.set(dateKey, {
      date: dateKey,
      label: cursor.toLocaleDateString(undefined, {
        month: days > 31 ? "short" : undefined,
        day: "numeric",
      }),
      income: 0,
      expenses: 0,
      debt: 0,
    });
  }

  transactions.forEach((transaction) => {
    if (transaction.type === "transfer") {
      return;
    }
    const date = new Date(transaction.created_at);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    date.setHours(0, 0, 0, 0);
    if (date < start || date > today) {
      return;
    }
    const dateKey = date.toISOString().slice(0, 10);
    const row = buckets.get(dateKey);
    if (!row) {
      return;
    }
    if (transaction.type === "income") {
      row.income += Number(transaction.amount || 0);
      return;
    }
    row.expenses += Number(transaction.amount || 0);
  });

  debts.forEach((debt) => {
    const date = new Date(debt.spent_at);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    date.setHours(0, 0, 0, 0);
    if (date < start || date > today) {
      return;
    }
    const amount = Number(debt.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    const dateKey = date.toISOString().slice(0, 10);
    const row = buckets.get(dateKey);
    if (!row) {
      return;
    }
    row.debt += amount;
  });

  return Array.from(buckets.values());
}

export function buildCashflowTrendSeries(
  transactions: TransactionRecord[],
  debts: DebtRecord[],
  months = 6
) {
  const monthBuckets = new Map<
    string,
    { month: string; label: string; income: number; expenses: number; debt: number }
  >();
  const anchor = new Date();
  anchor.setHours(0, 0, 0, 0);
  anchor.setDate(1);

  for (let index = months - 1; index >= 0; index -= 1) {
    const bucketDate = new Date(anchor);
    bucketDate.setMonth(bucketDate.getMonth() - index);
    const key = localMonthKey(bucketDate);
    monthBuckets.set(key, {
      month: key,
      label: formatMonthShort(key),
      income: 0,
      expenses: 0,
      debt: 0,
    });
  }

  transactions.forEach((transaction) => {
    if (transaction.type === "transfer") {
      return;
    }
    const key = monthKey(transaction.created_at);
    const row = monthBuckets.get(key);
    if (!row) {
      return;
    }
    if (transaction.type === "income") {
      row.income += Number(transaction.amount || 0);
      return;
    }
    row.expenses += Number(transaction.amount || 0);
  });

  debts.forEach((debt) => {
    const key = monthKey(debt.spent_at);
    const row = monthBuckets.get(key);
    if (!row) {
      return;
    }
    const amount = Number(debt.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    row.debt += amount;
  });

  return Array.from(monthBuckets.values());
}

export function buildCategoryBreakdown(transactions: TransactionRecord[]) {
  const bucket = new Map<string, number>();
  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const key = String(transaction.category || "Uncategorized").trim() || "Uncategorized";
      bucket.set(key, (bucket.get(key) || 0) + Number(transaction.amount || 0));
    });

  const total = Array.from(bucket.values()).reduce((sum, value) => sum + value, 0);
  const palette = [
    "#2563EB",
    "#14B8A6",
    "#F97316",
    "#DC2626",
    "#8B5CF6",
    "#16A34A",
    "#D97706",
  ];

  return Array.from(bucket.entries())
    .map(([name, amount], index) => ({
      name,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: palette[index % palette.length],
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildBudgetAlerts(
  budgets: BudgetRecord[],
  transactions: TransactionRecord[],
  selectedMonth: string
) {
  return budgets
    .map((budget) => {
      const spent = transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" &&
            monthKey(transaction.created_at) === selectedMonth &&
            String(transaction.category || "") === String(budget.category || "")
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      return {
        id: budget.id,
        category: budget.category || budget.name,
        spent,
        budget: budget.monthly_impact || budget.target_amount,
        pct:
          budget.monthly_impact > 0
            ? Math.round((spent / budget.monthly_impact) * 100)
            : 0,
      };
    })
    .filter((item) => item.budget > 0 && item.spent > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);
}

export function buildRecurringBills(items: RecurringItemRecord[]) {
  const start = todayISO();
  return items
    .map((item) => ({
      ...item,
      due_date: getNextRecurringOccurrenceOnOrAfter(item, start) || item.next_due_date,
      monthly_amount: recurringMonthlyAmount(item),
    }))
    .filter((item) => !!item.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .slice(0, 6);
}

export function buildHealthScore(
  balance: BalanceRecord | null,
  transactions: TransactionRecord[],
  recurringItems: RecurringItemRecord[],
  budgets: BudgetRecord[]
) {
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthlyRecurring = recurringItems
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + recurringMonthlyAmount(item), 0);
  const overBudgetCount = budgets.filter((budget) => budget.remaining_amount < 0).length;
  const savingsRate = income > 0 ? Math.max(0, Math.min(1, (income - expenses) / income)) : 0;
  const emergencyMonths =
    monthlyRecurring > 0 ? Math.max(0, Number(balance?.safe_to_spend || 0) / monthlyRecurring) : 0;
  const budgetScore = budgets.length === 0 ? 1 : Math.max(0, 1 - overBudgetCount / budgets.length);
  const baseScore = Math.round(
    savingsRate * 400 + Math.min(emergencyMonths / 6, 1) * 350 + budgetScore * 250
  );

  return {
    score: Math.min(1000, baseScore),
    status: baseScore >= 800 ? "Healthy" : baseScore >= 650 ? "Stable" : "Needs attention",
    metrics: [
      {
        label: "Savings Rate",
        value: Math.round(savingsRate * 100),
        target: 30,
        color: savingsRate >= 0.3 ? "positive" : savingsRate >= 0.15 ? "warning" : "negative",
      },
      {
        label: "Emergency Fund",
        value: Number(emergencyMonths.toFixed(1)),
        target: 6,
        color: emergencyMonths >= 6 ? "positive" : emergencyMonths >= 3 ? "warning" : "negative",
      },
      {
        label: "Budget Control",
        value: Math.round(budgetScore * 100),
        target: 90,
        color: budgetScore >= 0.9 ? "positive" : budgetScore >= 0.7 ? "warning" : "negative",
      },
    ],
  };
}

export function findCategory(categories: CategoryRecord[], id: number | string | null | undefined) {
  return categories.find((category) => Number(category.id) === Number(id || 0)) || null;
}

export function formatMonthShort(month: string) {
  const [year, value] = String(month || "").split("-").map(Number);
  if (!year || !value) {
    return month;
  }
  return new Date(year, value - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

export function buildTopAccounts(accounts: AccountRecord[]) {
  return [...accounts]
    .sort((a, b) => {
      const aBalance = Number(a.balance || 0);
      const bBalance = Number(b.balance || 0);
      const absoluteDelta = Math.abs(bBalance) - Math.abs(aBalance);
      if (absoluteDelta !== 0) {
        return absoluteDelta;
      }
      return bBalance - aBalance;
    })
    .slice(0, 6);
}
