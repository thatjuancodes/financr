import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { api } from "@/api";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { ALL_ENTITIES_ID, formatCompactCurrency, formatCurrency, formatShortDate } from "@/lib/finance";
import { InsightsContent } from "@/pages/insights/page";
import { monthLabel } from "@/utils/format";

type ReportingTab = "reports" | "insights";

type MonthlyReportListItem = {
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

type ReportTransaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  expected?: boolean;
};

type ReportDebtTransaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  name: string;
  type: "debt";
};

type MonthlyReportRecord = {
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

const TABS: ReportingTab[] = ["reports", "insights"];

export default function Reporting() {
  const { balance, loading, selectedEntityId } = useFinanceData();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "insights" ? "insights" : "reports";
  const selectedMonth = searchParams.get("month") || "";
  const scopedEntityId = selectedEntityId !== ALL_ENTITIES_ID ? selectedEntityId : undefined;
  const currency = balance?.currency_code || "PHP";

  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [reports, setReports] = useState<MonthlyReportListItem[]>([]);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [reportDetail, setReportDetail] = useState<MonthlyReportRecord | null>(null);
  const [generating, setGenerating] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError("");
    try {
      const response = await api.getMonthlyReports(
        scopedEntityId ? { entity_id: scopedEntityId, page_size: 24 } : { page_size: 24 }
      );
      setReports(Array.isArray(response?.items) ? response.items : []);
    } catch (error: any) {
      setReportsError(error?.message || "Failed to load monthly reports");
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [scopedEntityId]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (tab !== "reports") {
      return;
    }
    if (reports.length === 0) {
      if (selectedMonth) {
        updateParams({ month: null });
      }
      return;
    }
    if (!selectedMonth || !reports.some((item) => item.month_key === selectedMonth)) {
      updateParams({ month: reports[0].month_key });
    }
  }, [reports, selectedMonth, tab, updateParams]);

  useEffect(() => {
    if (tab !== "reports" || !selectedMonth) {
      setReportDetail(null);
      return;
    }

    let cancelled = false;
    setReportDetailLoading(true);
    setReportsError("");

    api
      .getMonthlyReport(
        selectedMonth,
        scopedEntityId ? { entity_id: scopedEntityId } : {}
      )
      .then((response) => {
        if (!cancelled) {
          setReportDetail(response || null);
        }
      })
      .catch((error: any) => {
        if (!cancelled) {
          setReportsError(error?.message || "Failed to load monthly report");
          setReportDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReportDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scopedEntityId, selectedMonth, tab]);

  const handleGenerate = useCallback(
    async (monthKey: string | null) => {
      setGenerating(true);
      setReportsError("");
      try {
        const response = await api.generateMonthlyReport(
          monthKey,
          scopedEntityId ? { entity_id: scopedEntityId } : {}
        );
        await loadReports();
        if (response?.month_key) {
          updateParams({ tab: "reports", month: response.month_key });
        }
      } catch (error: any) {
        setReportsError(error?.message || "Failed to generate monthly report");
      } finally {
        setGenerating(false);
      }
    },
    [loadReports, scopedEntityId, updateParams]
  );

  const report = reportDetail?.report || null;
  const incomeTransactions = report?.transactionsList?.income || [];
  const expenseTransactions = report?.transactionsList?.expenses || [];
  const debtTransactions = report?.transactionsList?.debts || [];
  const categoryRows = report?.categories || [];

  const debtBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    debtTransactions.forEach((item) => {
      const key = String(item.category || "Uncategorized").trim() || "Uncategorized";
      breakdown.set(key, (breakdown.get(key) || 0) + Math.abs(Number(item.amount || 0)));
    });
    return Array.from(breakdown.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [debtTransactions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading reporting..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text">Reporting</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monthly reports from the homemaker backend, plus the redesigned insight views
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((value) => (
            <button
              key={value}
              onClick={() =>
                updateParams({
                  tab: value,
                  month: value === "reports" ? selectedMonth || reports[0]?.month_key || null : null,
                })
              }
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                tab === value ? "bg-accent text-white" : "bg-bg-subtle text-text-secondary"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {reportsError ? (
          <Card className="mb-6 border border-negative/20 bg-negative-light p-4 text-sm text-negative-dark">
            {reportsError}
          </Card>
        ) : null}

        {tab === "insights" ? <InsightsContent showHeader={false} /> : null}

        {tab === "reports" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <Card className="p-5 xl:col-span-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Monthly Reports</h2>
                    <p className="text-sm text-text-secondary">Generated closed-month snapshots</p>
                  </div>
                  <button
                    onClick={() => handleGenerate(null)}
                    disabled={generating}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {generating ? "Generating..." : "Generate"}
                  </button>
                </div>

                {reportsLoading ? (
                  <LoadingState label="Loading reports..." />
                ) : reports.length === 0 ? (
                  <EmptyState
                    title="No reports yet"
                    body="Generate the last closed month to create your first report snapshot."
                  />
                ) : (
                  <div className="space-y-3">
                    {reports.map((item) => {
                      const active = item.month_key === selectedMonth;
                      return (
                        <button
                          key={item.month_key}
                          onClick={() => updateParams({ month: item.month_key })}
                          className={`w-full rounded-xl border p-4 text-left transition-colors ${
                            active
                              ? "border-accent bg-accent-light"
                              : "border-bg-subtle bg-white hover:border-accent/30"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-text">{monthLabel(item.month_key)}</span>
                            <span className="text-2xs text-text-secondary">
                              Updated {String(item.updated_at || item.generated_at || "").slice(0, 10)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-2xs">
                            <MetricMini label="Income" value={formatCompactCurrency(item.summary?.income || 0, currency)} tone="positive" />
                            <MetricMini label="Expenses" value={formatCompactCurrency(item.summary?.expenses || 0, currency)} tone="negative" />
                            <MetricMini label="Net" value={formatCompactCurrency(item.summary?.net || 0, currency)} tone={(item.summary?.net || 0) >= 0 ? "positive" : "negative"} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="p-5 xl:col-span-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text">
                      {selectedMonth ? `Report: ${monthLabel(selectedMonth)}` : "Report Detail"}
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Summary, category mix, debt, and month-end recommendations
                    </p>
                  </div>
                  {selectedMonth ? (
                    <button
                      onClick={() => handleGenerate(selectedMonth)}
                      disabled={generating}
                      className="rounded-lg bg-bg-subtle px-4 py-2 text-sm font-medium text-text disabled:opacity-60"
                    >
                      {generating ? "Refreshing..." : "Regenerate"}
                    </button>
                  ) : null}
                </div>

                {reportDetailLoading ? (
                  <LoadingState label="Loading report detail..." />
                ) : !selectedMonth ? (
                  <EmptyState title="No month selected" body="Choose a report month from the list to inspect details." />
                ) : !report ? (
                  <EmptyState title="Report unavailable" body="The selected report month could not be loaded." />
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <MetricCard label="Income" value={formatCompactCurrency(report.summary?.income || 0, currency)} tone="positive" />
                      <MetricCard label="Expenses" value={formatCompactCurrency(report.summary?.expenses || 0, currency)} />
                      <MetricCard label="Net" value={formatCompactCurrency(report.summary?.net || 0, currency)} tone={(report.summary?.net || 0) >= 0 ? "positive" : "negative"} />
                      <MetricCard label="Savings Rate" value={formatPercent(report.summary?.savingsRate || 0)} />
                      <MetricCard label="Debt Rate" value={formatPercent(report.debt?.dti || 0)} />
                      <MetricCard label="6-Month Cash" value={formatCompactCurrency(report.projection?.month6Cash || 0, currency)} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <Card className="p-4">
                        <h3 className="mb-3 text-sm font-semibold text-text">Expected vs Unexpected</h3>
                        <ReportRow label="Expected" value={formatCurrency(report.expectedVsUnexpected?.expected || 0, currency)} />
                        <ReportRow label="Unexpected" value={formatCurrency(report.expectedVsUnexpected?.unexpected || 0, currency)} />
                        <ReportRow label="Expected %" value={formatPercent(report.expectedVsUnexpected?.expectedPercent || 0)} />
                        <ReportRow label="Unexpected %" value={formatPercent(report.expectedVsUnexpected?.unexpectedPercent || 0)} />
                      </Card>
                      <Card className="p-4">
                        <h3 className="mb-3 text-sm font-semibold text-text">Buffer & Projection</h3>
                        <ReportRow label="Current Buffer" value={`${Number(report.buffer?.current || 0).toFixed(2)} mo`} />
                        <ReportRow label="Previous Buffer" value={`${Number(report.buffer?.previous || 0).toFixed(2)} mo`} />
                        <ReportRow label="Lowest Point" value={formatCurrency(report.projection?.lowestPoint || 0, currency)} />
                        <ReportRow label="Buffer After" value={`${Number(report.projection?.bufferAfter || 0).toFixed(2)} mo`} />
                      </Card>
                      <Card className="p-4">
                        <h3 className="mb-3 text-sm font-semibold text-text">Recurring Snapshot</h3>
                        <ReportRow label="Expected Income / Month" value={formatCurrency(report.recurring?.expected_income_monthly || 0, currency)} />
                        <ReportRow label="Expected Expense / Month" value={formatCurrency(report.recurring?.expected_expense_monthly || 0, currency)} />
                        <ReportRow label="Spending Power / Month" value={formatCurrency(report.recurring?.spending_power_monthly || 0, currency)} />
                        <ReportRow label="Spending Power / Week" value={formatCurrency(report.recurring?.spending_power_weekly || 0, currency)} />
                      </Card>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {report ? (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card className="p-5">
                    <h2 className="mb-4 text-lg font-semibold text-text">Expense Categories</h2>
                    {categoryRows.length === 0 ? (
                      <EmptyState title="No category data" body="No expense category totals were recorded for this month." />
                    ) : (
                      <div className="space-y-3">
                        {categoryRows.map((row) => (
                          <div key={row.category}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-text">{row.category}</span>
                              <span className="text-text-secondary">
                                {formatCurrency(row.amount, currency)} • {formatPercent(row.percent)}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${Math.min(Number(row.percent || 0) * 100, 100)}%` }}
                              />
                            </div>
                            <p className="mt-1 text-2xs text-text-secondary">
                              Delta vs previous month: {Number(row.delta || 0) >= 0 ? "+" : ""}
                              {formatCurrency(row.delta || 0, currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card className="p-5">
                    <h2 className="mb-4 text-lg font-semibold text-text">Debt Breakdown</h2>
                    {debtBreakdown.length === 0 ? (
                      <EmptyState title="No debt data" body="No debt transactions were included in this report month." />
                    ) : (
                      <div className="space-y-3">
                        {debtBreakdown.map((row) => {
                          const total = debtBreakdown.reduce((sum, item) => sum + item.total, 0) || 1;
                          const percent = row.total / total;
                          return (
                            <div key={row.category}>
                              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium text-text">{row.category}</span>
                                <span className="text-text-secondary">
                                  {formatCurrency(row.total, currency)} • {formatPercent(percent)}
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-bg-subtle">
                                <div
                                  className="h-full rounded-full bg-negative"
                                  style={{ width: `${Math.min(percent * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card className="p-5">
                    <h2 className="mb-4 text-lg font-semibold text-text">Debt Snapshot</h2>
                    <div className="space-y-3">
                      <ReportRow label="Total Debt" value={formatCurrency(report.debt?.total || 0, currency)} />
                      <ReportRow label="Monthly Payment" value={formatCurrency(report.debt?.monthlyPayment || 0, currency)} />
                      <ReportRow label="Estimated Interest" value={formatCurrency(report.debt?.estimatedMonthlyInterest || 0, currency)} />
                    </div>
                    <div className="mt-4 space-y-2">
                      {(report.debt?.debts || []).map((debt) => (
                        <div key={debt.id} className="rounded-lg bg-bg-subtle px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-text">{debt.id}</span>
                            <span className="text-sm font-semibold text-text">
                              {formatCurrency(debt.balance, currency)}
                            </span>
                          </div>
                          <p className="mt-1 text-2xs text-text-secondary">
                            Payment {formatCurrency(debt.monthlyPayment, currency)}{debt.apr ? ` • ${debt.apr}% APR` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h2 className="mb-4 text-lg font-semibold text-text">Optimization Opportunities</h2>
                    {report.optimizations?.length ? (
                      <div className="space-y-2">
                        {report.optimizations.map((item, index) => (
                          <div key={`${item.category}-${index}`} className="rounded-lg bg-bg-subtle px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-text">{item.category}</span>
                              <span className="text-sm font-semibold text-text">
                                {formatCurrency(item.impact, currency)}
                              </span>
                            </div>
                            <p className="mt-1 text-2xs text-text-secondary">
                              {item.cutPercent}% recommended cut over six months
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="No optimizations" body="No optimization recommendations were generated for this month." />
                    )}
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <TransactionsCard title="Income Transactions" items={incomeTransactions} tone="positive" currency={currency} />
                  <TransactionsCard title="Debt Transactions" items={debtTransactions} tone="negative" currency={currency} debt />
                  <TransactionsCard title="Expense Transactions" items={expenseTransactions} tone="default" currency={currency} />
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({
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

function MetricMini({
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

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

function TransactionsCard({
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

function formatPercent(value: number) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}
