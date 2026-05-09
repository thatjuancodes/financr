import React from "react";

const TONE_CLASS = {
  primary: "balance-badge balance-badge-primary",
  secondary: "balance-badge balance-badge-secondary",
  success: "balance-badge balance-badge-success",
  danger: "balance-badge balance-badge-danger",
  dark: "balance-badge balance-badge-dark",
  light: "balance-badge balance-badge-light",
  incomeLight: "balance-badge balance-badge-income-light",
  expenseLight: "balance-badge balance-badge-expense-light",
};

export default function StatCard({
  label,
  value,
  tone = "light",
  info = null,
  formatValue = null,
}) {
  const renderedValue =
    typeof value === "number" && Number.isFinite(value)
      ? typeof formatValue === "function"
        ? formatValue(value)
        : String(Math.round(value * 100) / 100)
      : value;

  return (
    <article className={TONE_CLASS[tone] || TONE_CLASS.light}>
      <p className="balance-badge-label">{label}</p>
      {info && <div className="balance-badge-info">{info}</div>}
      <p className="balance-badge-value">{renderedValue}</p>
    </article>
  );
}
