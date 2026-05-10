import { useMemo, useState } from "react";
import Card from "@/components/base/Card";
import { EmptyState } from "@/components/feature/PageState";
import type { LoanOriginConfigRecord } from "@/types/finance";

type LoanOriginDraft = {
  loan_origin: string;
  statement_day: string;
  due_day: string;
};

function createEmptyLoanOriginDraft(): LoanOriginDraft {
  return {
    loan_origin: "",
    statement_day: "",
    due_day: "",
  };
}

function createLoanOriginDraft(config: LoanOriginConfigRecord): LoanOriginDraft {
  return {
    loan_origin: config.loan_origin || "",
    statement_day:
      config.statement_day === null || config.statement_day === undefined
        ? ""
        : String(config.statement_day),
    due_day:
      config.due_day === null || config.due_day === undefined ? "" : String(config.due_day),
  };
}

type Props = {
  loanOriginConfigs: LoanOriginConfigRecord[];
  onDeleteConfig: (loanOrigin: string) => Promise<void>;
  onSaveConfig: (payload: {
    loan_origin: string;
    previous_loan_origin?: string;
    statement_day: number;
    due_day: number;
  }) => Promise<void>;
};

export default function DebtSettingsSection({
  loanOriginConfigs,
  onDeleteConfig,
  onSaveConfig,
}: Props) {
  const [newDraft, setNewDraft] = useState<LoanOriginDraft>(() => createEmptyLoanOriginDraft());
  const [rowDrafts, setRowDrafts] = useState<Record<string, LoanOriginDraft>>({});
  const [error, setError] = useState("");
  const [submittingKey, setSubmittingKey] = useState("");

  const sortedConfigs = useMemo(
    () => [...loanOriginConfigs].sort((left, right) => left.loan_origin.localeCompare(right.loan_origin)),
    [loanOriginConfigs]
  );

  async function submitDraft(draft: LoanOriginDraft, previousLoanOrigin?: string) {
    const loanOrigin = draft.loan_origin.trim();
    const statementDay = Number(draft.statement_day);
    const dueDay = Number(draft.due_day);
    if (!loanOrigin) {
      throw new Error("Loan origin is required.");
    }
    if (!Number.isInteger(statementDay) || statementDay < 1 || statementDay > 31) {
      throw new Error("Statement day must be between 1 and 31.");
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      throw new Error("Due day must be between 1 and 31.");
    }
    await onSaveConfig({
      loan_origin: loanOrigin,
      previous_loan_origin: previousLoanOrigin,
      statement_day: statementDay,
      due_day: dueDay,
    });
  }

  async function handleAdd() {
    setSubmittingKey("new");
    setError("");
    try {
      await submitDraft(newDraft);
      setNewDraft(createEmptyLoanOriginDraft());
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to save debt statement settings.");
    } finally {
      setSubmittingKey("");
    }
  }

  async function handleSaveExisting(config: LoanOriginConfigRecord) {
    const draft = rowDrafts[config.loan_origin] ?? createLoanOriginDraft(config);
    setSubmittingKey(config.loan_origin);
    setError("");
    try {
      await submitDraft(draft, config.loan_origin);
      setRowDrafts((current) => {
        const next = { ...current };
        delete next[config.loan_origin];
        return next;
      });
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to save debt statement settings.");
    } finally {
      setSubmittingKey("");
    }
  }

  async function handleDelete(loanOrigin: string) {
    setSubmittingKey(`delete:${loanOrigin}`);
    setError("");
    try {
      await onDeleteConfig(loanOrigin);
      setRowDrafts((current) => {
        const next = { ...current };
        delete next[loanOrigin];
        return next;
      });
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to delete debt statement settings.");
    } finally {
      setSubmittingKey("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-text">Add Loan Originator</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Set the statement close day and due day once, then reuse the originator in debt entry.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              value={newDraft.loan_origin}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, loan_origin: event.target.value }))
              }
              placeholder="e.g. BDO Credit Card"
              className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none md:col-span-3"
            />
            <input
              value={newDraft.statement_day}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, statement_day: event.target.value }))
              }
              inputMode="numeric"
              placeholder="Statement day"
              className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={newDraft.due_day}
              onChange={(event) =>
                setNewDraft((current) => ({ ...current, due_day: event.target.value }))
              }
              inputMode="numeric"
              placeholder="Due day"
              className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={submittingKey === "new"}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {submittingKey === "new" ? "Saving..." : "Save originator"}
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-text">How Statement Grouping Works</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatCard
              label="Origins"
              value={String(sortedConfigs.length)}
              hint="Configured lenders and cards"
            />
            <StatCard
              label="Statement Logic"
              value="Cycle-aware"
              hint="Debt groups by statement month, not raw transaction month"
            />
            <StatCard
              label="Payoff"
              value="Expense-linked"
              hint="Debt payments create expense records from the chosen account"
            />
          </div>
        </Card>
      </div>

      {error ? (
        <Card className="border border-negative/20 bg-negative-light/40 p-4">
          <p className="text-sm text-negative-dark">{error}</p>
        </Card>
      ) : null}

      {sortedConfigs.length === 0 ? (
        <EmptyState
          title="No loan originators yet"
          body="Create your first originator to unlock statement-aware debt grouping."
        />
      ) : (
        <div className="space-y-3">
          {sortedConfigs.map((config) => {
            const draft = rowDrafts[config.loan_origin] ?? createLoanOriginDraft(config);
            const debtCount = Number(config.debt_count ?? 0);
            return (
              <Card key={config.loan_origin} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-text">{config.loan_origin}</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {debtCount} debt record{debtCount === 1 ? "" : "s"} currently use this originator.
                    </p>
                  </div>
                  <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.2fr),160px,160px] lg:max-w-2xl">
                    <input
                      value={draft.loan_origin}
                      onChange={(event) =>
                        setRowDrafts((current) => ({
                          ...current,
                          [config.loan_origin]: {
                            ...draft,
                            loan_origin: event.target.value,
                          },
                        }))
                      }
                      className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                      value={draft.statement_day}
                      onChange={(event) =>
                        setRowDrafts((current) => ({
                          ...current,
                          [config.loan_origin]: {
                            ...draft,
                            statement_day: event.target.value,
                          },
                        }))
                      }
                      inputMode="numeric"
                      placeholder="Statement day"
                      className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                    <input
                      value={draft.due_day}
                      onChange={(event) =>
                        setRowDrafts((current) => ({
                          ...current,
                          [config.loan_origin]: {
                            ...draft,
                            due_day: event.target.value,
                          },
                        }))
                      }
                      inputMode="numeric"
                      placeholder="Due day"
                      className="rounded-lg bg-bg-subtle px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveExisting(config)}
                    disabled={submittingKey === config.loan_origin}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {submittingKey === config.loan_origin ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(config.loan_origin)}
                    disabled={submittingKey === `delete:${config.loan_origin}`}
                    className="rounded-lg bg-negative-light px-4 py-2 text-sm font-medium text-negative-dark disabled:opacity-60"
                  >
                    {submittingKey === `delete:${config.loan_origin}` ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-bg-subtle p-4">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
      <p className="mt-1 text-2xs text-text-secondary">{hint}</p>
    </div>
  );
}
