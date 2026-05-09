import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import {
  buildCategoryBreakdown,
  buildCashflowSeries,
  buildProjectionForecast,
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/finance";

export function InsightsContent({ showHeader = true }: { showHeader?: boolean }) {
  const { balance, recurringItems, scopedTransactions } = useFinanceData();
  const currency = balance?.currency_code || "PHP";

  const expenseTransactions = scopedTransactions.filter((transaction) => transaction.type === "expense");
  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(expenseTransactions).slice(0, 6),
    [expenseTransactions]
  );
  const cashflowSeries = useMemo(
    () => buildCashflowSeries(scopedTransactions, 4),
    [scopedTransactions]
  );
  const forecastSeries = useMemo(
    () => buildProjectionForecast(balance, recurringItems),
    [balance, recurringItems]
  );
  const totalSpent = expenseTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalIncome = scopedTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const avgDailySpend = expenseTransactions.length > 0 ? totalSpent / 30 : 0;

  return (
    <>
      {showHeader ? (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text">Insights</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Spending patterns, category mix, and a short recurring cash-flow forecast
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text">Insights</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Spending patterns, category mix, and recurring cash-flow forecasts
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Spent" value={formatCompactCurrency(totalSpent, currency)} />
        <StatCard label="Income Logged" value={formatCompactCurrency(totalIncome, currency)} accent="positive" />
        <StatCard label="Avg Daily Spend" value={formatCompactCurrency(avgDailySpend, currency)} />
        <StatCard
          label="Largest Category"
          value={categoryBreakdown[0]?.name || "N/A"}
          subtitle={categoryBreakdown[0] ? `${categoryBreakdown[0].percentage}% of expenses` : ""}
        />
      </div>

      {scopedTransactions.length === 0 ? (
        <EmptyState title="No insight data yet" body="Record some transactions to populate charts and trends." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5 md:p-6">
              <h2 className="mb-4 text-lg font-semibold text-text">Spending by Category</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="amount"
                      stroke="none"
                    >
                      {categoryBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2">
                {categoryBreakdown.map((category) => (
                  <div key={category.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="flex-1 text-sm text-text">{category.name}</span>
                    <span className="text-sm font-medium text-text">
                      {formatCurrency(category.amount, currency)}
                    </span>
                    <span className="text-2xs text-text-secondary">({category.percentage}%)</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <h2 className="mb-4 text-lg font-semibold text-text">Income vs Expenses</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowSeries}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                    <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatCompactCurrency(Number(value), currency)}
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Area type="monotone" dataKey="income" stroke="#22C55E" fill="url(#incomeGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="url(#expenseGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-5 md:p-6">
            <h2 className="mb-1 text-lg font-semibold text-text">Recurring Cash-Flow Forecast</h2>
            <p className="mb-4 text-sm text-text-secondary">
              Next 90 days based on current recurring income and recurring expense schedules
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastSeries}>
                  <defs>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatCompactCurrency(Number(value), currency)}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  <Area type="monotone" dataKey="optimistic" stroke="#16A34A" strokeDasharray="6 4" fill="none" />
                  <Area type="monotone" dataKey="conservative" stroke="#DC2626" strokeDasharray="6 4" fill="none" />
                  <Area type="monotone" dataKey="projected" stroke="#2563EB" fill="url(#forecastGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

export default function Insights() {
  const { loading } = useFinanceData();

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        {loading ? <LoadingState label="Loading insights..." /> : <InsightsContent />}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  accent = "default",
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: "default" | "positive";
}) {
  return (
    <Card className="p-4">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent === "positive" ? "text-positive" : "text-text"}`}>
        {value}
      </p>
      <p className="mt-1 text-2xs text-text-secondary">{subtitle || "\u00A0"}</p>
    </Card>
  );
}
