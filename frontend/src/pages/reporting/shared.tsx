import Card from "@/components/base/Card";
import { EmptyState } from "@/components/feature/PageState";
import { formatCurrency, formatShortDate } from "@/lib/finance";

export type MonthlyReportListItem = {
  month_key: string;
  entity_id?: string | null;
  generated_at?: string;
  updated_at?: string;
  summary?: {
    income: number;
    expenses: number;
    net: number;
  } | null;
  buffer?: {
    current: number;
  } | null;
  projection?: {
    month6Cash: number;
  } | null;
};

export type ReportTransaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  expected?: boolean;
};

export type ReportDebtTransaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  name: string;
  type: "debt";
};

export type MonthlyReportRecord = {
  month_key: string;
  entity_id?: string | null;
  generated_at?: string;
  updated_at?: string;
  report: {
    summary?: {
      income: number;
      expenses: number;
      net: number;
      savingsRate: number;
      incomeMoM: number;
      expenseMoM: number;
    } | null;
    buffer?: {
      current: number;
      previous: number;
      change: number;
    } | null;
    breakdown?: {
      fixed: number;
      variable: number;
      debt: number;
      savings: number;
    } | null;
    expectedVsUnexpected?: {
      expected: number;
      unexpected: number;
      expectedPercent: number;
      unexpectedPercent: number;
    } | null;
    categories?: Array<{
      category: string;
      amount: number;
      percent: number;
      delta: number;
    }> | null;
    transactionsList?: {
      income?: ReportTransaction[];
      expenses?: ReportTransaction[];
      debts?: ReportDebtTransaction[];
    } | null;
    recurring?: {
      expected_income_monthly: number;
      expected_expense_monthly: number;
      spending_power_monthly: number;
      spending_power_weekly: number;
    } | null;
    debt?: {
      total: number;
      monthlyPayment: number;
      dti: number;
      estimatedMonthlyInterest?: number;
      debts?: Array<{
        id: string;
        balance: number;
        monthlyPayment: number;
        apr?: number;
      }>;
    } | null;
    projection?: {
      month6Cash: number;
      lowestPoint: number;
      bufferAfter: number;
    } | null;
    optimizations?: Array<{
      category: string;
      cutPercent: number;
      impact: number;
    }> | null;
  };
};

export function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="rounded-lg bg-bg-subtle p-4">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function MetricMini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="rounded-lg bg-white/80 p-2">
      <p className="text-[10px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

export function TransactionsCard({
  title,
  items,
  tone,
  currency,
  debt = false,
}: {
  title: string;
  items: Array<ReportTransaction | ReportDebtTransaction>;
  tone: "default" | "positive" | "negative";
  currency: string;
  debt?: boolean;
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-text">{title}</h2>
      {items.length === 0 ? (
        <EmptyState title="No entries" body="Nothing was recorded for this section in the selected month." />
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item) => (
            <div key={`${item.id}-${item.date}`} className="rounded-lg bg-bg-subtle px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {debt ? (item as ReportDebtTransaction).name : item.category}
                  </p>
                  <p className="text-2xs text-text-secondary">
                    {formatShortDate(item.date)} • {item.category}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    tone === "positive"
                      ? "text-positive"
                      : tone === "negative"
                        ? "text-negative"
                        : "text-text"
                  }`}
                >
                  {formatCurrency(Math.abs(Number(item.amount || 0)), currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function formatPercent(value: number) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}
