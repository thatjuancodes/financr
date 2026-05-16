import type { ReactNode } from "react";
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

function formatShortDate(value?: string | null) {
  if (!value) {
    return "No date";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function getCandidateTypeVariant(type: ImportCandidateRecord["candidate_type"]) {
  switch (type) {
    case "income":
      return "positive";
    case "transfer":
      return "accent";
    case "unknown":
      return "outline";
    default:
      return "warning";
  }
}

function getCandidateStatusVariant(status: ImportCandidateRecord["status"]) {
  switch (status) {
    case "approved":
      return "positive";
    case "rejected":
      return "negative";
    case "duplicate":
      return "warning";
    case "needs_review":
      return "accent";
    default:
      return "outline";
  }
}

function batchTitle(batch: ImportBatchRecord, files: ImportFileRecord[]) {
  return (
    batch.display_title ||
    batch.primary_filename ||
    files[0]?.filename ||
    batch.source_label ||
    "Imported batch"
  );
}

export default function ImportBatchDetailPage() {
  const navigate = useNavigate();
  const { batchId = "" } = useParams();
  const { accounts, categories, entities, incomeCategories, refresh } = useFinanceData();
  const [payload, setPayload] = useState<BatchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingCandidateId, setSavingCandidateId] = useState("");
  const [approving, setApproving] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<ImportCandidateRecord>>>({});
  const [expandedCandidateId, setExpandedCandidateId] = useState("");
  const [editingCandidateId, setEditingCandidateId] = useState("");

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
          (nextPayload?.candidates || []).some(
            (candidate: ImportCandidateRecord) => candidate.id === candidateId
          )
        )
      );
      setExpandedCandidateId((current) =>
        current && nextPayload.candidates.some((candidate) => candidate.id === current) ? current : ""
      );
      setEditingCandidateId((current) =>
        current && nextPayload.candidates.some((candidate) => candidate.id === current) ? current : ""
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
  const selectableCandidates = useMemo(
    () => candidates.filter(canSelect),
    [candidates]
  );
  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [String(account.id), account])),
    [accounts]
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category])),
    [categories]
  );
  const incomeCategoriesById = useMemo(
    () => new Map(incomeCategories.map((category) => [String(category.id), category])),
    [incomeCategories]
  );
  const entitiesById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity])),
    [entities]
  );

  const editingCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === editingCandidateId) || null,
    [candidates, editingCandidateId]
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

  function resetCandidateDraft(candidateId: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
  }

  async function saveCandidate(candidate: ImportCandidateRecord) {
    const draft = drafts[candidate.id];
    if (!draft) {
      setEditingCandidateId("");
      return;
    }
    setSavingCandidateId(candidate.id);
    setError("");
    setNotice("");
    try {
      await api.updateImportCandidate(candidate.id, draft);
      resetCandidateDraft(candidate.id);
      setEditingCandidateId("");
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

  const allSelectableChecked =
    selectableCandidates.length > 0 && selectableCandidates.length === actionableSelectedIds.length;

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
              {batchTitle(payload.batch, payload.files)}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Uploaded {formatLongDate(payload.batch.created_at)} ·{" "}
              {payload.batch.source_type.toUpperCase()}
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
            <MetaItem
              label="Processed"
              value={
                payload.batch.processed_at
                  ? formatLongDate(payload.batch.processed_at)
                  : "In progress"
              }
            />
          </div>
          {payload.batch.error_message ? (
            <p className="mt-4 text-sm text-negative-dark">{payload.batch.error_message}</p>
          ) : null}
        </Card>

        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Review candidates</h2>
              <p className="text-sm text-text-secondary">
                Expand a row for context, then open the drawer to edit before approval.
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
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelectableChecked}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedIds(selectableCandidates.map((candidate) => candidate.id));
                  } else {
                    setSelectedIds([]);
                  }
                }}
              />
              <span>Select all actionable</span>
            </label>
            <span>{selectedIds.length} selected</span>
            <span>{candidates.length} total rows</span>
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
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const draft = candidateDraft(candidate);
              const account =
                draft.suggested_account_id !== null && draft.suggested_account_id !== undefined
                  ? accountsById.get(String(draft.suggested_account_id))
                  : null;
              const toAccount =
                draft.suggested_to_account_id !== null && draft.suggested_to_account_id !== undefined
                  ? accountsById.get(String(draft.suggested_to_account_id))
                  : null;
              const categoryLookup =
                draft.candidate_type === "income" ? incomeCategoriesById : categoriesById;
              const category =
                draft.suggested_category_id !== null && draft.suggested_category_id !== undefined
                  ? categoryLookup.get(String(draft.suggested_category_id))
                  : null;
              const entity = draft.suggested_entity_id
                ? entitiesById.get(draft.suggested_entity_id)
                : null;

              return (
                <ImportCandidateRowCard
                  key={candidate.id}
                  accountLabel={account ? `${account.entity_name} · ${account.name}` : "No account"}
                  amountLabel={formatAmountCents(draft.amount_cents, draft.currency_code || "PHP")}
                  categoryLabel={category?.name || "No category"}
                  candidate={candidate}
                  draft={draft}
                  entityLabel={entity?.name || "No entity"}
                  expanded={expandedCandidateId === candidate.id}
                  hasUnsavedChanges={Boolean(drafts[candidate.id])}
                  isSelected={selectedIds.includes(candidate.id)}
                  onEdit={() => setEditingCandidateId(candidate.id)}
                  onSelect={(checked) => {
                    setSelectedIds((current) =>
                      checked
                        ? current.includes(candidate.id)
                          ? current
                          : [...current, candidate.id]
                        : current.filter((id) => id !== candidate.id)
                    );
                  }}
                  onToggle={() =>
                    setExpandedCandidateId((current) => (current === candidate.id ? "" : candidate.id))
                  }
                  toAccountLabel={
                    draft.candidate_type === "transfer"
                      ? toAccount
                        ? `${toAccount.entity_name} · ${toAccount.name}`
                        : "No destination account"
                      : ""
                  }
                />
              );
            })}
          </div>
        )}
      </main>

      <ImportCandidateDrawer
        accounts={accounts}
        candidate={editingCandidate}
        categories={categories}
        entities={entities}
        incomeCategories={incomeCategories}
        isOpen={Boolean(editingCandidate)}
        isSaving={Boolean(editingCandidate && savingCandidateId === editingCandidate.id)}
        onCandidateDraftChange={setCandidateDraft}
        onClose={() => {
          if (editingCandidate) {
            resetCandidateDraft(editingCandidate.id);
          }
          setEditingCandidateId("");
        }}
        onSave={async (candidate) => {
          await saveCandidate(candidate);
        }}
        resolveDraft={candidateDraft}
      />
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

function ImportCandidateRowCard({
  accountLabel,
  amountLabel,
  candidate,
  categoryLabel,
  draft,
  entityLabel,
  expanded,
  hasUnsavedChanges,
  isSelected,
  onEdit,
  onSelect,
  onToggle,
  toAccountLabel,
}: {
  accountLabel: string;
  amountLabel: string;
  candidate: ImportCandidateRecord;
  categoryLabel: string;
  draft: ImportCandidateRecord;
  entityLabel: string;
  expanded: boolean;
  hasUnsavedChanges: boolean;
  isSelected: boolean;
  onEdit: () => void;
  onSelect: (checked: boolean) => void;
  onToggle: () => void;
  toAccountLabel: string;
}) {
  const amountTone =
    draft.candidate_type === "income"
      ? "text-positive"
      : draft.candidate_type === "transfer"
        ? "text-accent-dark"
        : "text-text";

  return (
    <Card className="overflow-hidden">
      <div
        className={`border-l-2 ${
          candidate.status === "duplicate"
            ? "border-warning"
            : candidate.status === "needs_review"
              ? "border-accent"
              : candidate.status === "approved"
                ? "border-positive"
                : "border-transparent"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-subtle"
        >
          <span
            className="flex shrink-0 items-center pt-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              disabled={!canSelect(candidate)}
              onChange={(event) => onSelect(event.target.checked)}
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="truncate text-sm font-medium text-text">
                {draft.description || draft.merchant || "Imported transaction"}
              </p>
              <Badge variant={getCandidateTypeVariant(draft.candidate_type)}>{draft.candidate_type}</Badge>
              <Badge variant={getCandidateStatusVariant(draft.status)}>{draft.status}</Badge>
              {candidate.duplicate_reference ? (
                <Badge variant="warning">possible duplicate</Badge>
              ) : null}
              {hasUnsavedChanges ? <Badge variant="outline">unsaved</Badge> : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
              <span>{formatShortDate(draft.transaction_date)}</span>
              <span>•</span>
              <span className="truncate">{accountLabel}</span>
              <span>•</span>
              <span className="truncate">{categoryLabel}</span>
              <span>•</span>
              <span>{confidenceLabel(draft.confidence_score)} confidence</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className={`text-sm font-semibold ${amountTone}`}>{amountLabel}</span>
            <i
              className={`ri-arrow-down-s-line text-lg text-text-muted transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {expanded ? (
          <div className="border-t border-bg-subtle px-4 pb-4 pt-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Pill label="Entity" value={entityLabel} />
                <Pill label="Account" value={accountLabel} />
                {draft.candidate_type === "transfer" ? (
                  <Pill label="To" value={toAccountLabel} />
                ) : null}
                {draft.posted_date ? <Pill label="Posted" value={formatShortDate(draft.posted_date)} /> : null}
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-bg-subtle px-3 py-2 text-sm font-medium text-text transition hover:bg-bg"
              >
                <i className="ri-pencil-line text-base" />
                Edit
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoBlock label="Date">{formatShortDate(draft.transaction_date)}</InfoBlock>
              <InfoBlock label="Amount">{amountLabel}</InfoBlock>
              <InfoBlock label="Category">{categoryLabel}</InfoBlock>
              <InfoBlock label="Confidence">{confidenceLabel(draft.confidence_score)}</InfoBlock>
            </div>

            {candidate.duplicate_reference ? (
              <div className="mt-3 rounded-xl bg-warning-light/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning-dark">
                  Possible Duplicate
                </p>
                <p className="mt-1 text-sm text-warning-dark">
                  {candidate.duplicate_reference.description ||
                    candidate.duplicate_reference.source_type ||
                    "Existing transaction"}
                </p>
                <p className="mt-1 text-xs text-warning-dark">
                  {formatAmountCents(
                    candidate.duplicate_reference.amount_cents,
                    draft.currency_code || "PHP"
                  )}{" "}
                  · {candidate.duplicate_reference.transaction_date || "No date"}
                </p>
              </div>
            ) : null}

            {draft.raw_line ? (
              <div className="mt-3">
                <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">
                  Raw Source
                </p>
                <p className="mt-1 text-sm text-text-secondary">{draft.raw_line}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ImportCandidateDrawer({
  accounts,
  candidate,
  categories,
  entities,
  incomeCategories,
  isOpen,
  isSaving,
  onCandidateDraftChange,
  onClose,
  onSave,
  resolveDraft,
}: {
  accounts: Array<{
    entity_id: string;
    entity_name: string;
    id: number;
    name: string;
  }>;
  candidate: ImportCandidateRecord | null;
  categories: Array<{ id: number; name: string }>;
  entities: Array<{ id: string; name: string }>;
  incomeCategories: Array<{ id: number; name: string }>;
  isOpen: boolean;
  isSaving: boolean;
  onCandidateDraftChange: (candidateId: string, patch: Partial<ImportCandidateRecord>) => void;
  onClose: () => void;
  onSave: (candidate: ImportCandidateRecord) => Promise<void>;
  resolveDraft: (candidate: ImportCandidateRecord) => ImportCandidateRecord;
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timeoutId = window.setTimeout(() => setIsVisible(true), 16);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => setShouldRender(false), 240);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!shouldRender || !candidate) {
    return null;
  }

  const draft = resolveDraft(candidate);
  const categoryOptions = draft.candidate_type === "income" ? incomeCategories : categories;
  const filteredAccounts = accounts.filter(
    (account) => !draft.suggested_entity_id || account.entity_id === draft.suggested_entity_id
  );

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
        aria-label="Edit imported transaction"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">Edit Imported Transaction</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Update the candidate, then save it back to the review list.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(candidate);
          }}
        >
          <FormInput
            label="Description"
            value={draft.description || ""}
            onChange={(value) =>
              onCandidateDraftChange(candidate.id, {
                description: value,
              })
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Date"
              type="date"
              value={draft.transaction_date || ""}
              onChange={(value) =>
                onCandidateDraftChange(candidate.id, {
                  transaction_date: value,
                })
              }
            />
            <FormInput
              label="Amount"
              type="number"
              inputMode="decimal"
              value={
                draft.amount_cents === null || draft.amount_cents === undefined
                  ? ""
                  : String((draft.amount_cents || 0) / 100)
              }
              onChange={(value) =>
                onCandidateDraftChange(candidate.id, {
                  amount_cents: value === "" ? null : Math.round(Number(value) * 100),
                })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Type"
              value={draft.candidate_type}
              onChange={(value) =>
                onCandidateDraftChange(candidate.id, {
                  candidate_type: value as ImportCandidateRecord["candidate_type"],
                })
              }
              options={[
                { label: "Expense", value: "expense" },
                { label: "Income", value: "income" },
                { label: "Transfer", value: "transfer" },
                { label: "Unknown", value: "unknown" },
              ]}
            />
            <FormSelect
              label="Status"
              value={draft.status}
              onChange={(value) =>
                onCandidateDraftChange(candidate.id, {
                  status: value as ImportCandidateRecord["status"],
                })
              }
              options={[
                { label: "Pending", value: "pending" },
                { label: "Needs review", value: "needs_review" },
                { label: "Duplicate", value: "duplicate" },
                { label: "Rejected", value: "rejected" },
                ...(candidate.status === "approved"
                  ? [{ label: "Approved", value: "approved" }]
                  : []),
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Entity"
              value={draft.suggested_entity_id || ""}
              onChange={(value) =>
                onCandidateDraftChange(candidate.id, {
                  suggested_entity_id: value || null,
                  suggested_account_id: null,
                })
              }
              options={[
                { label: "No entity", value: "" },
                ...entities.map((entity) => ({ label: entity.name, value: entity.id })),
              ]}
            />
            <FormSelect
              label="Account"
              value={draft.suggested_account_id ? String(draft.suggested_account_id) : ""}
              onChange={(value) =>
                onCandidateDraftChange(candidate.id, {
                  suggested_account_id: value ? Number(value) : null,
                })
              }
              options={[
                { label: "Primary account", value: "" },
                ...filteredAccounts.map((account) => ({
                  label: `${account.entity_name} · ${account.name}`,
                  value: String(account.id),
                })),
              ]}
            />
          </div>

          {draft.candidate_type === "transfer" ? (
            <FormSelect
              label="Destination account"
              value={draft.suggested_to_account_id ? String(draft.suggested_to_account_id) : ""}
              onChange={(value) =>
                onCandidateDraftChange(candidate.id, {
                  suggested_to_account_id: value ? Number(value) : null,
                })
              }
              options={[
                { label: "Destination account", value: "" },
                ...accounts
                  .filter((account) => String(account.id) !== String(draft.suggested_account_id || ""))
                  .map((account) => ({
                    label: `${account.entity_name} · ${account.name}`,
                    value: String(account.id),
                  })),
              ]}
            />
          ) : null}

          <FormSelect
            label="Category"
            value={draft.suggested_category_id ? String(draft.suggested_category_id) : ""}
            onChange={(value) =>
              onCandidateDraftChange(candidate.id, {
                suggested_category_id: value ? Number(value) : null,
              })
            }
            options={[
              { label: "No category", value: "" },
              ...categoryOptions.map((category) => ({
                label: category.name,
                value: String(category.id),
              })),
            ]}
          />

          {candidate.duplicate_reference ? (
            <div className="rounded-xl bg-warning-light/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning-dark">
                Possible Duplicate
              </p>
              <p className="mt-1 text-sm text-warning-dark">
                {candidate.duplicate_reference.description ||
                  candidate.duplicate_reference.source_type ||
                  "Existing transaction"}
              </p>
            </div>
          ) : null}

          {draft.raw_line ? (
            <FormTextarea
              label="Raw source"
              value={draft.raw_line}
              onChange={() => {}}
              readOnly
            />
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || candidate.status === "approved"}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="ri-save-line text-base" />
              Save candidate
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2.5 py-1 text-xs text-text-secondary">
      <span className="font-medium text-text">{label}:</span>
      <span>{value}</span>
    </span>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text">{children}</p>
    </div>
  );
}

function FormInput({
  inputMode,
  label,
  onChange,
  type = "text",
  value,
}: {
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
      />
    </label>
  );
}

function FormSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
      >
        {options.map((option) => (
          <option key={`${label}:${option.value}:${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormTextarea({
  label,
  onChange,
  readOnly = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text">{label}</span>
      <textarea
        rows={4}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent read-only:bg-bg-subtle"
      />
    </label>
  );
}
