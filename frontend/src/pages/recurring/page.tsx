import { useMemo, useState } from "react";
import Badge from "@/components/base/Badge";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { formatCurrency, formatShortDate } from "@/lib/finance";
import type { CategoryRecord } from "@/types/finance";
import { buildCategoryBadgeStyle, resolveCategoryColor } from "@/utils/categoryColors";
import {
  getNextRecurringOccurrenceOnOrAfter,
  recurringMonthlyAmount,
  recurringFrequencyLabel,
} from "@/utils/recurring";

type RecurringTab = "due_now" | "income" | "expense" | "transfer";

export default function Recurring() {
  const {
    balance,
    categories,
    confirmRecurring,
    deleteRecurring,
    incomeCategories,
    loading,
    pendingRecurringItems,
    recurringItems,
    skipRecurring,
  } = useFinanceData();
  const [selectedTab, setSelectedTab] = useState<RecurringTab>("due_now");
  const currency = balance?.currency_code || "PHP";

  const decoratedItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return recurringItems.map((item) => ({
      ...item,
      dueDate: getNextRecurringOccurrenceOnOrAfter(item, today) || item.next_due_date,
      monthlyAmount: recurringMonthlyAmount(item),
    }));
  }, [recurringItems]);

  const filtered = useMemo(() => {
    if (selectedTab === "due_now") {
      const upcomingIds = new Set(pendingRecurringItems.map((item) => Number(item.id)));
      return decoratedItems.filter((item) => upcomingIds.has(Number(item.id)));
    }
    return decoratedItems.filter((item) => item.type === selectedTab);
  }, [decoratedItems, pendingRecurringItems, selectedTab]);

  const totalMonthly = useMemo(
    () => decoratedItems.reduce((sum, item) => sum + item.monthlyAmount, 0),
    [decoratedItems]
  );
  const monthlyExpense = useMemo(
    () =>
      decoratedItems
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.monthlyAmount, 0),
    [decoratedItems]
  );
  const monthlyIncome = useMemo(
    () =>
      decoratedItems
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.monthlyAmount, 0),
    [decoratedItems]
  );
  const monthlyTransfer = useMemo(
    () =>
      decoratedItems
        .filter((item) => item.type === "transfer")
        .reduce((sum, item) => sum + item.monthlyAmount, 0),
    [decoratedItems]
  );
  const monthlySurplus = useMemo(
    () => monthlyIncome - monthlyExpense - monthlyTransfer,
    [monthlyExpense, monthlyIncome, monthlyTransfer]
  );
  const tabCounts = useMemo(() => {
    const dueNowIds = new Set(pendingRecurringItems.map((item) => Number(item.id)));

    return {
      due_now: decoratedItems.filter((item) => dueNowIds.has(Number(item.id))).length,
      income: decoratedItems.filter((item) => item.type === "income").length,
      expense: decoratedItems.filter((item) => item.type === "expense").length,
      transfer: decoratedItems.filter((item) => item.type === "transfer").length,
    } satisfies Record<RecurringTab, number>;
  }, [decoratedItems, pendingRecurringItems]);
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
          <LoadingState label="Loading recurring items..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text">Recurring Manager</h1>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Monthly Income" value={formatCurrency(monthlyIncome, currency)} tone="positive" />
          <MetricCard label="Monthly Expenses" value={formatCurrency(monthlyExpense, currency)} tone="negative" />
          <MetricCard label="Monthly Transfers" value={formatCurrency(monthlyTransfer, currency)} tone="accent" />
          <MetricCard
            label="Monthly Surplus"
            value={formatCurrency(monthlySurplus, currency)}
            tone={monthlySurplus >= 0 ? "positive" : "negative"}
          />
        </div>

        <div className="mb-4 flex items-center gap-1 rounded-lg bg-bg-subtle p-1">
          {(
            [
              { key: "due_now", label: "Due Now" },
              { key: "income", label: "Income" },
              { key: "expense", label: "Expense" },
              { key: "transfer", label: "Transfer" },
            ] as Array<{ key: RecurringTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                selectedTab === tab.key
                  ? "bg-white text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span>{tab.label}</span>
                <span
                  className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-2xs font-semibold ${
                    selectedTab === tab.key
                      ? "bg-bg-subtle text-text"
                      : "bg-white/80 text-text-secondary"
                  }`}
                >
                  {tabCounts[tab.key]}
                </span>
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={selectedTab === "due_now" ? "No due items yet" : "No recurring items"}
            body={
              selectedTab === "due_now"
                ? "Nothing is currently due."
                : "Recurring records will appear here once they are configured."
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
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
              <Card key={item.id} className="overflow-hidden">
                <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {categoryMeta && categoryStyle ? (
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
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
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light">
                        <i
                          className={`text-lg ${
                            item.type === "income"
                              ? "ri-arrow-down-line text-positive"
                              : item.type === "transfer"
                                ? "ri-repeat-line text-accent"
                                : "ri-arrow-up-line text-negative"
                          }`}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-text">
                          {item.category || item.expense_category_name || item.income_category_name || "Recurring item"}
                        </p>
                        <Badge
                          variant={
                            item.type === "income"
                              ? "positive"
                              : item.type === "transfer"
                                ? "accent"
                                : "warning"
                          }
                        >
                          {item.type}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-2xs text-text-secondary">
                        {recurringFrequencyLabel(item.frequency)} • Due {formatShortDate(item.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 text-right sm:grid-cols-2 lg:min-w-[280px] lg:grid-cols-[1fr,auto] lg:items-center">
                    <div>
                      <p className="text-sm font-bold text-text">
                        {formatCurrency(item.amount, currency)}
                      </p>
                      <p className="text-2xs text-text-secondary">
                        {formatCurrency(item.monthlyAmount, currency)} monthly equivalent
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => confirmRecurring(item.id)}
                        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-dark"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => skipRecurring(item.id)}
                        className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:text-text"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => deleteRecurring(item.id)}
                        className="rounded-md bg-negative-light px-3 py-1.5 text-sm font-medium text-negative-dark transition hover:bg-negative-light/70"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )})}
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "accent" | "default" | "negative" | "positive";
  value: string;
}) {
  const valueClass = {
    accent: "text-accent",
    default: "text-text",
    negative: "text-negative",
    positive: "text-positive",
  }[tone];

  return (
    <Card className="p-4 text-center">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </Card>
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
