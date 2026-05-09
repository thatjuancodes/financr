import React from "react";
import { buildCategoryBadgeStyle } from "../utils/categoryColors";
import Button from "./ui/Button";
import StatCard from "./ui/StatCard";

export default function RightPanelReportsView({
  selectedMonthlyReport,
  selectedReportMonth,
  monthLabel,
  getExpenseCategoryColorByName,
  getDebtCategoryColorByName,
  buildPieSlicePaths,
  formatMoney,
  formatPercent,
  reportsRouteMode,
  onGenerateMonthlyReport,
  monthlyReports,
  onOpenReportDetail,
  onBackToReportsList,
  isMonthlyReportLoading,
  hoveredCategory,
  setHoveredCategory,
  hoveredDebtOrigin,
  setHoveredDebtOrigin,
}) {
  const report = selectedMonthlyReport?.report || null;
  const reportMonthLabel = selectedReportMonth ? monthLabel(selectedReportMonth) : "";
  const reportExpenses = Array.isArray(report?.transactionsList?.expenses)
    ? report.transactionsList.expenses
    : [];
  const reportIncome = Array.isArray(report?.transactionsList?.income)
    ? report.transactionsList.income
    : [];
  const reportDebtTransactions = Array.isArray(report?.transactionsList?.debts)
    ? report.transactionsList.debts
    : [];
  const reportExpenseBreakdown = Array.isArray(report?.categories) ? report.categories : [];
  const reportExpenseBreakdownTotal = reportExpenseBreakdown.reduce(
    (sum, row) => sum + Number(row?.amount ?? 0),
    0
  );
  const reportExpenseSlices = reportExpenseBreakdown.map((row) => ({
    category: row.category,
    total: Number(row.amount ?? 0),
    percent:
      reportExpenseBreakdownTotal > 0
        ? (Number(row.amount ?? 0) / reportExpenseBreakdownTotal) * 100
        : 0,
    color: getExpenseCategoryColorByName(row.category),
    delta: Number(row.delta ?? 0),
  }));
  const reportExpenseSlicePaths = buildPieSlicePaths(reportExpenseSlices);

  const reportDebtBreakdownMap = new Map();
  reportDebtTransactions.forEach((item) => {
    const category = String(item?.category || "").trim() || "Uncategorized";
    const amount = Math.abs(Number(item?.amount ?? 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    reportDebtBreakdownMap.set(category, (reportDebtBreakdownMap.get(category) || 0) + amount);
  });
  const reportDebtBreakdown = Array.from(reportDebtBreakdownMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const reportDebtBreakdownTotal = reportDebtBreakdown.reduce(
    (sum, row) => sum + Number(row.total ?? 0),
    0
  );
  const reportDebtSlices = reportDebtBreakdown.map((row) => ({
    category: row.category,
    total: Number(row.total ?? 0),
    percent:
      reportDebtBreakdownTotal > 0
        ? (Number(row.total ?? 0) / reportDebtBreakdownTotal) * 100
        : 0,
    color: getDebtCategoryColorByName(row.category),
  }));
  const reportDebtSlicePaths = buildPieSlicePaths(reportDebtSlices);

  const recurringData = report?.recurring || {};
  const summaryIncome = Number(report?.summary?.income ?? 0);
  const summaryExpenses = Number(report?.summary?.expenses ?? 0);
  const summaryNet = Number(report?.summary?.net ?? 0);
  const savingsRate = Number(report?.summary?.savingsRate ?? 0);
  const expenseRate = summaryIncome > 0 ? summaryExpenses / summaryIncome : 0;
  const debtRateFromDti = Number(report?.debt?.dti);
  const debtRate = Number.isFinite(debtRateFromDti)
    ? debtRateFromDti
    : summaryIncome > 0
      ? Number(report?.debt?.monthlyPayment ?? 0) / summaryIncome
      : 0;

  const expectedIncomeMonthly = Number(recurringData.expected_income_monthly ?? 0);
  const expectedExpenseMonthly = Number(recurringData.expected_expense_monthly ?? 0);
  const buildExpectedVsActualValue = (expected, actual) => {
    const safeExpected = Number(expected ?? 0);
    const safeActual = Number(actual ?? 0);
    const delta = safeActual - safeExpected;
    const isUp = delta >= 0;
    const denominator =
      Math.abs(safeExpected) > 0 ? Math.abs(safeExpected) : Math.max(Math.abs(safeActual), 1);
    const variancePercent = (Math.abs(delta) / denominator) * 100;
    return (
      <span className="report-compare-value">
        <span>{formatMoney(safeExpected)} vs {formatMoney(safeActual)}</span>
        <span className={`report-compare-trend ${isUp ? "up" : "down"}`}>
          {isUp ? "▲" : "▼"} {variancePercent.toFixed(1)}%{" "}
          {isUp ? "above expected" : "below expected"}
        </span>
      </span>
    );
  };

  return (
    <>
      {reportsRouteMode !== "detail" && (
        <section className="reports-months-section">
          <div className="income-header-row">
            <h2 className="no-top">Monthly Reports</h2>
            <Button type="button" size="sm" onClick={() => onGenerateMonthlyReport?.(null)}>
              Generate Last Closed Month
            </Button>
          </div>
          <p className="subtle-text subtle-text-flush">
            Overview of generated monthly reports.
          </p>
          {monthlyReports.length === 0 ? (
            <p className="empty-state">No monthly reports yet.</p>
          ) : (
            <div className="table-scroll">
              <table className="table reports-months-table">
                <thead>
                  <tr>
                    <th className="cell-left">Month</th>
                    <th className="cell-right">Income</th>
                    <th className="cell-right">Expenses</th>
                    <th className="cell-right">Net</th>
                    <th className="cell-right">Generated</th>
                    <th className="cell-right">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReports.map((item) => (
                    <tr
                      key={`report-month-${item.month_key}`}
                      className={`expense-row${selectedReportMonth === item.month_key ? " expense-row-active" : ""}`}
                      onClick={() => onOpenReportDetail?.(item.month_key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenReportDetail?.(item.month_key);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open monthly report for ${monthLabel(item.month_key)}`}
                    >
                      <td className="cell-left">{monthLabel(item.month_key)}</td>
                      <td className="cell-right">{formatMoney(item.summary?.income ?? 0)}</td>
                      <td className="cell-right">{formatMoney(item.summary?.expenses ?? 0)}</td>
                      <td className="cell-right">{formatMoney(item.summary?.net ?? 0)}</td>
                      <td className="cell-right">{String(item.generated_at || "").slice(0, 10)}</td>
                      <td className="cell-right">{String(item.updated_at || "").slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {reportsRouteMode === "detail" && selectedReportMonth && (
        <>
          <div className="reports-detail-actions">
            <Button
              type="button"
              size="sm"
              variant="subtle"
              className="report-print-button"
              onClick={() => {
                if (typeof window !== "undefined" && typeof document !== "undefined") {
                  const previousTitle = document.title;
                  const printTitle = `Homemaker Finance - ${reportMonthLabel} Financial Report`;
                  const restoreTitle = () => {
                    document.title = previousTitle;
                  };
                  document.title = printTitle;
                  window.addEventListener("afterprint", restoreTitle, { once: true });
                  window.print();
                  window.setTimeout(restoreTitle, 1500);
                }
              }}
            >
              Print Report
            </Button>
            <Button type="button" size="sm" variant="subtle" onClick={() => onBackToReportsList?.()}>
              Back to Months
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onGenerateMonthlyReport?.(selectedReportMonth || null)}
            >
              Regenerate This Month
            </Button>
          </div>

          <section className="reports-details-section">
            <div className="income-header-row">
              <h2 className="no-top">Report: {reportMonthLabel}</h2>
            </div>

            {isMonthlyReportLoading ? (
              <p className="empty-state">Loading report...</p>
            ) : !report ? (
              <p className="empty-state">Report data is unavailable for this month.</p>
            ) : (
              <div className="report-details-stack">
                <div className="report-subsection">
                  <h3>Overview</h3>
                  <div className="balance-badges">
                    <StatCard label="Income" tone="primary" value={summaryIncome} formatValue={formatMoney} />
                    <StatCard label="Expenses" tone="secondary" value={summaryExpenses} formatValue={formatMoney} />
                    <StatCard
                      label="Net"
                      tone={summaryNet >= 0 ? "success" : "danger"}
                      value={summaryNet}
                      formatValue={formatMoney}
                    />
                    <StatCard label="Savings Rate" tone="dark" value={formatPercent(savingsRate)} />
                    <StatCard label="Expense Rate" tone="dark" value={formatPercent(expenseRate)} />
                    <StatCard label="Debt Rate" tone="dark" value={formatPercent(debtRate)} />
                    <StatCard
                      label="Expected"
                      tone="incomeLight"
                      value={Number(report.expectedVsUnexpected?.expected ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Unexpected"
                      tone="expenseLight"
                      value={Number(report.expectedVsUnexpected?.unexpected ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Buffer"
                      tone="light"
                      value={Number(report.buffer?.current ?? 0)}
                      formatValue={(value) => `${Number(value).toFixed(2)} mo`}
                    />
                    <StatCard
                      label="6-Month Cash"
                      tone="dark"
                      value={Number(report.projection?.month6Cash ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Expected Income Monthly"
                      tone="incomeLight"
                      value={Number(recurringData.expected_income_monthly ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Expected Income Weekly"
                      tone="incomeLight"
                      value={Number(recurringData.expected_income_weekly ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Expected Expenses Monthly"
                      tone="expenseLight"
                      value={Number(recurringData.expected_expense_monthly ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Expected Expenses Weekly"
                      tone="expenseLight"
                      value={Number(recurringData.expected_expense_weekly ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Spending Power Monthly"
                      tone={
                        Number(recurringData.spending_power_monthly ?? 0) >= 0
                          ? "success"
                          : "danger"
                      }
                      value={Number(recurringData.spending_power_monthly ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Spending Power Weekly"
                      tone={
                        Number(recurringData.spending_power_weekly ?? 0) >= 0
                          ? "success"
                          : "danger"
                      }
                      value={Number(recurringData.spending_power_weekly ?? 0)}
                      formatValue={formatMoney}
                    />
                    <StatCard
                      label="Income Expected vs Actual"
                      tone="incomeLight"
                      value={buildExpectedVsActualValue(expectedIncomeMonthly, summaryIncome)}
                    />
                    <StatCard
                      label="Expenses Expected vs Actual"
                      tone="expenseLight"
                      value={buildExpectedVsActualValue(expectedExpenseMonthly, summaryExpenses)}
                    />
                  </div>
                </div>

                <div className="report-subsection report-category-breakdown-section">
                  <h3>Category Breakdown</h3>
                  <div className="report-breakdown-grid">
                    <div className="report-breakdown-panel">
                      <h4 className="report-breakdown-title">Expenses</h4>
                      {reportExpenseSlicePaths.length > 0 ? (
                        <div className="report-breakdown-chart">
                          <svg width="240" height="240" viewBox="0 0 240 240">
                            {reportExpenseSlicePaths.map((slice) => {
                              const isHovered = hoveredCategory === slice.category;
                              const dimmed =
                                hoveredCategory && hoveredCategory !== slice.category ? 0.3 : 1;
                              return (
                                <path
                                  key={`report-expense-slice-${slice.category}`}
                                  d={slice.d}
                                  fill={slice.color}
                                  opacity={dimmed}
                                  stroke={isHovered ? "#222" : "none"}
                                  strokeWidth={isHovered ? 2 : 0}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={() => setHoveredCategory(slice.category)}
                                  onMouseLeave={() => setHoveredCategory(null)}
                                />
                              );
                            })}
                          </svg>
                        </div>
                      ) : (
                        <p className="empty-state">No expense category totals for this month.</p>
                      )}
                      <div className="table-scroll">
                        <table className="table">
                          <thead>
                            <tr>
                              <th className="cell-left">Category</th>
                              <th className="cell-right">Amount</th>
                              <th className="cell-right">%</th>
                              <th className="cell-right">Delta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportExpenseBreakdown.map((row) => (
                              <tr key={`report-category-expense-${row.category}`}>
                                <td className="cell-left">
                                  <span
                                    className="category-inline-badge"
                                    style={buildCategoryBadgeStyle(
                                      getExpenseCategoryColorByName(row.category)
                                    )}
                                  >
                                    {row.category}
                                  </span>
                                </td>
                                <td className="cell-right">{formatMoney(row.amount)}</td>
                                <td className="cell-right">{formatPercent(row.percent)}</td>
                                <td className="cell-right">
                                  {Number(row.delta) >= 0 ? "+" : ""}
                                  {formatMoney(row.delta)}
                                </td>
                              </tr>
                            ))}
                            {reportExpenseBreakdown.length === 0 && (
                              <tr>
                                <td className="cell-left" colSpan={4}>
                                  No expense category totals for this month.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="report-breakdown-panel">
                      <h4 className="report-breakdown-title">Debt</h4>
                      {reportDebtSlicePaths.length > 0 ? (
                        <div className="report-breakdown-chart">
                          <svg width="240" height="240" viewBox="0 0 240 240">
                            {reportDebtSlicePaths.map((slice) => {
                              const isHovered = hoveredDebtOrigin === slice.category;
                              const dimmed =
                                hoveredDebtOrigin && hoveredDebtOrigin !== slice.category
                                  ? 0.3
                                  : 1;
                              return (
                                <path
                                  key={`report-debt-slice-${slice.category}`}
                                  d={slice.d}
                                  fill={slice.color}
                                  opacity={dimmed}
                                  stroke={isHovered ? "#222" : "none"}
                                  strokeWidth={isHovered ? 2 : 0}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={() => setHoveredDebtOrigin(slice.category)}
                                  onMouseLeave={() => setHoveredDebtOrigin(null)}
                                />
                              );
                            })}
                          </svg>
                        </div>
                      ) : (
                        <p className="empty-state">No debt category totals for this month.</p>
                      )}
                      <div className="table-scroll">
                        <table className="table">
                          <thead>
                            <tr>
                              <th className="cell-left">Category</th>
                              <th className="cell-right">Amount</th>
                              <th className="cell-right">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportDebtBreakdown.map((row) => (
                              <tr key={`report-category-debt-${row.category}`}>
                                <td className="cell-left">
                                  <span
                                    className="category-inline-badge"
                                    style={buildCategoryBadgeStyle(
                                      getDebtCategoryColorByName(row.category)
                                    )}
                                  >
                                    {row.category}
                                  </span>
                                </td>
                                <td className="cell-right">{formatMoney(row.total)}</td>
                                <td className="cell-right">
                                  {reportDebtBreakdownTotal
                                    ? `${(
                                        (Number(row.total ?? 0) / reportDebtBreakdownTotal) *
                                        100
                                      ).toFixed(1)}%`
                                    : "0.0%"}
                                </td>
                              </tr>
                            ))}
                            {reportDebtBreakdown.length === 0 && (
                              <tr>
                                <td className="cell-left" colSpan={3}>
                                  No debt category totals for this month.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Debt Snapshot</h3>
                  <div className="table-scroll">
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="cell-left">Debt</th>
                          <th className="cell-right">Balance</th>
                          <th className="cell-right">Monthly Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.debt?.debts || []).map((row) => (
                          <tr key={`report-debt-${row.id}`}>
                            <td className="cell-left">{row.id}</td>
                            <td className="cell-right">{formatMoney(row.balance)}</td>
                            <td className="cell-right">{formatMoney(row.monthlyPayment)}</td>
                          </tr>
                        ))}
                        {(report.debt?.debts || []).length === 0 && (
                          <tr>
                            <td className="cell-left" colSpan={3}>
                              No debt snapshot for this month.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Optimization Opportunities</h3>
                  <div className="table-scroll">
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="cell-left">Category</th>
                          <th className="cell-right">Cut %</th>
                          <th className="cell-right">6-Month Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.optimizations || []).map((row, index) => (
                          <tr key={`report-opt-${index}-${row.category}`}>
                            <td className="cell-left">{row.category}</td>
                            <td className="cell-right">{row.cutPercent}%</td>
                            <td className="cell-right">{formatMoney(row.impact)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="report-subsection report-transactions-section">
                  <h3>Transactions</h3>
                  <div className="report-transactions-grid">
                    <div className="report-transactions-column">
                      <div className="report-subsection report-transactions-subsection">
                        <h3>Income Transactions</h3>
                        <div className="table-scroll">
                          <table className="table">
                            <thead>
                              <tr>
                                <th className="cell-left">Date</th>
                                <th>Category</th>
                                <th className="cell-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportIncome.map((item) => (
                                <tr key={`report-income-row-${item.id}`}>
                                  <td className="cell-left">{item.date}</td>
                                  <td>{item.category}</td>
                                  <td className="cell-right">{formatMoney(item.amount)}</td>
                                </tr>
                              ))}
                              {reportIncome.length === 0 && (
                                <tr>
                                  <td className="cell-left" colSpan={3}>
                                    No income transactions.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="report-subsection report-transactions-subsection">
                        <h3>Debt Transactions</h3>
                        <div className="table-scroll report-debt-transactions-wrap">
                          <table className="table report-debt-transactions-table">
                            <colgroup>
                              <col className="report-debt-date-column" />
                              <col className="report-debt-name-column" />
                              <col className="report-debt-category-column" />
                              <col className="report-debt-amount-column" />
                            </colgroup>
                            <thead>
                              <tr>
                                <th className="cell-left">Date</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th className="cell-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportDebtTransactions.map((item) => (
                                <tr key={`report-debt-transaction-row-${item.id}`}>
                                  <td className="cell-left">{item.date}</td>
                                  <td>{item.name || item.id}</td>
                                  <td>{item.category || "Uncategorized"}</td>
                                  <td className="cell-right">{formatMoney(item.amount)}</td>
                                </tr>
                              ))}
                              {reportDebtTransactions.length === 0 && (
                                <tr>
                                  <td className="cell-left" colSpan={4}>
                                    No debt transactions.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="report-subsection report-transactions-subsection">
                      <h3>Expense Transactions</h3>
                      <div className="table-scroll">
                        <table className="table">
                          <thead>
                            <tr>
                              <th className="cell-left">Date</th>
                              <th>Category</th>
                              <th>Expected</th>
                              <th className="cell-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportExpenses.map((item) => (
                              <tr key={`report-expense-row-${item.id}`}>
                                <td className="cell-left">{item.date}</td>
                                <td>{item.category}</td>
                                <td>{item.expected === false ? "No" : "Yes"}</td>
                                <td className="cell-right">
                                  {formatMoney(Math.abs(Number(item.amount ?? 0)))}
                                </td>
                              </tr>
                            ))}
                            {reportExpenses.length === 0 && (
                              <tr>
                                <td className="cell-left" colSpan={4}>
                                  No expense transactions.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {reportsRouteMode === "detail" && !selectedReportMonth && (
        <>
          <div className="reports-detail-actions">
            <Button type="button" size="sm" variant="subtle" onClick={() => onBackToReportsList?.()}>
              Back to Months
            </Button>
          </div>
          <section className="reports-details-section">
            <p className="empty-state">No report month selected.</p>
          </section>
        </>
      )}
    </>
  );
}
