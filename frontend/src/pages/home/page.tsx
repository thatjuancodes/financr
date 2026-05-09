import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/base/Card";
import Badge from "@/components/base/Badge";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import {
  buildAccountAccent,
  buildAccountIcon,
  buildCashflowTrendSeries,
  buildCashflowTrendTimeline,
  buildHealthScore,
  buildRecurringBills,
  buildTopAccounts,
  formatCompactCurrency,
  formatCurrency,
  formatShortDate,
  sortByDateDesc,
} from "@/lib/finance";
import type { CategoryRecord, TransactionRecord } from "@/types/finance";
import { buildCategoryBadgeStyle, resolveCategoryColor } from "@/utils/categoryColors";
import { monthLabel } from "@/utils/format";

export default function Home() {
  const {
    loading,
    accounts,
    balance,
    budgets,
    categories,
    currentMonth,
    debtList,
    expenseList,
    incomeCategories,
    incomeList,
    recurringItems,
    scopedTransactions,
  } = useFinanceData();

  const currency = balance?.currency_code || "PHP";
  const topAccounts = useMemo(() => buildTopAccounts(accounts), [accounts]);
  const upcomingBills = useMemo(() => buildRecurringBills(recurringItems), [recurringItems]);
  const healthScore = useMemo(
    () => buildHealthScore(balance, scopedTransactions, recurringItems, budgets),
    [balance, budgets, recurringItems, scopedTransactions]
  );
  const recentTransactions = useMemo(
    () => sortByDateDesc(scopedTransactions, "created_at").slice(0, 5),
    [scopedTransactions]
  );
  const expenseCategoryMetaByName = useMemo(
    () => buildCategoryMetaByName(categories, "expense-category"),
    [categories]
  );
  const incomeCategoryMetaByName = useMemo(
    () => buildCategoryMetaByName(incomeCategories, "income-category"),
    [incomeCategories]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Accounts</h2>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {accounts.length} accounts •{" "}
                  <span className="font-medium text-text">
                    {formatCompactCurrency(balance?.balance || 0, currency)}
                  </span>
                </p>
              </div>
              <Badge variant="accent" size="md">
                Live balances
              </Badge>
            </div>

            {topAccounts.length === 0 ? (
              <EmptyState
                title="No accounts yet"
                body="Create accounts in Settings to start tracking balances here."
              />
            ) : (
              <div className="space-y-2">
                {topAccounts.map((account) => {
                  const accent = buildAccountAccent(account);
                  return (
                    <div key={account.id} className="flex items-center gap-3 rounded-lg py-2.5">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${accent}1a` }}
                      >
                        <i className={`${buildAccountIcon(account)} text-base`} style={{ color: accent }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{account.name}</p>
                        <p className="text-2xs text-text-secondary">
                          {account.entity_name} • {account.institution?.name || account.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text">
                          {formatCurrency(account.balance, account.currency_code)}
                        </p>
                        <p className="text-2xs text-text-secondary">{account.currency_code}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card variant="hero" className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-900" />
            <div className="relative grid gap-8 lg:grid-cols-[180px,1fr]">
              <div className="flex flex-col items-center text-center">
                <span className="mb-2 text-2xs font-medium uppercase tracking-[0.3em] text-white/60">
                  Financial Health
                </span>
                <div className="flex h-40 w-40 items-center justify-center rounded-full border-[10px] border-white/10">
                  <div>
                    <div className="text-4xl font-bold text-white">{healthScore.score}</div>
                    <div className="text-sm text-white/60">/ 1000</div>
                  </div>
                </div>
                <div className="mt-3 text-base font-medium text-white/90">{healthScore.status}</div>
              </div>

              <div className="space-y-5">
                {healthScore.metrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-white/70">{metric.label}</span>
                      <span className="font-semibold text-white">
                        {metric.value}
                        {metric.label === "Emergency Fund" ? " mo" : "%"}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                          backgroundColor:
                            metric.color === "positive"
                              ? "#16A34A"
                              : metric.color === "warning"
                                ? "#D97706"
                                : "#DC2626",
                        }}
                      />
                    </div>
                    <div className="mt-1 text-2xs text-white/45">
                      Target: {metric.target}
                      {metric.label === "Emergency Fund" ? " mo" : "%"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="mb-6">
          <HomeCashFlowSection
            currency={currency}
            currentMonth={currentMonth}
            debtList={debtList}
            expenseList={expenseList}
            incomeList={incomeList}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="p-5 md:p-6 lg:col-span-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Upcoming Bills</h2>
                <p className="text-sm text-text-secondary">Next recurring due dates</p>
              </div>
              <LinkBadge href="/recurring" label="View all" />
            </div>
            {upcomingBills.length === 0 ? (
              <EmptyState title="No recurring items" body="Recurring expenses and income will show here." />
            ) : (
              <div className="space-y-2">
                {upcomingBills.map((item) => {
                  const categoryLabel =
                    item.type === "income"
                      ? String(item.income_category_name || item.category || "Uncategorized").trim() ||
                        "Uncategorized"
                      : String(item.expense_category_name || item.category || "Uncategorized").trim() ||
                        "Uncategorized";
                  const categoryMeta =
                    item.type === "income"
                      ? incomeCategoryMetaByName.get(normalizeCategoryKey(categoryLabel))
                      : item.type === "expense"
                        ? expenseCategoryMetaByName.get(normalizeCategoryKey(categoryLabel))
                        : null;
                  const categoryStyle = categoryMeta
                    ? buildCategoryBadgeStyle(categoryMeta.color)
                    : null;

                  return (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg py-2.5">
                    {categoryMeta && categoryStyle ? (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                        style={categoryStyle}
                      >
                        {categoryMeta.icon ? (
                          <i className={`${categoryMeta.icon} text-lg`} />
                        ) : (
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: "currentColor" }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-subtle">
                        <i className="ri-repeat-line text-text-secondary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{item.category || item.expense_category_name || item.income_category_name || "Recurring item"}</p>
                      <p className="text-2xs text-text-secondary">Due {formatShortDate(item.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text">
                        {formatCurrency(item.amount, currency)}
                      </p>
                      <p className="text-2xs text-text-secondary capitalize">{item.frequency.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </Card>

          <Card className="p-5 md:p-6 lg:col-span-7">
            <RecentTransactionsSection
              categoryRecords={categories}
              currency={currency}
              recentTransactions={recentTransactions}
            />
          </Card>
        </section>
      </main>
    </div>
  );
}

function RecentTransactionsSection({
  categoryRecords,
  currency,
  recentTransactions,
}: {
  categoryRecords: CategoryRecord[];
  currency: string;
  recentTransactions: TransactionRecord[];
}) {
  const expenseCategoryMetaByName = useMemo(
    () => buildCategoryMetaByName(categoryRecords, "expense-category"),
    [categoryRecords]
  );

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Recent Transactions</h2>
          <p className="text-sm text-text-secondary">Latest activity across your books</p>
        </div>
        <LinkBadge href="/transactions" label="View all" />
      </div>

      {recentTransactions.length === 0 ? (
        <EmptyState title="No transactions yet" body="Your latest income, expenses, and transfers will show here." />
      ) : (
        <div className="space-y-2">
          {recentTransactions.map((transaction) => {
            const categoryLabel = String(transaction.category || "Uncategorized").trim() || "Uncategorized";
            const expenseCategoryMeta = expenseCategoryMetaByName.get(normalizeCategoryKey(categoryLabel));
            const expenseCategoryStyle = expenseCategoryMeta
              ? buildCategoryBadgeStyle(expenseCategoryMeta.color)
              : null;

            return (
            <div key={`${transaction.source_type}-${transaction.id}`} className="flex items-center gap-3 rounded-lg py-2.5">
              {transaction.type === "expense" && expenseCategoryMeta && expenseCategoryStyle ? (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                  style={expenseCategoryStyle}
                >
                  {expenseCategoryMeta.icon ? (
                    <i className={`${expenseCategoryMeta.icon} text-lg`} />
                  ) : (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: "currentColor" }}
                    />
                  )}
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-subtle">
                  <i
                    className={`text-sm ${
                      transaction.type === "income"
                        ? "ri-arrow-down-line text-positive"
                        : transaction.type === "transfer"
                          ? "ri-repeat-line text-accent"
                          : "ri-arrow-up-line text-negative"
                    }`}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text">
                    {transaction.note || transaction.category || "Transaction"}
                  </p>
                  <Badge
                    variant={
                      transaction.type === "income"
                        ? "positive"
                        : transaction.type === "transfer"
                          ? "accent"
                          : "warning"
                    }
                  >
                    {transaction.type}
                  </Badge>
                </div>
                <p className="text-2xs text-text-secondary">
                  {formatShortDate(transaction.created_at)} • {transaction.category || "Uncategorized"}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${
                    transaction.type === "income"
                      ? "text-positive"
                      : transaction.type === "transfer"
                        ? "text-accent"
                        : "text-text"
                  }`}
                >
                  {transaction.type === "income" ? "+" : ""}
                  {formatCurrency(transaction.amount, transaction.currency_code || currency)}
                </p>
                <p className="text-2xs text-text-secondary">
                  {transaction.from_account_name || transaction.to_account_name || "Manual"}
                </p>
              </div>
            </div>
          )})}
        </div>
      )}
    </>
  );
}

function normalizeCategoryKey(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function buildCategoryMetaByName(list: CategoryRecord[], seedPrefix: string) {
  const map = new Map<string, { color: string; icon: string | null }>();

  list.forEach((category) => {
    const normalizedName = normalizeCategoryKey(category.name);
    if (!normalizedName) {
      return;
    }
    map.set(normalizedName, {
      color: resolveCategoryColor(
        category.color,
        `${seedPrefix}:${category.id}:${category.name}`
      ),
      icon: category.icon || null,
    });
  });

  return map;
}

function HomeCashFlowSection({
  currency,
  currentMonth,
  debtList,
  expenseList,
  incomeList,
}: {
  currency: string;
  currentMonth: string;
  debtList: Parameters<typeof buildCashflowTrendTimeline>[2];
  expenseList: Parameters<typeof buildCashflowTrendTimeline>[1];
  incomeList: Parameters<typeof buildCashflowTrendTimeline>[0];
}) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "halfyear" | "quarterlyMonth">("quarterlyMonth");

  const displayData = useMemo(() => {
    if (period === "week") {
      return buildCashflowTrendTimeline(incomeList, expenseList, debtList, 7);
    }
    if (period === "quarterlyMonth") {
      return buildCashflowTrendSeries(incomeList, expenseList, debtList, 3);
    }
    if (period === "halfyear") {
      return buildCashflowTrendSeries(incomeList, expenseList, debtList, 6);
    }
    if (period === "quarter") {
      return buildCashflowTrendTimeline(incomeList, expenseList, debtList, 90);
    }
    return buildCashflowTrendTimeline(incomeList, expenseList, debtList, 30);
  }, [debtList, expenseList, incomeList, period]);

  const summary = useMemo(
    () =>
      displayData.reduce(
        (totals, point) => {
          totals.totalIncome += Number(point.income || 0);
          totals.totalExpenses += Number(point.expenses || 0);
          totals.totalDebt += Number(point.debt || 0);
          return totals;
        },
        { totalIncome: 0, totalExpenses: 0, totalDebt: 0 }
      ),
    [displayData]
  );

  return (
    <Card className="p-5 md:p-7">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">Cashflow</h2>
          <p className="mt-0.5 text-sm text-text-secondary">{monthLabel(currentMonth)}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-bg-subtle p-1">
          {["week", "month", "quarter", "quarterlyMonth", "halfyear"].map((value) => (
            <button
              key={value}
              onClick={() =>
                setPeriod(value as "week" | "month" | "quarter" | "halfyear" | "quarterlyMonth")
              }
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                period === value
                  ? "bg-white text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {value === "week"
                ? "7 days"
                : value === "quarterlyMonth"
                  ? "3 months"
                : value === "quarter"
                  ? "90 days"
                  : value === "halfyear"
                    ? "6 months"
                    : "30 days"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={
                period === "halfyear" ? 40 : period === "quarter" ? 28 : period === "quarterlyMonth" ? 24 : 20
              }
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCompactCurrency(Number(value), currency)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: "10px",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value: number, name: string) => [formatCurrency(value, currency), name]}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload;
                return String(point?.month ? monthLabel(point.month) : point?.date || "");
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#F97316"
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="debt"
              name="Debt"
              stroke="#DC2626"
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-positive-light p-4 text-center">
          <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-positive/15">
            <i className="ri-arrow-down-line text-xs text-positive" />
          </div>
          <p className="text-2xs uppercase tracking-wide text-text-secondary">Income</p>
          <p className="mt-1 text-lg font-bold text-text tabular-nums">
            {formatCompactCurrency(summary.totalIncome, currency)}
          </p>
        </div>
        <div className="rounded-lg bg-negative-light p-4 text-center">
          <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-negative/15">
            <i className="ri-arrow-up-line text-xs text-negative" />
          </div>
          <p className="text-2xs uppercase tracking-wide text-text-secondary">Expenses</p>
          <p className="mt-1 text-lg font-bold text-text tabular-nums">
            {formatCompactCurrency(summary.totalExpenses, currency)}
          </p>
        </div>
        <div className="rounded-lg bg-accent-light p-4 text-center">
          <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent/15">
            <i className="ri-bank-card-line text-xs text-accent" />
          </div>
          <p className="text-2xs uppercase tracking-wide text-text-secondary">Debt</p>
          <p className="mt-1 text-lg font-bold text-text tabular-nums">
            {formatCompactCurrency(summary.totalDebt, currency)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function LinkBadge({ href, label }: { href: string; label: string }) {
  return (
    <Link to={href} className="text-sm font-medium text-accent transition-colors hover:text-accent-dark">
      {label}
    </Link>
  );
}
