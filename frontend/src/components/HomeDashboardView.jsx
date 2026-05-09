import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import InfoTooltip from "./ui/InfoTooltip";
import StatCard from "./ui/StatCard";
import { monthLabel } from "../utils/format";
import {
  buildCategoryBadgeStyle,
  resolveCategoryColor,
} from "../utils/categoryColors";

function shortMonthLabel(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return String(monthKey || "");
  }
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "short",
  });
}

function shortDateLabel(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return String(dateKey || "");
  }
  return new Date(year, month - 1, day).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function fullDateLabel(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return String(dateKey || "");
  }
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function HomeChartRangeSelect({ value, onChange }) {
  return (
    <div className="home-chart-range-select">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="monthly">Monthly</option>
        <option value="daily">Daily (30 days)</option>
      </select>
    </div>
  );
}

function HomeCashflowTrendSection({
  dailyTrendSeries,
  monthlyTrendSeries,
  formatMoney,
}) {
  const [isCashflowTrendInfoOpen, setIsCashflowTrendInfoOpen] = useState(false);
  const [chartRange, setChartRange] = useState("monthly");
  const cashflowSeries =
    chartRange === "daily" ? dailyTrendSeries : monthlyTrendSeries;
  const cashflowXAxisKey = chartRange === "daily" ? "date_key" : "month_key";
  const cashflowTickFormatter =
    chartRange === "daily" ? shortDateLabel : shortMonthLabel;
  const cashflowLabelFormatter = (label) =>
    chartRange === "daily"
      ? fullDateLabel(String(label || ""))
      : monthLabel(String(label || ""));

  return (
    <section>
      <div className="home-chart-header">
        <div className="home-chart-title-row">
          <h2>Cashflow Trend</h2>
          <InfoTooltip
            open={isCashflowTrendInfoOpen}
            onToggle={() => setIsCashflowTrendInfoOpen((open) => !open)}
            buttonLabel="Show cashflow trend description"
            dialogLabel="Cashflow trend description"
          >
            {chartRange === "daily"
              ? "Daily view shows the last 30 days."
              : "Monthly view shows up to the last 12 months."}
          </InfoTooltip>
        </div>
        <HomeChartRangeSelect value={chartRange} onChange={setChartRange} />
      </div>
      {cashflowSeries.length === 0 ? (
        <p className="empty-state">
          {chartRange === "daily"
            ? "Not enough daily data to chart yet."
            : "Not enough monthly data to chart yet."}
        </p>
      ) : (
        <div className="home-trend-chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={cashflowSeries}
              margin={{ top: 12, right: 12, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ee" />
              <XAxis
                dataKey={cashflowXAxisKey}
                tickFormatter={cashflowTickFormatter}
                stroke="#566076"
                fontSize={11}
              />
              <YAxis
                tickFormatter={(value) =>
                  Number(value || 0).toLocaleString(undefined, {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  })
                }
                stroke="#566076"
                fontSize={11}
                width={58}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value ?? 0))}
                labelFormatter={cashflowLabelFormatter}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="debt"
                name="Debt"
                stroke="#dc2626"
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function HomeSavingsProjectionSection({
  thirtyDayProjectionSeries,
  sixMonthProjectionSeries,
  formatMoney,
}) {
  const [chartRange, setChartRange] = useState("monthly");
  const [isSavingsProjectionInfoOpen, setIsSavingsProjectionInfoOpen] =
    useState(false);
  const projectionSeries =
    chartRange === "daily" ? thirtyDayProjectionSeries : sixMonthProjectionSeries;
  const projectionXAxisKey = chartRange === "daily" ? "date_key" : "month_key";
  const projectionTickFormatter =
    chartRange === "daily" ? shortDateLabel : shortMonthLabel;
  const projectionLabelFormatter = (label) =>
    chartRange === "daily"
      ? fullDateLabel(String(label || ""))
      : monthLabel(String(label || ""));

  return (
    <section>
      <div className="home-chart-header">
        <div className="home-chart-title-row">
          <h2>Savings Projections</h2>
          <InfoTooltip
            open={isSavingsProjectionInfoOpen}
            onToggle={() => setIsSavingsProjectionInfoOpen((open) => !open)}
            buttonLabel="Show savings projections description"
            dialogLabel="Savings projections description"
          >
            {chartRange === "daily"
              ? "Starts from current balance, then spreads recurring net cashflow across the next 30 days."
              : "Starts from current balance, then applies recurring income minus recurring expenses over the next 6 months."}
          </InfoTooltip>
        </div>
        <HomeChartRangeSelect value={chartRange} onChange={setChartRange} />
      </div>
      <div className="home-projection-chart-wrap">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={projectionSeries}
            margin={{ top: 12, right: 12, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ee" />
            <XAxis
              dataKey={projectionXAxisKey}
              tickFormatter={projectionTickFormatter}
              stroke="#566076"
              fontSize={11}
            />
            <YAxis
              tickFormatter={(value) =>
                Number(value || 0).toLocaleString(undefined, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                })
              }
              stroke="#566076"
              fontSize={11}
              width={58}
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value ?? 0))}
              labelFormatter={projectionLabelFormatter}
            />
            <Line
              type="monotone"
              dataKey="projected_savings"
              name="Projected Savings"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function HomeBalanceTrendSection({
  currentBalanceAmount,
  dailyBalanceTrendSeries,
  monthlyBalanceTrendSeries,
  formatMoney,
}) {
  const [isBalanceTrendInfoOpen, setIsBalanceTrendInfoOpen] = useState(false);
  const [chartRange, setChartRange] = useState("daily");
  const balanceSeries =
    chartRange === "daily" ? dailyBalanceTrendSeries : monthlyBalanceTrendSeries;
  const balanceXAxisKey = chartRange === "daily" ? "date_key" : "month_key";
  const balanceTickFormatter =
    chartRange === "daily" ? shortDateLabel : shortMonthLabel;
  const balanceLabelFormatter = (label) =>
    chartRange === "daily"
      ? fullDateLabel(String(label || ""))
      : monthLabel(String(label || ""));

  return (
    <section>
      <div className="home-chart-header">
        <div className="home-chart-title-row">
          <h2>Balance Over Time</h2>
          <InfoTooltip
            open={isBalanceTrendInfoOpen}
            onToggle={() => setIsBalanceTrendInfoOpen((open) => !open)}
            buttonLabel="Show balance over time description"
            dialogLabel="Balance over time description"
          >
            Historical balance reconstructed from current balance and recorded
            income, expenses, and debt cashflow over the selected range.
          </InfoTooltip>
        </div>
        <HomeChartRangeSelect value={chartRange} onChange={setChartRange} />
      </div>
      {balanceSeries.length === 0 ? (
        <p className="empty-state">
          {chartRange === "daily"
            ? "Not enough daily balance history to chart yet."
            : "Not enough monthly balance history to chart yet."}
        </p>
      ) : (
        <div className="home-projection-chart-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={balanceSeries}
              margin={{ top: 12, right: 12, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ee" />
              <XAxis
                dataKey={balanceXAxisKey}
                tickFormatter={balanceTickFormatter}
                stroke="#566076"
                fontSize={11}
              />
              <YAxis
                tickFormatter={(value) =>
                  Number(value || 0).toLocaleString(undefined, {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  })
                }
                stroke="#566076"
                fontSize={11}
                width={58}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value ?? 0))}
                labelFormatter={balanceLabelFormatter}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke="#0f766e"
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey={() => currentBalanceAmount}
                name="Current Balance"
                stroke="#94a3b8"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function HomeDashboardSidebar({
  balance,
  dashboardCurrentBalance,
  dashboardCurrentBalanceSummary,
  dashboardBalanceAccountName,
  isAllEntitiesSelected,
  safeToSpendAmount,
  bufferMonths,
  upcomingRecurringIncomeTotal,
  daysBeforeNextIncome,
  thirtyDayProjectionSeries,
  sixMonthProjectionSeries,
  dailyTrendSeries,
  monthlyTrendSeries,
  averageExpensePerMonth,
  averageDebtPerMonth,
  averageIncomePerMonth,
  expenseCategoryBreakdown,
  categoryRecords,
  balanceTopRecentDebtCategories,
  balanceTopRecentDebtCategoriesTotal,
  topRecentDebtPeriodLabel,
  formatMoney,
  formatDashboardMoney,
  formatCurrencySummary,
}) {
  const [isBalanceFormulaOpen, setIsBalanceFormulaOpen] = useState(false);
  const [isUpcomingExpensesInfoOpen, setIsUpcomingExpensesInfoOpen] =
    useState(false);
  const [isUpcomingIncomeInfoOpen, setIsUpcomingIncomeInfoOpen] =
    useState(false);
  const [isSafeToSpendInfoOpen, setIsSafeToSpendInfoOpen] = useState(false);
  const [isBufferMonthsInfoOpen, setIsBufferMonthsInfoOpen] = useState(false);
  const [isTopRecentDebtInfoOpen, setIsTopRecentDebtInfoOpen] = useState(false);
  const [isDaysBeforeNextIncomeInfoOpen, setIsDaysBeforeNextIncomeInfoOpen] =
    useState(false);

  const currentBalanceValue =
    dashboardCurrentBalanceSummary.length > 0
      ? formatCurrencySummary(dashboardCurrentBalanceSummary)
      : dashboardCurrentBalance !== null
        ? Number(dashboardCurrentBalance)
        : balance
          ? Number(balance.balance ?? 0)
          : "...";

  const balanceTopExpenseCategories = useMemo(() => {
    return expenseCategoryBreakdown
      .filter((row) => {
        const category = String(row?.category ?? "").trim();
        return !/^debt\s*payment(s)?$/i.test(category);
      })
      .slice(0, 5);
  }, [expenseCategoryBreakdown]);

  const balanceTopExpenseCategoriesTotal = useMemo(() => {
    return balanceTopExpenseCategories.reduce((sum, row) => sum + row.total, 0);
  }, [balanceTopExpenseCategories]);

  const expenseCategoryColorByName = useMemo(() => {
    const map = new Map();
    categoryRecords.forEach((item) => {
      const name = String(item?.name || "").trim();
      if (!name) {
        return;
      }
      map.set(name, resolveCategoryColor(item.color, `${item.id}:${name}`));
    });
    return map;
  }, [categoryRecords]);

  const getExpenseCategoryColorByName = (categoryName) => {
    const normalized = String(categoryName || "").trim() || "Uncategorized";
    const knownColor = expenseCategoryColorByName.get(normalized);
    return knownColor || resolveCategoryColor(null, `expense:${normalized}`);
  };

  return (
    <>
      <section>
        <h2>Home</h2>
        <div className="balance-badges">
          <StatCard
            label="Current Balance"
            tone="primary"
            value={currentBalanceValue}
            formatValue={typeof currentBalanceValue === "number" ? formatMoney : null}
            info={
              <InfoTooltip
                open={isBalanceFormulaOpen}
                onToggle={() => setIsBalanceFormulaOpen((open) => !open)}
                buttonLabel="Show current balance formula"
                dialogLabel="Current balance formula"
              >
                Current Balance = Total of account balances for{" "}
                {isAllEntitiesSelected ? "all entities" : "selected entity"}
                {dashboardBalanceAccountName
                  ? ` (${dashboardBalanceAccountName})`
                  : ""}{" "}
                ({dashboardCurrentBalance !== null ||
                dashboardCurrentBalanceSummary.length > 0
                  ? formatCurrencySummary(dashboardCurrentBalanceSummary)
                  : "..."})
              </InfoTooltip>
            }
          />

          <StatCard
            label="Upcoming Expense"
            tone="secondary"
            value={balance ? Number(balance.upcoming_recurring_expense_total ?? 0) : "..."}
            formatValue={formatDashboardMoney}
            info={
              <InfoTooltip
                open={isUpcomingExpensesInfoOpen}
                onToggle={() => setIsUpcomingExpensesInfoOpen((open) => !open)}
                buttonLabel="Show upcoming formula"
                dialogLabel="Upcoming formula"
              >
                Projected recurring expenses due from today through the next{" "}
                {balance?.safe_to_spend_window_days ?? 30} days. Weekly items
                are counted once for each due date in that window.
              </InfoTooltip>
            }
          />

          <StatCard
            label="Upcoming Income"
            tone="primary"
            value={Number(upcomingRecurringIncomeTotal ?? 0)}
            formatValue={formatDashboardMoney}
            info={
              <InfoTooltip
                open={isUpcomingIncomeInfoOpen}
                onToggle={() => setIsUpcomingIncomeInfoOpen((open) => !open)}
                buttonLabel="Show upcoming income formula"
                dialogLabel="Upcoming income formula"
              >
                The next immediate recurring income due amount. When a single
                entity is selected, incoming recurring transfers are also counted.
              </InfoTooltip>
            }
          />

          <StatCard
            label="Days Before Next Income"
            tone="light"
            value={daysBeforeNextIncome}
            formatValue={(value) => {
              if (value === null || value === undefined) {
                return "—";
              }
              if (value <= 0) {
                return "Today";
              }
              return value === 1 ? "1 day" : `${value} days`;
            }}
            info={
              <InfoTooltip
                open={isDaysBeforeNextIncomeInfoOpen}
                onToggle={() =>
                  setIsDaysBeforeNextIncomeInfoOpen((open) => !open)
                }
                buttonLabel="Show next income timing formula"
                dialogLabel="Next income timing formula"
              >
                Days until the next recurring income due date. When a single
                entity is selected, incoming recurring transfers are also counted.
              </InfoTooltip>
            }
          />

          <StatCard
            label="Safe to Spend"
            tone="success"
            value={safeToSpendAmount}
            formatValue={formatDashboardMoney}
            info={
              <InfoTooltip
                open={isSafeToSpendInfoOpen}
                onToggle={() => setIsSafeToSpendInfoOpen((open) => !open)}
                buttonLabel="Show safe to spend formula"
                dialogLabel="Safe to spend formula"
              >
                Safe to Spend = Current Balance - Upcoming - Total Debt
              </InfoTooltip>
            }
          />

          <StatCard
            label="Buffer Month/s"
            tone="dark"
            value={bufferMonths === null ? "—" : bufferMonths}
            formatValue={(value) => `${(Math.round(value * 10) / 10).toFixed(1)} mo`}
            info={
              <InfoTooltip
                open={isBufferMonthsInfoOpen}
                onToggle={() => setIsBufferMonthsInfoOpen((open) => !open)}
                buttonLabel="Show buffer months formula"
                dialogLabel="Buffer months formula"
              >
                Buffer Month/s = Safe to Spend / Monthly Recurring Expenses
              </InfoTooltip>
            }
          />
        </div>
      </section>

      <HomeSavingsProjectionSection
        thirtyDayProjectionSeries={thirtyDayProjectionSeries}
        sixMonthProjectionSeries={sixMonthProjectionSeries}
        formatMoney={formatMoney}
      />

      <section>
        <h2>Averages (Monthly)</h2>
        <div className="balance-badges">
          <StatCard
            label="Expenses"
            tone="secondary"
            value={Number(averageExpensePerMonth ?? 0)}
            formatValue={formatMoney}
          />
          <StatCard
            label="Debt"
            tone="danger"
            value={Number(averageDebtPerMonth ?? 0)}
            formatValue={formatMoney}
          />
          <StatCard
            label="Income"
            tone="primary"
            value={Number(averageIncomePerMonth ?? 0)}
            formatValue={formatMoney}
          />
        </div>
      </section>

      <section>
        <h2>Top Expenses</h2>
        {balanceTopExpenseCategories.length === 0 ? (
          <p className="empty-state">No expenses recorded for this month.</p>
        ) : (
          <div className="table-scroll home-top-list-scroll">
            <table className="table home-top-list-table">
              <thead>
                <tr>
                  <th className="cell-left home-top-list-rank-cell">#</th>
                  <th className="home-top-list-category-cell">Category</th>
                  <th className="cell-right home-top-list-total-cell">Total</th>
                  <th className="cell-right home-top-list-percent-cell">%</th>
                </tr>
              </thead>
              <tbody>
                {balanceTopExpenseCategories.map((row, index) => (
                  <tr key={`top-expense-left-${row.category}`}>
                    <td className="cell-left home-top-list-rank-cell">#{index + 1}</td>
                    <td className="home-top-list-category-cell">
                      <span
                        className="category-inline-badge"
                        style={buildCategoryBadgeStyle(
                          getExpenseCategoryColorByName(row.category)
                        )}
                      >
                        {row.category}
                      </span>
                    </td>
                    <td className="cell-right">{formatMoney(row.total)}</td>
                    <td className="cell-right">
                      {balanceTopExpenseCategoriesTotal
                        ? `${((row.total / balanceTopExpenseCategoriesTotal) * 100).toFixed(1)}%`
                        : "0.0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <h2 className="no-top" style={{ margin: 0 }}>
            Top Recent Debt
          </h2>
          <InfoTooltip
            open={isTopRecentDebtInfoOpen}
            onToggle={() => setIsTopRecentDebtInfoOpen((open) => !open)}
            buttonLabel="Show top recent debt period"
            dialogLabel="Top recent debt period"
          >
            {topRecentDebtPeriodLabel}
          </InfoTooltip>
        </div>
        {balanceTopRecentDebtCategories.length === 0 ? (
          <p className="empty-state">No debt recorded for this period.</p>
        ) : (
          <div className="table-scroll home-top-list-scroll">
            <table className="table home-top-list-table">
              <thead>
                <tr>
                  <th className="cell-left home-top-list-rank-cell">#</th>
                  <th className="home-top-list-category-cell">Category</th>
                  <th className="cell-right home-top-list-total-cell">Total</th>
                  <th className="cell-right home-top-list-percent-cell">%</th>
                </tr>
              </thead>
              <tbody>
                {balanceTopRecentDebtCategories.map((row, index) => (
                  <tr key={`top-recent-debt-left-${row.category}`}>
                    <td className="cell-left home-top-list-rank-cell">#{index + 1}</td>
                    <td className="home-top-list-category-cell">
                      <span
                        className="category-inline-badge"
                        style={buildCategoryBadgeStyle(
                          getExpenseCategoryColorByName(row.category)
                        )}
                      >
                        {row.category}
                      </span>
                    </td>
                    <td className="cell-right">{formatMoney(row.total)}</td>
                    <td className="cell-right">
                      {balanceTopRecentDebtCategoriesTotal
                        ? `${((row.total / balanceTopRecentDebtCategoriesTotal) * 100).toFixed(1)}%`
                        : "0.0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export function HomeDashboardMain({
  currentBalanceAmount,
  dailyBalanceTrendSeries,
  thirtyDayProjectionSeries,
  sixMonthProjectionSeries,
  dailyTrendSeries,
  monthlyBalanceTrendSeries,
  monthlyTrendSeries,
  balanceMonths,
  balanceMonth,
  onBalanceMonthChange,
  balanceMonthIncomeTotal,
  balanceMonthSavings,
  expenseBreakdownTotal,
  balanceDebtAccumulated,
  balanceDebtPaid,
  balanceDebtTotal,
  formatMoney,
}) {
  return (
    <>
      <HomeCashflowTrendSection
        dailyTrendSeries={dailyTrendSeries}
        monthlyTrendSeries={monthlyTrendSeries}
        formatMoney={formatMoney}
      />

      <div className="balance-month-filter balance-month-filter-top">
        <select value={balanceMonth} onChange={onBalanceMonthChange}>
          {balanceMonths.map((month) => (
            <option key={month} value={month}>
              {monthLabel(month)}
            </option>
          ))}
        </select>
      </div>

      <HomeBalanceTrendSection
        currentBalanceAmount={currentBalanceAmount}
        dailyBalanceTrendSeries={dailyBalanceTrendSeries}
        monthlyBalanceTrendSeries={monthlyBalanceTrendSeries}
        formatMoney={formatMoney}
      />

      <section>
        <div className="balance-badges">
          <StatCard
            label="Total Income"
            tone="primary"
            value={Number(balanceMonthIncomeTotal ?? 0)}
            formatValue={formatMoney}
          />
          <StatCard
            label="Current Savings"
            tone={balanceMonthSavings >= 0 ? "success" : "danger"}
            value={Number(balanceMonthSavings ?? 0)}
            formatValue={formatMoney}
          />
          <StatCard
            label="Expenses Total"
            tone="secondary"
            value={Number(expenseBreakdownTotal ?? 0)}
            formatValue={formatMoney}
          />
          <StatCard
            label="Debt Accumulated"
            tone="danger"
            value={Number(balanceDebtAccumulated ?? 0)}
            formatValue={formatMoney}
          />
          <StatCard
            label="Debt Paid"
            tone="success"
            value={Number(balanceDebtPaid ?? 0)}
            formatValue={formatMoney}
          />
          <StatCard
            label="Debt Balance"
            tone="danger"
            value={Number(balanceDebtTotal ?? 0)}
            formatValue={formatMoney}
          />
        </div>
      </section>
    </>
  );
}
