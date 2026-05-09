import React from "react";
import { buildCategoryBadgeStyle } from "../utils/categoryColors";
import Tabs from "./ui/Tabs";

export default function RightPanelBalanceView({
  expenseBreakdownTotal,
  expenseCategoryBreakdown,
  debtCategoryBreakdownTotal,
  debtCategoryBreakdown,
  getExpenseCategoryColorByName,
  getDebtCategoryColorByName,
  breakdownView,
  setBreakdownView,
  debtBreakdownView,
  setDebtBreakdownView,
  hoveredCategory,
  setHoveredCategory,
  hoveredDebtOrigin,
  setHoveredDebtOrigin,
  formatMoney,
}) {
  const totalForChart = expenseBreakdownTotal || 0;
  const slices = expenseCategoryBreakdown.map((row) => ({
    ...row,
    percent: totalForChart ? (row.total / totalForChart) * 100 : 0,
    color: getExpenseCategoryColorByName(row.category),
  }));
  const radius = 110;
  const center = 120;
  let cumulative = 0;
  const slicePaths = slices.map((slice) => {
    const startAngle = (cumulative / 100) * Math.PI * 2;
    cumulative += slice.percent;
    const endAngle = (cumulative / 100) * Math.PI * 2;
    const x1 = center + radius * Math.cos(startAngle - Math.PI / 2);
    const y1 = center + radius * Math.sin(startAngle - Math.PI / 2);
    const x2 = center + radius * Math.cos(endAngle - Math.PI / 2);
    const y2 = center + radius * Math.sin(endAngle - Math.PI / 2);
    const largeArc = slice.percent > 50 ? 1 : 0;
    return {
      d: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: slice.color,
    };
  });

  const debtTotalForChart = debtCategoryBreakdownTotal || 0;
  const debtSlices = debtCategoryBreakdown.map((row) => ({
    ...row,
    percent: debtTotalForChart ? (row.total / debtTotalForChart) * 100 : 0,
    color: getDebtCategoryColorByName(row.category),
  }));
  let cumulativeDebt = 0;
  const debtSlicePaths = debtSlices.map((slice) => {
    const startAngle = (cumulativeDebt / 100) * Math.PI * 2;
    cumulativeDebt += slice.percent;
    const endAngle = (cumulativeDebt / 100) * Math.PI * 2;
    const x1 = center + radius * Math.cos(startAngle - Math.PI / 2);
    const y1 = center + radius * Math.sin(startAngle - Math.PI / 2);
    const x2 = center + radius * Math.cos(endAngle - Math.PI / 2);
    const y2 = center + radius * Math.sin(endAngle - Math.PI / 2);
    const largeArc = slice.percent > 50 ? 1 : 0;
    return {
      d: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: slice.color,
    };
  });

  return (
    <>
      <section>
        <h2 className="no-top">Expense Category Breakdown</h2>
        <Tabs
          tabs={[
            { id: "table", label: "Table" },
            { id: "chart", label: "Chart" },
          ]}
          activeId={breakdownView}
          onChange={setBreakdownView}
          className="tabs-inline"
        />
        {breakdownView === "table" && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th className="cell-left">Category</th>
                  <th className="cell-right">Total</th>
                  <th className="cell-right">%</th>
                </tr>
              </thead>
              <tbody>
                {expenseCategoryBreakdown.map((row) => (
                  <tr key={`breakdown-${row.category}`}>
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
                    <td className="cell-right">{formatMoney(row.total)}</td>
                    <td className="cell-right">
                      {expenseBreakdownTotal
                        ? `${((row.total / expenseBreakdownTotal) * 100).toFixed(1)}%`
                        : "0.0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {breakdownView === "chart" && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <svg width="240" height="240" viewBox="0 0 240 240">
              {slicePaths.map((slice, index) => {
                const category = slices[index]?.category;
                const isHovered = hoveredCategory === category;
                const dimmed = hoveredCategory && hoveredCategory !== category ? 0.3 : 1;
                return (
                  <path
                    key={index}
                    d={slice.d}
                    fill={slice.color}
                    opacity={dimmed}
                    stroke={isHovered ? "#222" : "none"}
                    strokeWidth={isHovered ? 2 : 0}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })}
            </svg>
            <div style={{ minWidth: 220 }}>
              {slices.map((slice) => (
                <div
                  key={slice.category}
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 6,
                    background: hoveredCategory === slice.category ? "#eef3ff" : "transparent",
                    padding: "2px 4px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHoveredCategory(slice.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      marginTop: 4,
                      background: slice.color,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ flex: 1 }}>{slice.category}</span>
                  <span>{formatMoney(slice.total)}</span>
                  <span style={{ width: 48, textAlign: "right" }}>
                    {slice.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2>Debt Breakdown</h2>
        <Tabs
          tabs={[
            { id: "table", label: "Table" },
            { id: "chart", label: "Chart" },
          ]}
          activeId={debtBreakdownView}
          onChange={setDebtBreakdownView}
          className="tabs-inline"
        />
        {debtBreakdownView === "table" && (
          <>
            {debtCategoryBreakdown.length === 0 ? (
              <p className="empty-state">No debt category totals for this month.</p>
            ) : (
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
                    {debtCategoryBreakdown.map((row) => (
                      <tr key={`debt-breakdown-${row.category}`}>
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
                          {debtCategoryBreakdownTotal
                            ? `${((row.total / debtCategoryBreakdownTotal) * 100).toFixed(1)}%`
                            : "0.0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {debtBreakdownView === "chart" && (
          <>
            {debtSlices.length === 0 ? (
              <p className="empty-state">No debt category totals to chart.</p>
            ) : (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <svg width="240" height="240" viewBox="0 0 240 240">
                  {debtSlicePaths.map((slice, index) => {
                    const category = debtSlices[index]?.category;
                    const isHovered = hoveredDebtOrigin === category;
                    const dimmed =
                      hoveredDebtOrigin && hoveredDebtOrigin !== category ? 0.3 : 1;
                    return (
                      <path
                        key={index}
                        d={slice.d}
                        fill={slice.color}
                        opacity={dimmed}
                        stroke={isHovered ? "#222" : "none"}
                        strokeWidth={isHovered ? 2 : 0}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setHoveredDebtOrigin(category)}
                        onMouseLeave={() => setHoveredDebtOrigin(null)}
                      />
                    );
                  })}
                </svg>
                <div style={{ minWidth: 220 }}>
                  {debtSlices.map((slice) => (
                    <div
                      key={slice.category}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 6,
                        background:
                          hoveredDebtOrigin === slice.category ? "#eef3ff" : "transparent",
                        padding: "2px 4px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHoveredDebtOrigin(slice.category)}
                      onMouseLeave={() => setHoveredDebtOrigin(null)}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          marginTop: 4,
                          background: slice.color,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ flex: 1 }}>{slice.category}</span>
                      <span>{formatMoney(slice.total)}</span>
                      <span style={{ width: 48, textAlign: "right" }}>
                        {slice.percent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
