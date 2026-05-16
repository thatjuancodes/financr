import Card from "@/components/base/Card";
import { EmptyState } from "@/components/feature/PageState";
import { formatCompactCurrency, formatCurrency } from "@/lib/finance";
import {
  formatPercent,
  MetricCard,
  ReportRow,
  TransactionsCard,
  type MonthlyReportRecord,
} from "./shared";

export default function ReportDetailContent({
  currency,
  monthLabel,
  report,
}: {
  currency: string;
  monthLabel: string;
  report: MonthlyReportRecord["report"];
}) {
  const incomeTransactions = report?.transactionsList?.income || [];
  const expenseTransactions = report?.transactionsList?.expenses || [];
  const debtTransactions = report?.transactionsList?.debts || [];
  const categoryRows = report?.categories || [];

  const debtBreakdown = Array.from(
    debtTransactions.reduce((map, item) => {
      const key = String(item.category || "Uncategorized").trim() || "Uncategorized";
      map.set(key, (map.get(key) || 0) + Math.abs(Number(item.amount || 0)));
      return map;
    }, new Map<string, number>())
  )
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <section className="space-y-6">
      <Card className="p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Monthly Report
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-text">{monthLabel}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Income"
            value={formatCompactCurrency(report.summary?.income || 0, currency)}
            tone="positive"
          />
          <MetricCard
            label="Expenses"
            value={formatCompactCurrency(report.summary?.expenses || 0, currency)}
          />
          <MetricCard
            label="Net"
            value={formatCompactCurrency(report.summary?.net || 0, currency)}
            tone={(report.summary?.net || 0) >= 0 ? "positive" : "negative"}
          />
          <MetricCard
            label="Savings Rate"
            value={formatPercent(report.summary?.savingsRate || 0)}
          />
          <MetricCard
            label="Debt Rate"
            value={formatPercent(report.debt?.dti || 0)}
          />
          <MetricCard
            label="6-Month Cash"
            value={formatCompactCurrency(report.projection?.month6Cash || 0, currency)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">Expected vs Unexpected</h3>
          <ReportRow
            label="Expected"
            value={formatCurrency(report.expectedVsUnexpected?.expected || 0, currency)}
          />
          <ReportRow
            label="Unexpected"
            value={formatCurrency(report.expectedVsUnexpected?.unexpected || 0, currency)}
          />
          <ReportRow
            label="Expected %"
            value={formatPercent(report.expectedVsUnexpected?.expectedPercent || 0)}
          />
          <ReportRow
            label="Unexpected %"
            value={formatPercent(report.expectedVsUnexpected?.unexpectedPercent || 0)}
          />
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
                  Payment {formatCurrency(debt.monthlyPayment, currency)}
                  {debt.apr ? ` • ${debt.apr}% APR` : ""}
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
    </section>
  );
}
