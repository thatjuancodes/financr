import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import Badge from "@/components/base/Badge";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { formatCurrency, formatLongDate } from "@/lib/finance";
import type {
  ImportBatchCandidateSummary,
  ImportBatchRecord,
  ImportCandidateRecord,
  ImportFileRecord,
} from "@/types/finance";

type BatchPayload = {
  batch: ImportBatchRecord;
  files: ImportFileRecord[];
  summary: ImportBatchCandidateSummary;
  candidates: ImportCandidateRecord[];
};

function formatAmountCents(amountCents: number | null | undefined, currencyCode = "PHP") {
  if (amountCents === null || amountCents === undefined) {
    return "—";
  }
  return formatCurrency(amountCents / 100, currencyCode);
}

function confidenceLabel(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Math.round(value * 100)}%`;
}

function canSelect(candidate: ImportCandidateRecord) {
  return candidate.status === "pending" || candidate.status === "needs_review";
}

export default function ImportBatchDetailPage() {
  const navigate = useNavigate();
  const { batchId = "" } = useParams();
  const {
    accounts,
    categories,
    entities,
    incomeCategories,
    refresh,
  } = useFinanceData();
  const [payload, setPayload] = useState<BatchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingCandidateId, setSavingCandidateId] = useState("");
  const [approving, setApproving] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<ImportCandidateRecord>>>({});

  const loadBatch = useCallback(async () => {
    if (!batchId) {
      setError("Missing batch id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const nextPayload = await api.getImportBatch(batchId);
      setPayload(nextPayload);
      setSelectedIds((current) =>
        current.filter((candidateId) =>
          (nextPayload?.candidates || []).some((candidate: ImportCandidateRecord) => candidate.id === candidateId)
        )
      );
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to load import batch");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  const candidates = payload?.candidates || [];
  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedIds.includes(candidate.id)),
    [candidates, selectedIds]
  );
  const actionableSelectedIds = useMemo(
    () => selectedCandidates.filter(canSelect).map((candidate) => candidate.id),
    [selectedCandidates]
  );

  function candidateDraft(candidate: ImportCandidateRecord) {
    return {
      ...candidate,
      ...(drafts[candidate.id] || {}),
    };
  }

  function setCandidateDraft(candidateId: string, patch: Partial<ImportCandidateRecord>) {
    setDrafts((current) => ({
      ...current,
      [candidateId]: {
        ...(current[candidateId] || {}),
        ...patch,
      },
    }));
  }

  async function saveCandidate(candidate: ImportCandidateRecord) {
    const draft = drafts[candidate.id];
    if (!draft) {
      return;
    }
    setSavingCandidateId(candidate.id);
    setError("");
    setNotice("");
    try {
      await api.updateImportCandidate(candidate.id, draft);
      setDrafts((current) => {
        const next = { ...current };
        delete next[candidate.id];
        return next;
      });
      await loadBatch();
      setNotice("Candidate updated.");
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to update candidate");
    } finally {
      setSavingCandidateId("");
    }
  }

  async function approveSelected() {
    if (!payload || actionableSelectedIds.length === 0) {
      return;
    }
    setApproving(true);
    setError("");
    setNotice("");
    try {
      await api.approveImportBatch(payload.batch.id, actionableSelectedIds);
      setSelectedIds([]);
      await refresh();
      await loadBatch();
      setNotice("Approved candidates are now in the transactions feed.");
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to approve candidates");
    } finally {
      setApproving(false);
    }
  }

  async function rejectSelected() {
    if (actionableSelectedIds.length === 0) {
      return;
    }
    setApproving(true);
    setError("");
    setNotice("");
    try {
      for (const candidateId of actionableSelectedIds) {
        await api.rejectImportCandidate(candidateId);
      }
      setSelectedIds([]);
      await loadBatch();
      setNotice("Selected candidates rejected.");
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to reject candidates");
    } finally {
      setApproving(false);
    }
  }

  async function deleteBatch() {
    if (!payload) {
      return;
    }
    setDeletingBatch(true);
    setError("");
    setNotice("");
    try {
      await api.deleteImportBatch(payload.batch.id);
      navigate("/imports");
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to delete batch");
      setDeletingBatch(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading import batch..." />
        </main>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <EmptyState
            title="Import batch not found"
            body={error || "This batch is unavailable in the active Space."}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-dark">
              Transaction Inbox
            </p>
            <h1 className="text-2xl font-semibold text-text">
              {payload.batch.source_label || payload.files[0]?.filename || "Imported batch"}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Uploaded {formatLongDate(payload.batch.created_at)} · {payload.batch.source_type.toUpperCase()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={payload.batch.status === "failed" ? "negative" : "accent"} size="md">
              {payload.batch.status}
            </Badge>
            <button
              type="button"
              disabled={deletingBatch}
              onClick={() => void deleteBatch()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-negative/30 hover:text-negative-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="ri-delete-bin-line text-base" />
              Delete batch
            </button>
            <Link
              to="/imports"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-accent/30 hover:text-accent-dark"
            >
              <i className="ri-arrow-left-line text-base" />
              Back to Inbox
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <BatchStatCard label="Pending" value={String(payload.summary.pending_count)} />
          <BatchStatCard label="Needs review" value={String(payload.summary.needs_review_count)} />
          <BatchStatCard label="Duplicate" value={String(payload.summary.duplicate_count)} />
          <BatchStatCard label="Approved" value={String(payload.summary.approved_count)} />
          <BatchStatCard label="Rejected" value={String(payload.summary.rejected_count)} />
        </div>

        <Card className="mb-6 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetaItem label="Parser" value={payload.batch.parser_id || "Deterministic parser"} />
            <MetaItem label="Files" value={String(payload.files.length)} />
            <MetaItem
              label="Source"
              value={payload.files.map((file) => file.filename).join(", ") || "Uploaded file"}
            />
            <MetaItem label="Processed" value={payload.batch.processed_at ? formatLongDate(payload.batch.processed_at) : "In progress"} />
          </div>
          {payload.batch.error_message ? (
            <p className="mt-4 text-sm text-negative-dark">{payload.batch.error_message}</p>
          ) : null}
        </Card>

        <Card className="mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Review candidates</h2>
              <p className="text-sm text-text-secondary">
                Save edits per row, then approve selected rows into the existing finance tables.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={approving || actionableSelectedIds.length === 0}
                onClick={() => void rejectSelected()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-negative/30 hover:text-negative-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className="ri-close-circle-line text-base" />
                Reject selected
              </button>
              <button
                type="button"
                disabled={approving || actionableSelectedIds.length === 0}
                onClick={() => void approveSelected()}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className="ri-check-line text-base" />
                Approve selected
              </button>
            </div>
          </div>
          {notice ? <p className="mt-3 text-sm text-positive-dark">{notice}</p> : null}
          {error ? <p className="mt-3 text-sm text-negative-dark">{error}</p> : null}
        </Card>

        {candidates.length === 0 ? (
          <Card className="p-5">
            <EmptyState
              title="No candidates found"
              body="The deterministic parser did not find transaction-like rows in this upload."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-bg-subtle">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          actionableSelectedIds.length > 0 &&
                          actionableSelectedIds.length === candidates.filter(canSelect).length
                        }
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedIds(candidates.filter(canSelect).map((candidate) => candidate.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {candidates.map((candidate) => {
                    const draft = candidateDraft(candidate);
                    const amountCurrencyCode = draft.currency_code || "PHP";
                    const isSelected = selectedIds.includes(candidate.id);
                    const categoryOptions =
                      draft.candidate_type === "income" ? incomeCategories : categories;
                    return (
                      <tr
                        key={candidate.id}
                        className={
                          candidate.status === "duplicate"
                            ? "bg-warning-light/30"
                            : candidate.status === "needs_review"
                              ? "bg-accent-light/20"
                              : ""
                        }
                      >
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canSelect(candidate)}
                            onChange={(event) => {
                              setSelectedIds((current) =>
                                event.target.checked
                                  ? [...current, candidate.id]
                                  : current.filter((id) => id !== candidate.id)
                              );
                            }}
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <input
                            type="date"
                            value={draft.transaction_date || ""}
                            onChange={(event) =>
                              setCandidateDraft(candidate.id, { transaction_date: event.target.value })
                            }
                            className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                          />
                          {candidate.posted_date ? (
                            <p className="mt-1 text-xs text-text-secondary">Posted {candidate.posted_date}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <textarea
                            value={draft.description || ""}
                            onChange={(event) =>
                              setCandidateDraft(candidate.id, { description: event.target.value })
                            }
                            rows={3}
                            className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                          />
                          {candidate.duplicate_reference ? (
                            <p className="mt-2 text-xs text-warning-dark">
                              Possible duplicate: {candidate.duplicate_reference.description || candidate.duplicate_reference.source_type} · {formatAmountCents(candidate.duplicate_reference.amount_cents, amountCurrencyCode)} · {candidate.duplicate_reference.transaction_date}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={
                              draft.amount_cents === null || draft.amount_cents === undefined
                                ? ""
                                : String((draft.amount_cents || 0) / 100)
                            }
                            onChange={(event) => {
                              const value = event.target.value;
                              setCandidateDraft(candidate.id, {
                                amount_cents: value === "" ? null : Math.round(Number(value) * 100),
                              });
                            }}
                            className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                          />
                          <p className="mt-1 text-xs text-text-secondary">
                            {formatAmountCents(draft.amount_cents, amountCurrencyCode)}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <select
                            value={draft.candidate_type}
                            onChange={(event) =>
                              setCandidateDraft(candidate.id, {
                                candidate_type: event.target.value as ImportCandidateRecord["candidate_type"],
                              })
                            }
                            className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                            <option value="transfer">Transfer</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-2">
                            <select
                              value={draft.suggested_entity_id || ""}
                              onChange={(event) =>
                                setCandidateDraft(candidate.id, {
                                  suggested_entity_id: event.target.value || null,
                                })
                              }
                              className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                            >
                              <option value="">No entity</option>
                              {entities.map((entity) => (
                                <option key={entity.id} value={entity.id}>
                                  {entity.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={draft.suggested_account_id ? String(draft.suggested_account_id) : ""}
                              onChange={(event) =>
                                setCandidateDraft(candidate.id, {
                                  suggested_account_id: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                              className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                            >
                              <option value="">Primary account</option>
                              {accounts
                                .filter(
                                  (account) =>
                                    !draft.suggested_entity_id || account.entity_id === draft.suggested_entity_id
                                )
                                .map((account) => (
                                  <option key={account.id} value={String(account.id)}>
                                    {account.entity_name} · {account.name}
                                  </option>
                                ))}
                            </select>
                            {draft.candidate_type === "transfer" ? (
                              <select
                                value={draft.suggested_to_account_id ? String(draft.suggested_to_account_id) : ""}
                                onChange={(event) =>
                                  setCandidateDraft(candidate.id, {
                                    suggested_to_account_id: event.target.value ? Number(event.target.value) : null,
                                  })
                                }
                                className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                              >
                                <option value="">Destination account</option>
                                {accounts.map((account) => (
                                  <option key={account.id} value={String(account.id)}>
                                    {account.entity_name} · {account.name}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <select
                            value={draft.suggested_category_id ? String(draft.suggested_category_id) : ""}
                            onChange={(event) =>
                              setCandidateDraft(candidate.id, {
                                suggested_category_id: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                            className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                          >
                            <option value="">No category</option>
                            {categoryOptions.map((category) => (
                              <option key={category.id} value={String(category.id)}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge variant="outline">{confidenceLabel(candidate.confidence_score)}</Badge>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              setCandidateDraft(candidate.id, {
                                status: event.target.value as ImportCandidateRecord["status"],
                              })
                            }
                            className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
                          >
                            <option value="pending">pending</option>
                            <option value="needs_review">needs_review</option>
                            <option value="duplicate">duplicate</option>
                            <option value="rejected">rejected</option>
                            {candidate.status === "approved" ? <option value="approved">approved</option> : null}
                          </select>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <button
                            type="button"
                            disabled={savingCandidateId === candidate.id || candidate.status === "approved"}
                            onClick={() => void saveCandidate(candidate)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-text transition hover:border-accent/30 hover:text-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <i className="ri-save-line text-base" />
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function BatchStatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-subtle px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-1 text-sm text-text">{value}</p>
    </div>
  );
}
