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
import type {
  BalanceRecord,
  BudgetItemRecord,
  BudgetRecord,
  ProjectionScenarioDetail,
} from "@/types/finance";

type ForecastTab = "budget" | "projection";
type BudgetCadence = "one_time" | "monthly";
type BudgetDrawerMode = "create" | "edit";
type BudgetItemDraft = {
  id: string;
  name: string;
  cadence: BudgetCadence;
  amount: string;
  notes: string;
};
type BudgetDraft = {
  id?: number;
  entity_id: string;
  name: string;
  category: string;
  start_date: string;
  target_date: string;
  notes: string;
  is_active: boolean;
  budget_items: BudgetItemDraft[];
};
type BudgetScheduleEntry = {
  date: string;
  amount: number;
};
type BudgetProjectionSnapshot = {
  label: string;
  months: number;
  totalCost: number;
};

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

function createEmptyBudgetDraft(entityId: string): BudgetDraft {
  return {
    entity_id: entityId,
    name: "",
    category: "",
    start_date: new Date().toISOString().slice(0, 10),
    target_date: "",
    notes: "",
    is_active: true,
    budget_items: [createEmptyBudgetItem()],
  };
}

function createBudgetItemId() {
  return `budget-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyBudgetItem(): BudgetItemDraft {
  return {
    id: createBudgetItemId(),
    name: "",
    cadence: "one_time",
    amount: "",
    notes: "",
  };
}

function createBudgetDraftFromRecord(budget: BudgetRecord): BudgetDraft {
  const existingBudgetItems = Array.isArray(budget.budget_items)
    ? budget.budget_items
    : [];
  const items =
    existingBudgetItems.length > 0
      ? existingBudgetItems.map((item) => ({
          id: item.id,
          name: item.name,
          cadence: item.cadence,
          amount: String(item.amount ?? ""),
          notes: item.notes || "",
        }))
      : [
          {
            id: createBudgetItemId(),
            name: budget.name,
            cadence: "one_time" as const,
            amount: String(budget.target_amount ?? ""),
            notes: budget.notes || "",
          },
        ];

  return {
    id: budget.id,
    entity_id: budget.entity_id,
    name: budget.name,
    category: budget.category || "",
    start_date: budget.start_date || new Date().toISOString().slice(0, 10),
    target_date:
      budget.target_date || budget.final_payment_date || budget.start_date || "",
    notes: budget.notes || "",
    is_active: budget.is_active,
    budget_items: items,
  };
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseIsoDateParts(value: string) {
  if (!isIsoDate(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonthsIso(value: string, monthCount: number) {
  const parsed = parseIsoDateParts(value);
  if (!parsed) {
    return value;
  }
  const totalMonths = parsed.year * 12 + (parsed.month - 1) + monthCount;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  const nextDay = Math.min(parsed.day, daysInMonth(nextYear, nextMonth));
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
}

function addScheduleEntry(scheduleMap: Map<string, number>, date: string, amount: number) {
  scheduleMap.set(date, Number((Number(scheduleMap.get(date) || 0) + amount).toFixed(2)));
}

function normalizeBudgetItemsFromDraft(items: BudgetItemDraft[]) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id,
    name: item.name.trim(),
    cadence: item.cadence,
    amount: Number(item.amount),
    notes: item.notes.trim() || null,
  }));
}

function countMonthlyOccurrences(startDate: string, targetDate: string) {
  if (!isIsoDate(startDate) || !isIsoDate(targetDate) || targetDate < startDate) {
    return 0;
  }
  let count = 0;
  let currentDate = startDate;
  while (currentDate <= targetDate) {
    count += 1;
    const nextDate = addMonthsIso(currentDate, 1);
    if (nextDate <= currentDate) {
      break;
    }
    currentDate = nextDate;
  }
  return count;
}

function buildBudgetSchedulePreview(
  items: Array<{ cadence: BudgetCadence; amount: number }>,
  startDate: string,
  targetDate: string
): BudgetScheduleEntry[] {
  if (!isIsoDate(startDate) || !isIsoDate(targetDate) || targetDate < startDate) {
    return [];
  }

  const scheduleMap = new Map<string, number>();

  items.forEach((item) => {
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      return;
    }
    if (item.cadence === "monthly") {
      let currentDate = startDate;
      while (currentDate <= targetDate) {
        addScheduleEntry(scheduleMap, currentDate, item.amount);
        const nextDate = addMonthsIso(currentDate, 1);
        if (nextDate <= currentDate) {
          break;
        }
        currentDate = nextDate;
      }
      return;
    }

    addScheduleEntry(scheduleMap, targetDate, item.amount);
  });

  return Array.from(scheduleMap.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, amount]) => ({
      date,
      amount: Number(amount.toFixed(2)),
    }));
}

function buildLegacyBudgetScheduleFromRecord(budget: BudgetRecord): BudgetScheduleEntry[] {
  if (!isIsoDate(budget.start_date)) {
    return [];
  }

  if (String(budget.payment_plan || "").trim().toLowerCase() === "one_time") {
    return [
      {
        date: budget.start_date,
        amount: Number(budget.target_amount || 0),
      },
    ];
  }

  const totalAmount = Number(budget.target_amount || 0);
  const paymentAmount = Number(budget.payment_amount || 0);
  const paymentCount =
    Number.isInteger(Number(budget.payment_count)) && Number(budget.payment_count) > 0
      ? Number(budget.payment_count)
      : Math.max(1, Math.ceil(totalAmount / Math.max(paymentAmount, 1)));

  if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return [];
  }

  const entries: BudgetScheduleEntry[] = [];
  let remainingAmount = totalAmount;
  let currentDate = budget.start_date;

  for (let index = 0; index < paymentCount && remainingAmount > 0.0001; index += 1) {
    const nextAmount = Number(Math.min(paymentAmount, remainingAmount).toFixed(2));
    entries.push({ date: currentDate, amount: nextAmount });
    remainingAmount = Number((remainingAmount - nextAmount).toFixed(2));
    if (remainingAmount > 0.0001) {
      if (budget.payment_frequency === "weekly") {
        const parsed = parseIsoDateParts(currentDate);
        if (!parsed) {
          break;
        }
        const current = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
        current.setUTCDate(current.getUTCDate() + 7);
        currentDate = current.toISOString().slice(0, 10);
      } else if (budget.payment_frequency === "yearly") {
        currentDate = addMonthsIso(currentDate, 12);
      } else {
        currentDate = addMonthsIso(currentDate, 1);
      }
    }
  }

  return entries;
}

function buildBudgetScheduleFromRecord(budget: BudgetRecord): BudgetScheduleEntry[] {
  const budgetItems = Array.isArray(budget.budget_items) ? budget.budget_items : [];
  if (budgetItems.length > 0) {
    return buildBudgetSchedulePreview(
      budgetItems.map((item) => ({
        cadence: item.cadence,
        amount: Number(item.amount || 0),
      })),
      budget.start_date,
      budget.target_date || budget.final_payment_date || budget.start_date
    );
  }

  return buildLegacyBudgetScheduleFromRecord(budget);
}

function buildBudgetProjectionSnapshots(
  monthlyTotal: number
): BudgetProjectionSnapshot[] {
  return [
    { label: "6 Months", months: 6 },
    { label: "1 Year", months: 12 },
    { label: "2 Years", months: 24 },
  ].map((horizon) => {
    return {
      ...horizon,
      totalCost: Number((Number(monthlyTotal || 0) * horizon.months).toFixed(2)),
    };
  });
}

function buildBudgetDraftSummary(draft: BudgetDraft) {
  const normalizedItems = normalizeBudgetItemsFromDraft(draft.budget_items).filter(
    (item) => item.name && Number.isFinite(item.amount) && item.amount > 0
  );
  const oneTimeTotal = normalizedItems
    .filter((item) => item.cadence === "one_time")
    .reduce((sum, item) => sum + item.amount, 0);
  const monthlyTotal = normalizedItems
    .filter((item) => item.cadence === "monthly")
    .reduce((sum, item) => sum + item.amount, 0);
  const schedule = buildBudgetSchedulePreview(
    normalizedItems.map((item) => ({
      cadence: item.cadence as BudgetCadence,
      amount: item.amount,
    })),
    draft.start_date,
    draft.target_date
  );
  const targetAmount = schedule.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    oneTimeTotal: Number(oneTimeTotal.toFixed(2)),
    monthlyTotal: Number(monthlyTotal.toFixed(2)),
    targetAmount: Number(targetAmount.toFixed(2)),
    itemCount: normalizedItems.length,
    monthlyOccurrences: countMonthlyOccurrences(draft.start_date, draft.target_date),
    schedule,
  };
}

function buildBudgetPayload(draft: BudgetDraft) {
  const entityId = draft.entity_id.trim();
  const name = draft.name.trim();
  const targetDate = draft.target_date.trim();
  const startDate = draft.start_date.trim();
  const normalizedItems = normalizeBudgetItemsFromDraft(draft.budget_items).filter(
    (item) => item.name || Number.isFinite(item.amount) || item.notes
  );

  if (!entityId) {
    throw new Error("Select an entity for this plan.");
  }
  if (!name) {
    throw new Error("Plan name is required.");
  }
  if (!isIsoDate(startDate)) {
    throw new Error("Start date is required.");
  }
  if (!isIsoDate(targetDate)) {
    throw new Error("Target date is required.");
  }
  if (targetDate < startDate) {
    throw new Error("Target date cannot be before the start date.");
  }
  if (!normalizedItems.length) {
    throw new Error("Add at least one planned expense.");
  }

  normalizedItems.forEach((item) => {
    if (!item.name) {
      throw new Error("Each planned expense needs a name.");
    }
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      throw new Error("Each planned expense needs a valid amount.");
    }
  });

  return {
    entity_id: entityId,
    name,
    category: draft.category.trim() || null,
    start_date: startDate,
    target_date: targetDate,
    notes: draft.notes.trim() || null,
    is_active: draft.is_active,
    target_amount: 0,
    payment_plan: "one_time",
    payment_frequency: "once",
    payment_amount: 0,
    payment_count: 1,
    budget_items: normalizedItems,
  };
}

function buildBudgetPortfolioSummary(
  budgets: BudgetRecord[],
  balance: BalanceRecord | null
) {
  const activeBudgets = budgets.filter((budget) => budget.is_active);
  const oneTimeTotal = activeBudgets.reduce(
    (sum, budget) => sum + Number(budget.one_time_total || 0),
    0
  );
  const monthlyTotal = activeBudgets.reduce(
    (sum, budget) => sum + Number(budget.monthly_total || 0),
    0
  );
  const targetTotal = activeBudgets.reduce(
    (sum, budget) => sum + Number(budget.target_amount || 0),
    0
  );
  const safeToSpend = Number(balance?.safe_to_spend || 0);
  const currentBalance = Number(balance?.balance || 0);

  return {
    activeCount: activeBudgets.length,
    oneTimeTotal: Number(oneTimeTotal.toFixed(2)),
    monthlyTotal: Number(monthlyTotal.toFixed(2)),
    targetTotal: Number(targetTotal.toFixed(2)),
    safeToSpendAfterMonthly: Number((safeToSpend - monthlyTotal).toFixed(2)),
    balanceAfterOneTime: Number((currentBalance - oneTimeTotal).toFixed(2)),
  };
}

function BudgetProjectionCards({
  currency,
  monthlyTotal,
}: {
  currency: string;
  monthlyTotal: number;
}) {
  const snapshots = useMemo(
    () => buildBudgetProjectionSnapshots(monthlyTotal),
    [monthlyTotal]
  );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {snapshots.map((snapshot) => (
        <div key={snapshot.label} className="rounded-xl bg-bg-subtle p-4">
          <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">
            {snapshot.label}
          </p>
          <p className="mt-1 text-base font-bold text-text">
            {formatCurrency(snapshot.totalCost, currency)}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {formatCurrency(monthlyTotal, currency)} × {snapshot.months}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function Forecast() {
  const {
    balance,
    budgets,
    createBudget,
    updateBudget,
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
  const [isBudgetDrawerOpen, setIsBudgetDrawerOpen] = useState(false);
  const [budgetDrawerMode, setBudgetDrawerMode] = useState<BudgetDrawerMode>("create");
  const [budgetDraft, setBudgetDraft] = useState<BudgetDraft>(() =>
    createEmptyBudgetDraft("")
  );
  const [budgetDrawerError, setBudgetDrawerError] = useState("");
  const [isBudgetSubmitting, setIsBudgetSubmitting] = useState(false);

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

  useEffect(() => {
    setBudgetDraft((prev) => {
      if (!prev.entity_id || !entities.some((entity) => entity.id === prev.entity_id)) {
        return {
          ...prev,
          entity_id: defaultEntityId,
        };
      }
      return prev;
    });
  }, [defaultEntityId, entities]);

  useEffect(() => {
    setBudgetDraft((prev) => {
      if (Array.isArray(prev.budget_items) && prev.budget_items.length > 0) {
        return prev;
      }
      return {
        ...prev,
        budget_items: [createEmptyBudgetItem()],
      };
    });
  }, []);

  const chartData = useMemo(() => {
    const result = previewResult || detail?.result;
    return result?.timeline ? buildProjectionChartData(result.timeline) : [];
  }, [detail, previewResult]);

  const activeSummary = (previewResult || detail?.result) ?? null;
  const budgetPortfolioSummary = useMemo(
    () => buildBudgetPortfolioSummary(budgets, balance),
    [balance, budgets]
  );

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

  function openBudgetDrawer() {
    setBudgetDrawerError("");
    setBudgetDrawerMode("create");
    setBudgetDraft(createEmptyBudgetDraft(defaultEntityId));
    setIsBudgetDrawerOpen(true);
  }

  function openBudgetDrawerForEdit(budget: BudgetRecord) {
    setBudgetDrawerError("");
    setBudgetDrawerMode("edit");
    setBudgetDraft(createBudgetDraftFromRecord(budget));
    setIsBudgetDrawerOpen(true);
  }

  function closeBudgetDrawer() {
    if (isBudgetSubmitting) {
      return;
    }
    setIsBudgetDrawerOpen(false);
    setBudgetDrawerError("");
  }

  async function submitBudget() {
    setIsBudgetSubmitting(true);
    setBudgetDrawerError("");
    try {
      const payload = buildBudgetPayload(budgetDraft);
      if (budgetDrawerMode === "edit" && budgetDraft.id) {
        await updateBudget(budgetDraft.id, payload);
      } else {
        await createBudget(payload);
      }
      setIsBudgetDrawerOpen(false);
      setBudgetDrawerError("");
      setBudgetDraft(createEmptyBudgetDraft(defaultEntityId));
    } catch (error: any) {
      setBudgetDrawerError(
        error?.message ||
          (budgetDrawerMode === "edit" ? "Failed to update budget" : "Failed to create budget")
      );
    } finally {
      setIsBudgetSubmitting(false);
    }
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
          {tab === "budget" ? (
            <button
              onClick={openBudgetDrawer}
              disabled={!entities.length}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add budget
            </button>
          ) : (
            <button
              onClick={handleNew}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark"
            >
              New scenario
            </button>
          )}
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
          <div className="space-y-4">
            <Card className="p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text">Budgets</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Plan future spending with itemized expenses, target dates, and capacity checks.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-bg-subtle px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {budgetPortfolioSummary.activeCount} active
                  </span>
                  <button
                    onClick={openBudgetDrawer}
                    disabled={!entities.length}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add budget
                  </button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MiniStat
                label="One-Time Total"
                value={formatCurrency(budgetPortfolioSummary.oneTimeTotal, currency)}
              />
              <MiniStat
                label="Monthly Total"
                value={formatCurrency(budgetPortfolioSummary.monthlyTotal, currency)}
              />
              <MiniStat
                label="Targeted Total"
                value={formatCurrency(budgetPortfolioSummary.targetTotal, currency)}
              />
              <MiniStat
                label="Safe To Spend After Monthly Plans"
                value={formatCurrency(budgetPortfolioSummary.safeToSpendAfterMonthly, currency)}
                accent={budgetPortfolioSummary.safeToSpendAfterMonthly < 0 ? "negative" : "positive"}
              />
            </div>

            {budgets.length === 0 ? (
              <EmptyState
                title="No budgets yet"
                body={
                  entities.length
                    ? "Add a budget to start planning future spending."
                    : "Create an entity first, then add a budget here."
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {budgets.map((budget) => (
                  <button
                    key={budget.id}
                    type="button"
                    onClick={() => openBudgetDrawerForEdit(budget)}
                    className="text-left"
                  >
                    <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-lg md:p-6">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold text-text">{budget.name}</h2>
                          <p className="text-sm text-text-secondary">
                            {budget.entity_name} • {budget.category || "Uncategorized"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              budget.is_active
                                ? "bg-accent-light text-accent-dark"
                                : "bg-bg-subtle text-text-secondary"
                            }`}
                          >
                            {budget.is_active ? "Active" : "Paused"}
                          </span>
                          <span className="text-2xs font-medium uppercase tracking-wide text-text-secondary">
                            {budget.item_count} {budget.item_count === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <MiniStat label="Plan Total" value={formatCurrency(budget.target_amount, currency)} />
                        <MiniStat label="Target Date" value={budget.target_date || "Not set"} />
                        <MiniStat label="One-Time" value={formatCurrency(budget.one_time_total, currency)} />
                        <MiniStat label="Monthly" value={formatCurrency(budget.monthly_total, currency)} />
                      </div>

                      <div className="rounded-xl bg-bg-subtle p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">
                            30-Day Capacity
                          </p>
                          <span className="text-sm font-semibold text-text">
                            {formatCurrency(Number(balance?.safe_to_spend || 0) - budget.monthly_total, currency)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">
                          Safe to spend after this plan’s monthly commitments.
                        </p>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-text-secondary">
                          Cost Projection
                        </p>
                        <BudgetProjectionCards
                          currency={currency}
                          monthlyTotal={budget.monthly_total}
                        />
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </div>
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

      <BudgetDrawer
        balance={balance}
        draft={budgetDraft}
        entities={entities}
        error={budgetDrawerError}
        isOpen={isBudgetDrawerOpen}
        isSubmitting={isBudgetSubmitting}
        mode={budgetDrawerMode}
        onClose={closeBudgetDrawer}
        onDraftChange={setBudgetDraft}
        onSubmit={submitBudget}
      />
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

function BudgetDrawer({
  balance,
  draft,
  entities,
  error,
  isOpen,
  isSubmitting,
  mode,
  onClose,
  onDraftChange,
  onSubmit,
}: {
  balance: BalanceRecord | null;
  draft: BudgetDraft;
  entities: Array<{ id: string; name: string }>;
  error: string;
  isOpen: boolean;
  isSubmitting: boolean;
  mode: BudgetDrawerMode;
  onClose: () => void;
  onDraftChange: React.Dispatch<React.SetStateAction<BudgetDraft>>;
  onSubmit: () => Promise<void>;
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const summary = useMemo(() => buildBudgetDraftSummary(draft), [draft]);
  const safeToSpend = Number(balance?.safe_to_spend || 0);
  const currentBalance = Number(balance?.balance || 0);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timeoutId = window.setTimeout(() => {
        setIsVisible(true);
      }, 16);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, 240);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  function updateBudgetItem(
    itemId: string,
    field: keyof BudgetItemDraft,
    value: string
  ) {
    onDraftChange((current) => ({
      ...current,
      budget_items: current.budget_items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addBudgetItem() {
    onDraftChange((current) => ({
      ...current,
      budget_items: [...current.budget_items, createEmptyBudgetItem()],
    }));
  }

  function removeBudgetItem(itemId: string) {
    onDraftChange((current) => {
      if (current.budget_items.length === 1) {
        return {
          ...current,
          budget_items: [createEmptyBudgetItem()],
        };
      }
      return {
        ...current,
        budget_items: current.budget_items.filter((item) => item.id !== itemId),
      };
    });
  }

  const title = mode === "edit" ? "Edit Budget Plan" : "Create Budget Plan";

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
      onClick={onClose}
    >
      <aside
        className="h-screen w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Create Budget"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Build a future plan with itemized expenses and compare it to current capacity.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Entity">
              <select
                value={draft.entity_id}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    entity_id: event.target.value,
                  }))
                }
                className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
              >
                <option value="">Select entity</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plan Name">
              <input
                value={draft.name}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
              />
            </Field>
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
              />
            </Field>
            <Field label="Start Date">
              <input
                type="date"
                value={draft.start_date}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    start_date: event.target.value,
                  }))
                }
                required
                className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
              />
            </Field>
            <Field label="Target Date">
              <input
                type="date"
                value={draft.target_date}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    target_date: event.target.value,
                  }))
                }
                required
                className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />
            <span>Include this plan in capacity calculations</span>
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="Plan Total"
              value={formatCurrency(summary.targetAmount, balance?.currency_code || "PHP")}
            />
            <MiniStat
              label="One-Time Total"
              value={formatCurrency(summary.oneTimeTotal, balance?.currency_code || "PHP")}
            />
            <MiniStat
              label="Monthly Total"
              value={formatCurrency(summary.monthlyTotal, balance?.currency_code || "PHP")}
            />
            <MiniStat label="Items" value={String(summary.itemCount)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <MiniStat
              label="Current Safe To Spend"
              value={formatCurrency(safeToSpend, balance?.currency_code || "PHP")}
            />
            <MiniStat
              label="After Monthly Plan"
              value={formatCurrency(safeToSpend - summary.monthlyTotal, balance?.currency_code || "PHP")}
              accent={safeToSpend - summary.monthlyTotal < 0 ? "negative" : "positive"}
            />
            <MiniStat
              label="Current Balance"
              value={formatCurrency(currentBalance, balance?.currency_code || "PHP")}
            />
            <MiniStat
              label="After One-Time Spend"
              value={formatCurrency(currentBalance - summary.oneTimeTotal, balance?.currency_code || "PHP")}
              accent={currentBalance - summary.oneTimeTotal < 0 ? "negative" : "default"}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-text">Planned Expenses</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Add the one-time and monthly items that make up this plan.
                </p>
              </div>
              <button
                type="button"
                onClick={addBudgetItem}
                className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:text-text"
              >
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {draft.budget_items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-bg-subtle/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text">Item {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeBudgetItem(item.id)}
                      className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-negative-dark"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Expense Name">
                      <input
                        value={item.name}
                        onChange={(event) => updateBudgetItem(item.id, "name", event.target.value)}
                        placeholder="Flights, hotel, visas, pocket money"
                        className="w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                    <Field label="Type">
                      <select
                        value={item.cadence}
                        onChange={(event) =>
                          updateBudgetItem(item.id, "cadence", event.target.value)
                        }
                        className="w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none"
                      >
                        <option value="one_time">One time</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </Field>
                    <Field label="Amount">
                      <input
                        value={item.amount}
                        onChange={(event) => updateBudgetItem(item.id, "amount", event.target.value)}
                        inputMode="decimal"
                        className="w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                    <Field label="Notes">
                      <input
                        value={item.notes}
                        onChange={(event) => updateBudgetItem(item.id, "notes", event.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-lg bg-white px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Field label="Plan Notes">
            <textarea
              value={draft.notes}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={4}
              className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
            />
          </Field>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-text">Schedule Preview</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Monthly items repeat until the target date. One-time items land on the target date.
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {summary.monthlyOccurrences} monthly periods
              </span>
            </div>

            {summary.schedule.length > 0 ? (
              <div className="space-y-2">
                {summary.schedule.slice(0, 6).map((entry) => (
                  <div
                    key={`${entry.date}-${entry.amount}`}
                    className="flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2"
                  >
                    <span className="text-sm text-text">{entry.date}</span>
                    <span className="text-sm font-medium text-text">
                      {formatCurrency(entry.amount, balance?.currency_code || "PHP")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Set a valid start date, target date, and at least one valid item to preview the schedule.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-text">Budget Projections</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Forecast cumulative cost from this plan over common horizons.
              </p>
            </div>
            <BudgetProjectionCards
              currency={balance?.currency_code || "PHP"}
              monthlyTotal={summary.monthlyTotal}
            />
          </div>

          {error ? <p className="text-sm text-negative-dark">{error}</p> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark disabled:opacity-60"
            >
              {isSubmitting
                ? mode === "edit"
                  ? "Saving..."
                  : "Creating..."
                : mode === "edit"
                  ? "Save Plan"
                  : "Create Plan"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
