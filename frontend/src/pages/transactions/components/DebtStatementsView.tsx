import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/base/Badge";
import Card from "@/components/base/Card";
import { EmptyState } from "@/components/feature/PageState";
import { formatCurrency, formatShortDate } from "@/lib/finance";
import type {
  AccountRecord,
  DebtRecord,
  LoanOriginConfigRecord,
  SettingsRecord,
} from "@/types/finance";
import {
  buildDebtCycleMonthsFromData,
  getDebtStatementMonth,
  getStatementCycleWindow,
  getStatementDay,
} from "@/utils/appState";
import { normalizeDefaultAccountPreferencesForEntity } from "@/utils/accounts";
import {
  diffDaysFromToday,
  formatRemainingDaysLabel,
  getDueDateForStatementMonth,
  statementLabel,
} from "@/utils/rightPanel";

type DebtStatementSection = {
  statementMonth: string;
  groups: DebtStatementGroup[];
};

type DebtStatementGroup = {
  amountTotal: number;
  balance: number;
  cycleLabel: string;
  debtCount: number;
  dueDateLabel: string;
  entityId: string;
  entityName: string;
  key: string;
  loanOrigin: string;
  positiveRows: DebtRecord[];
  remainingDaysLabel: string;
  rows: DebtRecord[];
  statementMonth: string;
  totalPaid: number;
  windowLabel: string;
};

type PayoffModalState = {
  amount: number;
  cycleLabel: string;
  entityId: string;
  entityName: string;
  key: string;
  loanOrigin: string;
  statementMonth: string;
};

type Props = {
  accounts: AccountRecord[];
  activeRowActionId: string;
  currency: string;
  debtList: DebtRecord[];
  loanOriginConfigs: LoanOriginConfigRecord[];
  onDeleteDebtRow: (row: DebtRecord) => void;
  onEditDebtRow: (row: DebtRecord) => void;
  search: string;
  selectedAccountId: string;
  selectedCategories: string[];
  selectedMonth: string;
  settings: SettingsRecord | null;
  onPayoffDebtByOrigin: (payload: Record<string, unknown>) => Promise<void>;
};

export default function DebtStatementsView({
  accounts,
  activeRowActionId,
  currency,
  debtList,
  loanOriginConfigs,
  onDeleteDebtRow,
  onEditDebtRow,
  search,
  selectedAccountId,
  selectedCategories,
  selectedMonth,
  settings,
  onPayoffDebtByOrigin,
}: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [payoffModal, setPayoffModal] = useState<PayoffModalState | null>(null);
  const [payoffDate, setPayoffDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payoffAccountId, setPayoffAccountId] = useState("");
  const [payoffError, setPayoffError] = useState("");
  const [isPayoffSubmitting, setIsPayoffSubmitting] = useState(false);

  const selectedCategorySet = useMemo(() => new Set(selectedCategories), [selectedCategories]);
  const normalizedSearch = search.trim().toLowerCase();
  const configMap = useMemo(
    () =>
      new Map(
        loanOriginConfigs
          .filter((item) => item.loan_origin)
          .map((item) => [item.loan_origin, item] as const)
      ),
    [loanOriginConfigs]
  );
  const debtCycleMonths = useMemo(
    () => buildDebtCycleMonthsFromData(debtList, loanOriginConfigs),
    [debtList, loanOriginConfigs]
  );

  const filteredDebts = useMemo(() => {
    return debtList.filter((item) => {
      const loanOrigin =
        typeof item.loan_origin === "string" && item.loan_origin.trim()
          ? item.loan_origin.trim()
          : "Unassigned";
      const categoryLabel = item.debt_category_name || loanOrigin || "Debt";
      const statementMonth = getDebtStatementMonth(item, configMap) || item.spent_at.slice(0, 7);
      const text = [
        item.name,
        item.notes,
        item.entity_name,
        loanOrigin,
        categoryLabel,
        item.spent_at,
        statementMonth,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || text.includes(normalizedSearch);
      const matchesCategory =
        selectedCategorySet.size === 0 || selectedCategorySet.has(categoryLabel);
      const matchesMonth = !selectedMonth || statementMonth === selectedMonth;
      const matchesAccount = selectedAccountId === "";
      return matchesSearch && matchesCategory && matchesMonth && matchesAccount;
    });
  }, [configMap, debtList, normalizedSearch, selectedAccountId, selectedCategorySet, selectedMonth]);

  const sections = useMemo<DebtStatementSection[]>(() => {
    const sectionMap = new Map<string, Map<string, DebtRecord[]>>();

    filteredDebts.forEach((item) => {
      const statementMonth = getDebtStatementMonth(item, configMap) || item.spent_at.slice(0, 7);
      const loanOrigin =
        typeof item.loan_origin === "string" && item.loan_origin.trim()
          ? item.loan_origin.trim()
          : "Unassigned";
      const groupKey = `${statementMonth}::${item.entity_id}::${loanOrigin}`;
      if (!sectionMap.has(statementMonth)) {
        sectionMap.set(statementMonth, new Map());
      }
      const groups = sectionMap.get(statementMonth);
      const current = groups?.get(groupKey) || [];
      current.push(item);
      groups?.set(groupKey, current);
    });

    return Array.from(sectionMap.entries())
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([statementMonth, groups]) => ({
        statementMonth,
        groups: Array.from(groups.entries())
          .map(([key, rows]) => {
            const first = rows[0];
            const loanOrigin =
              typeof first?.loan_origin === "string" && first.loan_origin.trim()
                ? first.loan_origin.trim()
                : "Unassigned";
            const config = configMap.get(loanOrigin);
            const statementDay = getStatementDay(config);
            const cycleWindow = statementDay ? getStatementCycleWindow(statementMonth, statementDay) : null;
            const amountTotal = rows.reduce((sum, row) => {
              const amount = Number(row.amount || 0);
              return amount > 0 ? sum + amount : sum;
            }, 0);
            const totalPaid = rows.reduce((sum, row) => {
              const amount = Number(row.amount || 0);
              return amount < 0 ? sum + Math.abs(amount) : sum;
            }, 0);
            const balance = Number((amountTotal - totalPaid).toFixed(2));
            const dueDate = getDueDateForStatementMonth(statementMonth, config?.due_day);
            const positiveRows = rows
              .filter((row) => Number(row.amount || 0) > 0)
              .sort((left, right) => String(right.spent_at).localeCompare(String(left.spent_at)));
            return {
              amountTotal: Number(amountTotal.toFixed(2)),
              balance,
              cycleLabel: statementLabel(statementMonth),
              debtCount: positiveRows.length,
              dueDateLabel: dueDate ? dueDate.toISOString().slice(0, 10) : "Not set",
              entityId: String(first?.entity_id || ""),
              entityName: first?.entity_name || "Entity",
              key,
              loanOrigin,
              positiveRows,
              remainingDaysLabel: dueDate
                ? formatRemainingDaysLabel(diffDaysFromToday(dueDate))
                : "-",
              rows: rows.sort((left, right) => {
                return String(right.spent_at).localeCompare(String(left.spent_at));
              }),
              statementMonth,
              totalPaid: Number(totalPaid.toFixed(2)),
              windowLabel: cycleWindow
                ? `${cycleWindow.startDate} to ${cycleWindow.endDate}`
                : `${statementMonth}-01 onward`,
            };
          })
          .sort((left, right) => {
            if (right.balance !== left.balance) {
              return right.balance - left.balance;
            }
            return left.loanOrigin.localeCompare(right.loanOrigin);
          }),
      }));
  }, [configMap, filteredDebts]);

  useEffect(() => {
    setExpandedGroups((current) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      sections.forEach((section) => {
        section.groups.forEach((group) => {
          if (Object.prototype.hasOwnProperty.call(current, group.key)) {
            next[group.key] = current[group.key];
            return;
          }
          next[group.key] = true;
          changed = true;
        });
      });
      if (Object.keys(current).length !== Object.keys(next).length) {
        changed = true;
      }
      return changed ? next : current;
    });
  }, [sections]);

  const totals = useMemo(() => {
    return sections.reduce(
      (summary, section) => {
        section.groups.forEach((group) => {
          summary.balance += group.balance;
          summary.paid += group.totalPaid;
          summary.records += group.debtCount;
          summary.statements += 1;
        });
        return summary;
      },
      { balance: 0, paid: 0, records: 0, statements: 0 }
    );
  }, [sections]);

  const payoffAccountOptions = useMemo(() => {
    if (!payoffModal) {
      return [];
    }
    return accounts.filter((account) => String(account.entity_id || "") === payoffModal.entityId);
  }, [accounts, payoffModal]);

  function openPayoffModal(group: DebtStatementGroup) {
    const defaultAccountId = normalizeDefaultAccountPreferencesForEntity(
      settings,
      accounts,
      group.entityId
    ).default_expense_account_id;
    const dueDate = getDueDateForStatementMonth(
      group.statementMonth,
      configMap.get(group.loanOrigin)?.due_day
    );
    setPayoffModal({
      amount: group.balance,
      cycleLabel: group.cycleLabel,
      entityId: group.entityId,
      entityName: group.entityName,
      key: group.key,
      loanOrigin: group.loanOrigin,
      statementMonth: group.statementMonth,
    });
    setPayoffDate(
      dueDate ? dueDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    );
    setPayoffAccountId(defaultAccountId || "");
    setPayoffError("");
    setIsPayoffSubmitting(false);
  }

  async function submitPayoff() {
    if (!payoffModal) {
      return;
    }
    if (!payoffDate) {
      setPayoffError("Payment date is required.");
      return;
    }
    setIsPayoffSubmitting(true);
    setPayoffError("");
    try {
      await onPayoffDebtByOrigin({
        amount: payoffModal.amount,
        entity_id: payoffModal.entityId,
        from_account_id: payoffAccountId ? Number(payoffAccountId) : null,
        loan_origin: payoffModal.loanOrigin,
        payment_date: payoffDate,
        statement_month: payoffModal.statementMonth,
      });
      setPayoffModal(null);
      setPayoffAccountId("");
      setPayoffDate(new Date().toISOString().slice(0, 10));
    } catch (nextError: any) {
      setPayoffError(nextError?.message || "Failed to record debt payment.");
    } finally {
      setIsPayoffSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Statement Balance"
          value={formatCurrency(totals.balance, currency)}
          hint={`${totals.statements} active statement group${totals.statements === 1 ? "" : "s"}`}
        />
        <SummaryCard
          label="Paid Against Statements"
          value={formatCurrency(totals.paid, currency)}
          hint="Debt payments already recorded"
        />
        <SummaryCard
          label="Charge Records"
          value={String(totals.records)}
          hint="Positive debt entries in view"
        />
        <SummaryCard
          label="Statement Months"
          value={String(selectedMonth ? 1 : debtCycleMonths.length)}
          hint={selectedMonth ? statementLabel(selectedMonth) : "All statement cycles"}
        />
      </div>

      {sections.length === 0 ? (
        <EmptyState
          title="No debt statements found"
          body="Adjust the statement month, category, or search filters to see more debt records."
        />
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.statementMonth}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2 className="text-sm font-semibold text-text">
                  {statementLabel(section.statementMonth)}
                </h2>
                <span className="text-2xs text-text-secondary">
                  {section.groups.length} originator
                  {section.groups.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-3">
                {section.groups.map((group) => {
                  const isExpanded = expandedGroups[group.key] !== false;
                  return (
                    <Card key={group.key} className="overflow-hidden">
                      <div className="border-b border-bg-subtle px-4 py-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedGroups((current) => ({
                                ...current,
                                [group.key]: current[group.key] === false,
                              }))
                            }
                            className="flex flex-1 items-start gap-3 text-left"
                          >
                            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
                              <i
                                className={`ri-arrow-down-s-line text-lg transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-text">
                                  {group.loanOrigin}
                                </h3>
                                {group.entityName ? (
                                  <Badge variant="default" size="sm">
                                    {group.entityName}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-text-secondary">
                                {group.windowLabel}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs text-text-secondary">
                                <span>Due {group.dueDateLabel}</span>
                                <span>•</span>
                                <span>{group.remainingDaysLabel}</span>
                                <span>•</span>
                                <span>{group.debtCount} charge record{group.debtCount === 1 ? "" : "s"}</span>
                              </div>
                            </div>
                          </button>

                          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                            <MetricPill
                              label="Charges"
                              value={formatCurrency(group.amountTotal, currency)}
                            />
                            <MetricPill
                              label="Paid"
                              value={formatCurrency(group.totalPaid, currency)}
                            />
                            <MetricPill
                              label="Balance"
                              value={formatCurrency(group.balance, currency)}
                              accent={group.balance > 0 ? "negative" : "positive"}
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPayoffModal(group)}
                            disabled={group.balance <= 0 || group.loanOrigin === "Unassigned"}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:text-text-muted"
                          >
                            Pay Full Statement
                          </button>
                          {group.loanOrigin === "Unassigned" ? (
                            <p className="text-2xs text-text-secondary">
                              Set a loan origin before using statement payoff.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="divide-y divide-bg-subtle">
                          {group.rows.map((row) => {
                            const amount = Number(row.amount || 0);
                            const isPayment = amount < 0;
                            const rowActionKey = `debt:debt:${row.id}`;
                            const isBusy = activeRowActionId.startsWith(`${rowActionKey}:`);
                            return (
                              <div
                                key={row.id}
                                className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-medium text-text">
                                      {row.name}
                                    </p>
                                    <Badge
                                      variant={isPayment ? "positive" : "warning"}
                                      size="sm"
                                    >
                                      {isPayment ? "payment" : "charge"}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs text-text-secondary">
                                    <span>{formatShortDate(row.spent_at)}</span>
                                    {row.debt_category_name ? (
                                      <>
                                        <span>•</span>
                                        <span>{row.debt_category_name}</span>
                                      </>
                                    ) : null}
                                    {row.notes ? (
                                      <>
                                        <span>•</span>
                                        <span className="truncate">{row.notes}</span>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 md:justify-end">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onEditDebtRow(row)}
                                      disabled={isBusy}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-subtle text-text-secondary transition hover:bg-bg disabled:cursor-not-allowed disabled:opacity-60"
                                      aria-label="Edit debt record"
                                    >
                                      <i className="ri-pencil-line text-base" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteDebtRow(row)}
                                      disabled={isBusy}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-negative-light text-negative-dark transition hover:bg-negative/10 disabled:cursor-not-allowed disabled:opacity-60"
                                      aria-label="Delete debt record"
                                    >
                                      <i className="ri-delete-bin-line text-base" />
                                    </button>
                                  </div>
                                  <p
                                    className={`text-sm font-semibold ${
                                      isPayment ? "text-positive" : "text-negative"
                                    }`}
                                  >
                                    {isPayment ? "+" : "-"}
                                    {formatCurrency(Math.abs(amount), currency)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {payoffModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-text">Pay Full Statement</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {payoffModal.loanOrigin} • {payoffModal.cycleLabel}
                </p>
                <p className="mt-1 text-2xs text-text-secondary">
                  {payoffModal.entityName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isPayoffSubmitting) {
                    setPayoffModal(null);
                    setPayoffError("");
                  }
                }}
                className="rounded-full bg-bg-subtle p-2 text-text-secondary"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SummaryCard
                label="Statement Balance"
                value={formatCurrency(payoffModal.amount, currency)}
                hint="This amount will be recorded as an expense"
              />
              <SummaryCard
                label="Statement Month"
                value={payoffModal.statementMonth}
                hint={payoffModal.cycleLabel}
              />
            </div>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Payment Date
                </span>
                <input
                  type="date"
                  value={payoffDate}
                  onChange={(event) => setPayoffDate(event.target.value)}
                  className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Expense Account
                </span>
                <select
                  value={payoffAccountId}
                  onChange={(event) => setPayoffAccountId(event.target.value)}
                  className="w-full rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">Use default expense account</option>
                  {payoffAccountOptions.map((account) => (
                    <option key={account.id} value={String(account.id)}>
                      {account.name} • {account.currency_code}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {payoffError ? <p className="mt-4 text-sm text-negative">{payoffError}</p> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isPayoffSubmitting) {
                    setPayoffModal(null);
                    setPayoffError("");
                  }
                }}
                className="rounded-lg bg-bg-subtle px-4 py-2.5 text-sm font-medium text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPayoff}
                disabled={isPayoffSubmitting}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {isPayoffSubmitting ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryCard({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
      <p className="mt-1 text-2xs text-text-secondary">{hint}</p>
    </Card>
  );
}

function MetricPill({
  accent = "default",
  label,
  value,
}: {
  accent?: "default" | "negative" | "positive";
  label: string;
  value: string;
}) {
  const valueClass =
    accent === "negative"
      ? "text-negative"
      : accent === "positive"
        ? "text-positive"
        : "text-text";
  return (
    <div className="rounded-2xl bg-bg-subtle px-3 py-3">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
