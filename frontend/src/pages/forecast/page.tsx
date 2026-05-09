import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
  buildProjectionChartData,
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/finance";
import type { ProjectionScenarioDetail } from "@/types/finance";

type ForecastTab = "budget" | "projection";

type ScenarioDraft = {
  id?: string;
  entity_id: string;
  name: string;
  currency: string;
  initial_amount: string;
  annual_interest_rate: string;
  duration_months: string;
  monthly_contribution: string;
};

const emptyDraft: ScenarioDraft = {
  entity_id: "",
  name: "",
  currency: "PHP",
  initial_amount: "0",
  annual_interest_rate: "0.06",
  duration_months: "60",
  monthly_contribution: "0",
};

export default function Forecast() {
  const {
    balance,
    budgets,
    createProjectionScenario,
    deleteProjectionScenario,
    duplicateProjectionScenario,
    entities,
    loadProjectionScenario,
    loading,
    previewProjectionScenario,
    projectionScenarios,
    selectedEntityId,
    updateProjectionScenario,
  } = useFinanceData();
  const [tab, setTab] = useState<ForecastTab>("budget");
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [detail, setDetail] = useState<ProjectionScenarioDetail | null>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [draft, setDraft] = useState<ScenarioDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  const currency = balance?.currency_code || "PHP";
  const defaultEntityId =
    (selectedEntityId && selectedEntityId !== "all" ? selectedEntityId : entities[0]?.id) || "";

  useEffect(() => {
    if (!projectionScenarios.length) {
      setSelectedScenarioId("");
      setDetail(null);
      setDraft((prev) => ({ ...emptyDraft, entity_id: defaultEntityId, currency }));
      return;
    }
    const currentId =
      projectionScenarios.find((scenario) => scenario.id === selectedScenarioId)?.id ||
      projectionScenarios[0].id;
    setSelectedScenarioId(currentId);
  }, [currency, defaultEntityId, projectionScenarios, selectedScenarioId]);

  useEffect(() => {
    if (!selectedScenarioId) {
      return;
    }
    let cancelled = false;
    setBusy(true);
    loadProjectionScenario(selectedScenarioId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setDetail(response);
        setPreviewResult(null);
        setDraft({
          id: response.scenario.id,
          entity_id: response.scenario.entity_id,
          name: response.scenario.name,
          currency: response.scenario.currency,
          initial_amount: String(response.scenario.initial_amount ?? 0),
          annual_interest_rate: String(response.scenario.annual_interest_rate ?? 0),
          duration_months: String(response.scenario.duration_months ?? 60),
          monthly_contribution: String(response.scenario.monthly_contribution ?? 0),
        });
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadProjectionScenario, selectedScenarioId]);

  const chartData = useMemo(() => {
    const result = previewResult || detail?.result;
    return result?.timeline ? buildProjectionChartData(result.timeline) : [];
  }, [detail, previewResult]);

  const activeSummary = (previewResult || detail?.result) ?? null;

  async function handlePreview() {
    setBusy(true);
    try {
      const response = await previewProjectionScenario(toScenarioPayload(draft));
      setPreviewResult(response.result);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    const payload = toScenarioPayload(draft);
    setBusy(true);
    try {
      if (draft.id) {
        await updateProjectionScenario(draft.id, payload);
      } else {
        await createProjectionScenario(payload);
      }
      setPreviewResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleNew() {
    setDraft({
      ...emptyDraft,
      entity_id: defaultEntityId,
      currency,
      name: `Projection ${projectionScenarios.length + 1}`,
    });
    setDetail(null);
    setSelectedScenarioId("");
    setPreviewResult(null);
    setTab("projection");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading forecast data..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">Forecast</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Budget schedules and savings projections from the existing backend
            </p>
          </div>
          <button
            onClick={handleNew}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark"
          >
            New scenario
          </button>
        </div>

        <div className="mb-6 flex w-fit items-center gap-1 rounded-lg bg-bg-subtle p-1">
          <button
            onClick={() => setTab("budget")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "budget" ? "bg-white text-text shadow-sm" : "text-text-secondary"
            }`}
          >
            Budgeting
          </button>
          <button
            onClick={() => setTab("projection")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "projection" ? "bg-white text-text shadow-sm" : "text-text-secondary"
            }`}
          >
            Projections
          </button>
        </div>

        {tab === "budget" ? (
          budgets.length === 0 ? (
            <EmptyState title="No budgets yet" body="Create budgets in Settings to populate this view." />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {budgets.map((budget) => (
                <Card key={budget.id} className="p-5 md:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-text">{budget.name}</h2>
                      <p className="text-sm text-text-secondary">
                        {budget.entity_name} • {budget.category || "Uncategorized"}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent-light px-3 py-1 text-xs font-semibold text-accent-dark">
                      {budget.payment_plan.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <MiniStat label="Target" value={formatCurrency(budget.target_amount, currency)} />
                    <MiniStat
                      label="Remaining"
                      value={formatCurrency(budget.remaining_amount, currency)}
                      accent={budget.remaining_amount > 0 ? "default" : "negative"}
                    />
                    <MiniStat label="Monthly Impact" value={formatCurrency(budget.monthly_impact, currency)} />
                    <MiniStat label="Next Payment" value={budget.next_payment_date || "Done"} />
                  </div>

                  <div>
                    <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-text-secondary">
                      Schedule Preview
                    </p>
                    <div className="space-y-2">
                      {budget.schedule_preview.slice(0, 4).map((entry) => (
                        <div key={`${budget.id}-${entry.date}`} className="flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2">
                          <span className="text-sm text-text">{entry.date}</span>
                          <span className="text-sm font-medium text-text">
                            {formatCurrency(entry.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px,1fr]">
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text">Scenarios</h2>
                <span className="text-sm text-text-secondary">{projectionScenarios.length}</span>
              </div>
              <div className="space-y-2">
                {projectionScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedScenarioId === scenario.id
                        ? "border-accent bg-accent-light/40"
                        : "border-transparent bg-bg-subtle"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">{scenario.name}</p>
                        <p className="text-2xs text-text-secondary">
                          {scenario.entity_name} • {scenario.duration_months} months
                        </p>
                      </div>
                      <span className="text-2xs font-semibold text-text-secondary">
                        {formatCompactCurrency(scenario.result_summary?.final_value || 0, scenario.currency)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text">Projection Editor</h2>
                    <p className="text-sm text-text-secondary">
                      Preview and save against the existing projection endpoints
                    </p>
                  </div>
                  {draft.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => duplicateProjectionScenario(draft.id!)}
                        className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:text-text"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => deleteProjectionScenario(draft.id!)}
                        className="rounded-md bg-negative-light px-3 py-1.5 text-sm font-medium text-negative-dark transition hover:bg-negative-light/70"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Scenario Name">
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                  </Field>
                  <Field label="Entity">
                    <select
                      value={draft.entity_id}
                      onChange={(event) => setDraft((prev) => ({ ...prev, entity_id: event.target.value }))}
                      className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    >
                      {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Currency">
                    <input
                      value={draft.currency}
                      onChange={(event) => setDraft((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                      className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm uppercase outline-none"
                    />
                  </Field>
                  <Field label="Initial Amount">
                    <input
                      value={draft.initial_amount}
                      onChange={(event) => setDraft((prev) => ({ ...prev, initial_amount: event.target.value }))}
                      className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                  </Field>
                  <Field label="Annual Interest Rate">
                    <input
                      value={draft.annual_interest_rate}
                      onChange={(event) => setDraft((prev) => ({ ...prev, annual_interest_rate: event.target.value }))}
                      className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                  </Field>
                  <Field label="Duration (months)">
                    <input
                      value={draft.duration_months}
                      onChange={(event) => setDraft((prev) => ({ ...prev, duration_months: event.target.value }))}
                      className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                  </Field>
                  <Field label="Monthly Contribution">
                    <input
                      value={draft.monthly_contribution}
                      onChange={(event) => setDraft((prev) => ({ ...prev, monthly_contribution: event.target.value }))}
                      className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                  </Field>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handlePreview}
                    disabled={busy}
                    className="rounded-lg bg-bg-subtle px-4 py-2 text-sm font-medium text-text-secondary transition hover:text-text disabled:opacity-50"
                  >
                    Preview
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={busy}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark disabled:opacity-50"
                  >
                    {draft.id ? "Save Changes" : "Create Scenario"}
                  </button>
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <MiniStat
                    label="Final Value"
                    value={formatCurrency(activeSummary?.final_value || 0, draft.currency || currency)}
                  />
                  <MiniStat
                    label="Contributions"
                    value={formatCurrency(activeSummary?.total_contributions || 0, draft.currency || currency)}
                  />
                  <MiniStat
                    label="Interest Earned"
                    value={formatCurrency(activeSummary?.total_interest || 0, draft.currency || currency)}
                    accent="positive"
                  />
                </div>

                {chartData.length === 0 ? (
                  <EmptyState title="No projection selected" body="Choose a scenario or create a new one to visualize the forecast." />
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="projectionArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94A3B8" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => formatCompactCurrency(Number(value), draft.currency || currency)}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value, draft.currency || currency)} />
                        <Area type="monotone" dataKey="value" stroke="#2563EB" fill="url(#projectionArea)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function toScenarioPayload(draft: ScenarioDraft) {
  return {
    workspace_id: "default",
    entity_id: draft.entity_id,
    name: draft.name,
    type: "SAVINGS",
    currency: draft.currency,
    initial_amount: Number(draft.initial_amount || 0),
    annual_interest_rate: Number(draft.annual_interest_rate || 0),
    duration_months: Number(draft.duration_months || 0),
    monthly_contribution: Number(draft.monthly_contribution || 0),
    compounding_frequency: "monthly",
    cashflow_assumptions: {
      baseline_month_window: 6,
      added_recurring_incomes: [],
      added_recurring_expenses: [],
      expense_category_percent_changes: [],
    },
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

function MiniStat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "negative" | "positive";
}) {
  const color =
    accent === "negative" ? "text-negative-dark" : accent === "positive" ? "text-positive" : "text-text";

  return (
    <div className="rounded-lg bg-bg-subtle p-4">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}
