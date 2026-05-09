import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
} from "recharts";
import Card from "@/components/base/Card";
import { cashFlow } from "@/mocks/dashboard";

function formatCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

export default function CashFlowSection() {
  const [period, setPeriod] = useState("month");
  const { totalIncome, totalExpenses, netSavings, chartData } = cashFlow;

  const displayData =
    period === "week"
      ? chartData.slice(-7)
      : period === "quarter"
        ? chartData
        : chartData;

  return (
    <Card className="p-5 md:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text">Monthly Cash Flow</h2>
          <p className="text-sm text-text-secondary mt-0.5">{cashFlow.month}</p>
        </div>
        <div className="flex items-center gap-1 bg-bg-subtle rounded-lg p-1">
          {["week", "month", "quarter"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                period === p
                  ? "bg-white text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {p === "week" ? "7 days" : p === "quarter" ? "90 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#1E40AF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: "10px",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}`,
                name,
              ]}
            />
            <Bar dataKey="income" fill="rgba(34,197,94,0.15)" radius={[3, 3, 0, 0]} barSize={4} />
            <Bar dataKey="expense" fill="rgba(239,68,68,0.15)" radius={[3, 3, 0, 0]} barSize={4} />
            <Area
              type="monotone"
              dataKey="net"
              stroke="#1E40AF"
              strokeWidth={2}
              fill="url(#netGradient)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="bg-positive-light rounded-lg p-4 text-center">
          <div className="w-6 h-6 mx-auto mb-2 rounded-full bg-positive/15 flex items-center justify-center">
            <i className="ri-arrow-down-line text-positive text-xs" />
          </div>
          <p className="text-2xs text-text-secondary uppercase tracking-wide">Income</p>
          <p className="text-lg font-bold text-text mt-1 tabular-nums">
            ${totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-negative-light rounded-lg p-4 text-center">
          <div className="w-6 h-6 mx-auto mb-2 rounded-full bg-negative/15 flex items-center justify-center">
            <i className="ri-arrow-up-line text-negative text-xs" />
          </div>
          <p className="text-2xs text-text-secondary uppercase tracking-wide">Expenses</p>
          <p className="text-lg font-bold text-text mt-1 tabular-nums">
            ${totalExpenses.toLocaleString()}
          </p>
        </div>
        <div className="bg-accent-light rounded-lg p-4 text-center">
          <div className="w-6 h-6 mx-auto mb-2 rounded-full bg-accent/15 flex items-center justify-center">
            <i className="ri-safe-line text-accent text-xs" />
          </div>
          <p className="text-2xs text-text-secondary uppercase tracking-wide">Net Savings</p>
          <p className="text-lg font-bold text-positive mt-1 tabular-nums">
            ${netSavings.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}