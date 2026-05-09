import { useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/base/Card";
import Badge from "@/components/base/Badge";
import { useScenarioSets } from "@/hooks/useScenarioSets";
import CompareScenariosModal from "./CompareScenariosModal";

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  frequency: "one-time" | "monthly";
  impactMonthly: number;
  impactCashFlow: number;
  category: string;
  upfrontCost?: number;
  impact12Month?: number;
  expectedReturn?: number;
}

interface ScenarioPlannerProps {
  title: string;
  subtitle: string;
  scenarios: Scenario[];
  overview: {
    currentMonthlyIncome: number;
    currentMonthlyExpense: number;
    currentMonthlySavings: number;
    currentNetWorth?: number;
    emergencyMonths?: number;
    totalBudgeted?: number;
    totalSpent?: number;
    totalRemaining?: number;
  };
  chartData: { month: string; baseline: number; withScenarios: number }[];
  cashFlowData: { month: string; income: number; expense: number; net: number }[];
  type: "budget" | "projection";
}

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${Math.abs(value).toFixed(0)}`;
}

export default function ScenarioPlanner({
  title,
  subtitle,
  scenarios,
  overview,
  chartData,
  cashFlowData,
  type,
}: ScenarioPlannerProps) {
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    sets,
    compareOpen,
    setCompareOpen,
    comparingIds,
    saveSet,
    deleteSet,
    applySet,
    toggleCompare,
    clearCompare,
  } = useScenarioSets(type);

  const toggleScenario = (id: string) => {
    setActiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApplySet = useCallback(
    (scenarioIds: string[]) => {
      setActiveIds(scenarioIds);
    },
    []
  );

  const handleSave = useCallback(
    (name: string, description: string) => {
      saveSet(name, description, activeIds);
    },
    [saveSet, activeIds]
  );

  const activeScenarios = useMemo(
    () => scenarios.filter((s) => activeIds.includes(s.id)),
    [scenarios, activeIds]
  );

  const totalMonthlyImpact = useMemo(
    () => activeScenarios.reduce((sum, s) => sum + s.impactMonthly, 0),
    [activeScenarios]
  );

  const totalOneTimeImpact = useMemo(
    () =>
      activeScenarios
        .filter((s) => s.frequency === "one-time")
        .reduce((sum, s) => sum + (s.impactCashFlow || s.amount), 0),
    [activeScenarios]
  );

  const total12MonthImpact = useMemo(
    () =>
      activeScenarios.reduce((sum, s) => {
        if (s.impact12Month) return sum + s.impact12Month;
        if (s.frequency === "monthly") return sum + s.impactMonthly * 12;
        return sum;
      }, 0),
    [activeScenarios]
  );

  const totalUpfrontCost = useMemo(
    () => activeScenarios.reduce((sum, s) => sum + (s.upfrontCost || 0), 0),
    [activeScenarios]
  );

  const newMonthlyIncome = overview.currentMonthlyIncome + Math.max(0, totalMonthlyImpact);
  const newMonthlyExpense = overview.currentMonthlyExpense + Math.abs(Math.min(0, totalMonthlyImpact));
  const newMonthlySavings = overview.currentMonthlySavings + totalMonthlyImpact;

  const projectedChartData = useMemo(() => {
    let cumulative = overview.currentNetWorth || 0;
    return chartData.map((d, i) => {
      if (i === 0) return { ...d, withScenarios: cumulative };
      const monthlyNet = overview.currentMonthlySavings + totalMonthlyImpact;
      cumulative += monthlyNet;
      return { ...d, withScenarios: cumulative };
    });
  }, [chartData, overview, totalMonthlyImpact]);

  const cashFlowChartData = useMemo(() => {
    return cashFlowData.map((d) => ({
      ...d,
      income: d.income + Math.max(0, totalMonthlyImpact),
      expense: d.expense + Math.abs(Math.min(0, totalMonthlyImpact)),
      net: d.net + totalMonthlyImpact,
    }));
  }, [cashFlowData, totalMonthlyImpact]);

  return (
    <>
      {/* Header with Compare button */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{title}</h1>
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {sets.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 mr-2">
              <span className="text-2xs text-text-secondary">Quick flip:</span>
              {sets.slice(0, 4).map((set) => {
                const isActive =
                  set.scenarioIds.length === activeIds.length &&
                  set.scenarioIds.every((id) => activeIds.includes(id));
                return (
                  <button
                    key={set.id}
                    onClick={() => handleApplySet(set.scenarioIds)}
                    className={`px-2.5 py-1 rounded-full text-2xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-accent text-white"
                        : "bg-bg-subtle text-text-secondary hover:text-text hover:bg-accent-light/30"
                    }`}
                  >
                    {set.name}
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={() => setCompareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-light text-accent-dark text-sm font-medium hover:bg-accent/10 transition-colors whitespace-nowrap"
          >
            <i className="ri-stack-line text-sm" />
            <span>Compare</span>
            {sets.length > 0 && (
              <span className="text-xs opacity-70">({sets.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* Impact Summary Bar */}
      <Card className="p-4 md:p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="flex-1">
            <p className="text-2xs text-text-secondary uppercase tracking-wide">
              Active Scenarios
            </p>
            <p className="text-xl font-bold text-text mt-1">
              {activeScenarios.length}{" "}
              <span className="text-sm font-normal text-text-secondary">
                / {scenarios.length}
              </span>
            </p>
          </div>
          <div className="h-8 w-px bg-bg-subtle hidden md:block" />
          <div className="flex-1">
            <p className="text-2xs text-text-secondary uppercase tracking-wide">
              Monthly Impact
            </p>
            <p
              className={`text-xl font-bold mt-1 ${
                totalMonthlyImpact >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {totalMonthlyImpact >= 0 ? "+" : "-"}
              {formatCurrency(totalMonthlyImpact)}
              <span className="text-sm font-normal text-text-secondary ml-1">/mo</span>
            </p>
          </div>
          <div className="h-8 w-px bg-bg-subtle hidden md:block" />
          <div className="flex-1">
            <p className="text-2xs text-text-secondary uppercase tracking-wide">
              12-Month Impact
            </p>
            <p
              className={`text-xl font-bold mt-1 ${
                total12MonthImpact >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {total12MonthImpact >= 0 ? "+" : "-"}
              {formatCurrency(total12MonthImpact)}
            </p>
          </div>
          {totalUpfrontCost > 0 && (
            <>
              <div className="h-8 w-px bg-bg-subtle hidden md:block" />
              <div className="flex-1">
                <p className="text-2xs text-text-secondary uppercase tracking-wide">
                  Upfront Cost
                </p>
                <p className="text-xl font-bold text-negative mt-1">
                  -{formatCurrency(totalUpfrontCost)}
                </p>
              </div>
            </>
          )}
          {totalOneTimeImpact < 0 && type === "budget" && (
            <>
              <div className="h-8 w-px bg-bg-subtle hidden md:block" />
              <div className="flex-1">
                <p className="text-2xs text-text-secondary uppercase tracking-wide">
                  One-Time Hit
                </p>
                <p className="text-xl font-bold text-negative mt-1">
                  -{formatCurrency(totalOneTimeImpact)}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Current vs New State Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-2xs text-text-secondary uppercase tracking-wide">Monthly Income</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold text-text tabular-nums">
              ${newMonthlyIncome.toLocaleString()}
            </span>
            {totalMonthlyImpact > 0 && (
              <span className="text-xs text-positive font-medium">
                +${totalMonthlyImpact.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-2xs text-text-secondary mt-1">
            Was ${overview.currentMonthlyIncome.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-2xs text-text-secondary uppercase tracking-wide">Monthly Expenses</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold text-text tabular-nums">
              ${newMonthlyExpense.toLocaleString()}
            </span>
            {totalMonthlyImpact < 0 && (
              <span className="text-xs text-negative font-medium">
                +${Math.abs(totalMonthlyImpact).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-2xs text-text-secondary mt-1">
            Was ${overview.currentMonthlyExpense.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-2xs text-text-secondary uppercase tracking-wide">
            Monthly Savings
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold text-text tabular-nums">
              ${newMonthlySavings.toLocaleString()}
            </span>
            {totalMonthlyImpact !== 0 && (
              <span
                className={`text-xs font-medium ${
                  totalMonthlyImpact > 0 ? "text-positive" : "text-negative"
                }`}
              >
                {totalMonthlyImpact > 0 ? "+" : ""}
                {totalMonthlyImpact.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-2xs text-text-secondary mt-1">
            Was ${overview.currentMonthlySavings.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Scenario List + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        {/* Scenarios List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-text">Scenarios</h2>
            <span className="text-2xs text-text-secondary">
              Toggle to simulate
            </span>
          </div>
          {scenarios.map((scenario) => {
            const active = activeIds.includes(scenario.id);
            const expanded = expandedId === scenario.id;
            return (
              <Card
                key={scenario.id}
                className={`p-4 transition-all duration-200 cursor-pointer ${
                  active
                    ? "ring-2 ring-accent/20 shadow-card-hover"
                    : "hover:shadow-card-hover"
                }`}
                onClick={() => toggleScenario(scenario.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      active
                        ? "bg-accent border-accent"
                        : "border-text-muted bg-transparent"
                    }`}
                  >
                    {active && (
                      <i className="ri-check-line text-white text-xs" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text">
                        {scenario.name}
                      </h3>
                      <Badge
                        variant={
                          scenario.type === "income" ? "positive" : "negative"
                        }
                        size="sm"
                      >
                        {scenario.type === "income" ? "Income" : "Expense"}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {scenario.frequency === "one-time"
                          ? "One-time"
                          : "Monthly"}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                      {scenario.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          scenario.type === "income"
                            ? "text-positive"
                            : "text-negative"
                        }`}
                      >
                        {scenario.type === "income" ? "+" : "-"}
                        {scenario.frequency === "monthly"
                          ? `$${scenario.amount}/mo`
                          : `$${scenario.amount}`}
                      </span>
                      <span className="text-2xs text-text-secondary">
                        {scenario.category}
                      </span>
                    </div>
                    {active && (
                      <div className="mt-3 pt-3 border-t border-bg-subtle">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-2xs text-text-secondary">
                              Monthly Impact
                            </p>
                            <p
                              className={`text-sm font-semibold tabular-nums ${
                                scenario.impactMonthly >= 0
                                  ? "text-positive"
                                  : "text-negative"
                              }`}
                            >
                              {scenario.impactMonthly >= 0 ? "+" : "-"}
                              {formatCurrency(scenario.impactMonthly)}
                            </p>
                          </div>
                          {scenario.impact12Month && (
                            <div>
                              <p className="text-2xs text-text-secondary">
                                12-Month Impact
                              </p>
                              <p
                                className={`text-sm font-semibold tabular-nums ${
                                  scenario.impact12Month >= 0
                                    ? "text-positive"
                                    : "text-negative"
                                }`}
                              >
                                {scenario.impact12Month >= 0 ? "+" : "-"}
                                {formatCurrency(scenario.impact12Month)}
                              </p>
                            </div>
                          )}
                          {scenario.upfrontCost && (
                            <div>
                              <p className="text-2xs text-text-secondary">
                                Upfront
                              </p>
                              <p className="text-sm font-semibold text-negative tabular-nums">
                                -{formatCurrency(scenario.upfrontCost)}
                              </p>
                            </div>
                          )}
                          {scenario.expectedReturn && (
                            <div>
                              <p className="text-2xs text-text-secondary">
                                Expected Return
                              </p>
                              <p className="text-sm font-semibold text-accent tabular-nums">
                                ~{scenario.expectedReturn}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Column */}
        <div className="lg:col-span-7 space-y-4">
          {/* Net Worth / Balance Projection Chart */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-text mb-1">
              {type === "budget" ? "Account Balance Projection" : "Net Worth Projection"}
            </h2>
            <p className="text-2xs text-text-secondary mb-4">
              With active scenarios applied
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={projectedChartData}
                  margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#1E40AF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#94A3B8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(15,23,42,0.05)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
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
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                    labelFormatter={(label: string) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="withScenarios"
                    stroke="#1E40AF"
                    strokeWidth={2.5}
                    fill="url(#projGrad)"
                    name="With Scenarios"
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    fill="url(#baseGrad)"
                    name="Current Path"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-accent rounded" />
                <span className="text-text-secondary">With Scenarios</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-text-muted" style={{ borderTop: "2px dashed #94A3B8", height: 0 }} />
                <span className="text-text-secondary">Current Path</span>
              </div>
            </div>
          </Card>

          {/* Monthly Cash Flow Chart */}
          <Card className="p-5">
            <h2 className="text-base font-semibold text-text mb-1">
              Monthly Cash Flow
            </h2>
            <p className="text-2xs text-text-secondary mb-4">
              Income, expenses, and net with scenarios
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cashFlowChartData}
                  margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(15,23,42,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
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
                  <Bar
                    dataKey="income"
                    fill="#22C55E"
                    radius={[4, 4, 0, 0]}
                    name="Income"
                  />
                  <Bar
                    dataKey="expense"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    name="Expenses"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-positive" />
                <span className="text-text-secondary">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-negative" />
                <span className="text-text-secondary">Expenses</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Category Impact Breakdown */}
      {activeScenarios.length > 0 && (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-text mb-4">
            Impact Breakdown by Category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(
              activeScenarios.reduce<Record<string, number>>((acc, s) => {
                acc[s.category] = (acc[s.category] || 0) + s.impactMonthly;
                return acc;
              }, {})
            ).map(([category, impact]) => (
              <div
                key={category}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-subtle"
              >
                <div>
                  <p className="text-sm font-medium text-text">{category}</p>
                  <p className="text-2xs text-text-secondary mt-0.5">
                    {activeScenarios.filter((s) => s.category === category).length}{" "}
                    scenario
                    {activeScenarios.filter((s) => s.category === category).length > 1
                      ? "s"
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    impact >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {impact >= 0 ? "+" : "-"}
                  {formatCurrency(impact)}
                  <span className="text-2xs text-text-secondary font-normal ml-1">/mo</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <CompareScenariosModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        pageType={type}
        savedSets={sets}
        allScenarios={scenarios}
        currentActiveIds={activeIds}
        onSave={handleSave}
        onDelete={deleteSet}
        onApply={handleApplySet}
        onCompareToggle={toggleCompare}
        comparingIds={comparingIds}
        onClearCompare={clearCompare}
      />
    </>
  );
}