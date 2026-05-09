import { useMemo, useState } from "react";
import Badge from "@/components/base/Badge";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { formatCurrency, formatLongDate, formatShortDate, monthKey, sortByDateDesc } from "@/lib/finance";
import { monthLabel } from "@/utils/format";

type FilterType = "all" | "income" | "expense" | "transfer";
type ExpenseExpectation = "expected" | "unexpected";
type TransactionListRow = {
  id: string | number;
  source_type: string;
  type: FilterType;
  amount: number;
  from_account_name?: string | null;
  to_account_name?: string | null;
  from_entity_name?: string | null;
  to_entity_name?: string | null;
  currency_code?: string | null;
  category?: string | null;
  note?: string | null;
  created_at: string;
};

export default function Transactions() {
  const { balance, currentMonth, expenseList, loading, scopedTransactions } = useFinanceData();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<FilterType>("expense");
  const [expandedId, setExpandedId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const currency = balance?.currency_code || "PHP";
  const sortedTransactions = useMemo(
    () => sortByDateDesc(scopedTransactions, "created_at"),
    [scopedTransactions]
  );
  const expenseRows = useMemo<TransactionListRow[]>(
    () =>
      sortByDateDesc(
        expenseList.map((expense) => ({
          id: `expense:${expense.id}`,
          source_type: "expense",
          type: "expense" as const,
          amount: Number(expense.amount || 0),
          from_account_name: expense.from_account_name || null,
          to_account_name: null,
          from_entity_name: expense.entity_name || null,
          to_entity_name: null,
          currency_code: balance?.currency_code || "PHP",
          category: expense.expense_category_name || expense.name || "Uncategorized",
          note: expense.notes
            ? `${expense.name || expense.expense_category_name || "Expense"} - ${expense.notes}`
            : expense.name || expense.expense_category_name || "Expense",
          created_at: expense.spent_at,
        })),
        "created_at"
      ),
    [balance?.currency_code, expenseList]
  );
  const sourceRows = activeType === "expense" ? expenseRows : sortedTransactions;
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set([
          currentMonth,
          ...sortedTransactions.map((transaction) => monthKey(transaction.created_at)),
          ...expenseRows.map((transaction) => monthKey(transaction.created_at)),
        ])
      )
        .filter(Boolean)
        .sort((left, right) => right.localeCompare(left)),
    [currentMonth, expenseRows, sortedTransactions]
  );
  const categories = useMemo(() => {
    return Array.from(
      new Set(
        sourceRows.map((transaction) => String(transaction.category || "Uncategorized"))
      )
    ).sort();
  }, [sourceRows]);
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = useMemo(() => {
    return sourceRows.filter((transaction) => {
      const text = `${transaction.note || ""} ${transaction.category || ""} ${transaction.from_account_name || ""} ${transaction.to_account_name || ""}`
        .toLowerCase()
        .trim();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      const matchesType =
        activeType === "expense" ? true : activeType === "all" || transaction.type === activeType;
      const matchesCategory =
        activeCategory === "All" || String(transaction.category || "Uncategorized") === activeCategory;
      const matchesMonth = !selectedMonth || monthKey(transaction.created_at) === selectedMonth;
      return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });
  }, [activeCategory, activeType, search, selectedMonth, sourceRows]);
  const expenseSummary = useMemo(() => {
    const normalizeExpectation = (value: unknown): ExpenseExpectation =>
      value === "expected" ? "expected" : "unexpected";

    return expenseList.reduce(
      (summary, expense) => {
        const matchesMonth = !selectedMonth || monthKey(expense.spent_at) === selectedMonth;
        if (!matchesMonth) {
          return summary;
        }
        const amount = Number(expense.amount || 0);
        const expectation = normalizeExpectation(expense.expense_expectation);
        summary.total += amount;
        summary[expectation] += amount;
        summary.count += 1;
        return summary;
      },
      { total: 0, expected: 0, unexpected: 0, count: 0 }
    );
  }, [expenseList, selectedMonth]);
  const summaryLabel = selectedMonth ? monthLabel(selectedMonth) : "All months";
  const recordsLabel =
    activeType === "all"
      ? "records"
      : activeType === "expense"
        ? "expense records"
        : activeType === "income"
          ? "income records"
          : "transfer records";

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading transactions..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text">Transactions</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {filtered.length} {recordsLabel} in {summaryLabel}
          </p>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <MetricCard
            label={`Total Expenses · ${summaryLabel}`}
            value={formatCurrency(expenseSummary.total, currency)}
            accent="negative"
            hint={`${expenseSummary.count} expense record${expenseSummary.count === 1 ? "" : "s"}`}
          />
          <MetricCard
            label="Expected"
            value={formatCurrency(expenseSummary.expected, currency)}
            accent="positive"
            hint={selectedMonth ? `${summaryLabel} planned spend` : "Planned spend across all months"}
          />
          <MetricCard
            label="Unexpected"
            value={formatCurrency(expenseSummary.unexpected, currency)}
            accent="warning"
            hint={selectedMonth ? `${summaryLabel} unplanned spend` : "Unplanned spend across all months"}
          />
        </div>

        <Card className="mb-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.3fr,0.7fr,0.8fr]">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by note, category, or account"
                className="w-full rounded-lg border border-transparent bg-bg-subtle py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-accent"
              />
            </div>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none"
            >
              <option value="">All months</option>
              {monthOptions.map((value) => (
                <option key={value} value={value}>
                  {monthLabel(value)}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 rounded-lg bg-bg-subtle p-1">
              {(["all", "expense", "income", "transfer"] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    activeType === type ? "bg-white text-text shadow-sm" : "text-text-secondary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory("All")}
              className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
                activeCategory === "All"
                  ? "bg-accent text-white"
                  : "bg-bg-subtle text-text-secondary"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  activeCategory === category
                    ? "bg-accent text-white"
                    : "bg-bg-subtle text-text-secondary"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState title="No matching transactions" body="Adjust the filters or search to see more records." />
        ) : (
          <div className="space-y-2">
            {filtered.map((transaction) => {
              const rowId = `${transaction.source_type}:${transaction.id}`;
              const expanded = expandedId === rowId;
              return (
                <Card key={rowId} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? "" : rowId)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-bg-subtle"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-subtle">
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
                          size="sm"
                        >
                          {transaction.type}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-2xs text-text-secondary">
                        <span>{formatShortDate(transaction.created_at)}</span>
                        <span>•</span>
                        <span>{transaction.category || "Uncategorized"}</span>
                        <span>•</span>
                        <span>{transaction.from_account_name || transaction.to_account_name || "Manual"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
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
                      </span>
                      <i
                        className={`ri-arrow-down-s-line text-text-muted transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {expanded ? (
                    <div className="border-t border-bg-subtle px-4 pb-4 pt-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <InfoBlock label="Recorded">
                          {formatLongDate(transaction.created_at)}
                        </InfoBlock>
                        <InfoBlock label="Source Type">{transaction.source_type}</InfoBlock>
                        <InfoBlock label="From">
                          {transaction.from_account_name || transaction.from_entity_name || "N/A"}
                        </InfoBlock>
                        <InfoBlock label="To">
                          {transaction.to_account_name || transaction.to_entity_name || "N/A"}
                        </InfoBlock>
                        <InfoBlock label="Category">{transaction.category || "Uncategorized"}</InfoBlock>
                        <InfoBlock label="Currency">{transaction.currency_code || currency}</InfoBlock>
                      </div>
                      {transaction.note ? (
                        <div className="mt-3">
                          <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">
                            Note
                          </p>
                          <p className="mt-1 text-sm text-text">{transaction.note}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text">{children}</p>
    </div>
  );
}

function MetricCard({
  accent = "default",
  hint,
  label,
  value,
}: {
  accent?: "default" | "negative" | "positive" | "warning";
  hint?: string;
  label: string;
  value: string;
}) {
  const accentClasses = {
    default: "bg-white text-text",
    negative: "bg-negative-light text-negative-dark",
    positive: "bg-positive-light text-positive-dark",
    warning: "bg-warning-light text-warning-dark",
  };

  const valueClasses = {
    default: "text-text",
    negative: "text-negative-dark",
    positive: "text-positive",
    warning: "text-warning-dark",
  };

  return (
    <Card className={`p-4 ${accentClasses[accent]}`}>
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClasses[accent]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
    </Card>
  );
}
