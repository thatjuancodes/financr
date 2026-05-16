import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api";
import Card from "@/components/base/Card";
import Badge from "@/components/base/Badge";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { ALL_ENTITIES_ID, formatLongDate } from "@/lib/finance";
import type {
  ImportBatchCandidateSummary,
  ImportBatchRecord,
} from "@/types/finance";

type UploadState = "idle" | "uploading";

function summaryValue(summary: ImportBatchCandidateSummary | null | undefined, key: keyof ImportBatchCandidateSummary) {
  return Number(summary?.[key] || 0);
}

function batchStatusVariant(status: ImportBatchRecord["status"]) {
  if (status === "failed") {
    return "negative" as const;
  }
  if (status === "reviewed") {
    return "positive" as const;
  }
  if (status === "parsed") {
    return "accent" as const;
  }
  return "warning" as const;
}

function sourceTypeLabel(sourceType: ImportBatchRecord["source_type"]) {
  return sourceType === "pdf" ? "PDF" : "Image";
}

function batchTitle(batch: ImportBatchRecord) {
  return batch.display_title || batch.primary_filename || batch.source_label || `Batch ${String(batch.id).slice(0, 8)}`;
}

function batchHasPendingReview(batch: ImportBatchRecord) {
  return (
    summaryValue(batch.summary, "pending_count") +
      summaryValue(batch.summary, "needs_review_count") +
      summaryValue(batch.summary, "duplicate_count") >
    0
  );
}

export default function ImportsPage() {
  const navigate = useNavigate();
  const { accounts, balance, entities, loading: financeLoading, selectedEntityId } = useFinanceData();
  const [batches, setBatches] = useState<ImportBatchRecord[]>([]);
  const [summary, setSummary] = useState<ImportBatchCandidateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  const [deletingBatchId, setDeletingBatchId] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [selectedEntity, setSelectedEntity] = useState(
    selectedEntityId && selectedEntityId !== ALL_ENTITIES_ID ? selectedEntityId : ""
  );
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredAccounts = useMemo(() => {
    if (!selectedEntity) {
      return accounts;
    }
    return accounts.filter((account) => account.entity_id === selectedEntity);
  }, [accounts, selectedEntity]);

  const loadImports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getImports();
      setBatches(Array.isArray(response?.batches) ? response.batches : []);
      setSummary(response?.summary || null);
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to load imports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImports();
  }, [loadImports]);

  useEffect(() => {
    if (selectedAccountId && !filteredAccounts.some((account) => String(account.id) === selectedAccountId)) {
      setSelectedAccountId("");
    }
  }, [filteredAccounts, selectedAccountId]);

  async function handleFiles(fileList: FileList | File[] | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) {
      return;
    }
    setUploadState("uploading");
    setUploadError("");
    setUploadNotice("");

    try {
      let firstBatchId = "";
      for (const file of files) {
        const result = await api.uploadImportFile({
          file,
          sourceLabel,
          entityId: selectedEntity || undefined,
          accountId: selectedAccountId || undefined,
        });
        if (!firstBatchId) {
          firstBatchId = String(result?.batch?.id || "");
        }
      }
      await loadImports();
      if (files.length === 1 && firstBatchId) {
        navigate(`/imports/${encodeURIComponent(firstBatchId)}`);
        return;
      }
      setUploadNotice(`${files.length} files uploaded to Transaction Inbox.`);
    } catch (nextError: any) {
      setUploadError(nextError?.message || "Failed to upload files");
    } finally {
      setUploadState("idle");
    }
  }

  async function handleDeleteBatch(batchId: string) {
    setDeletingBatchId(batchId);
    setError("");
    setUploadNotice("");
    try {
      await api.deleteImportBatch(batchId);
      await loadImports();
      setUploadNotice("Batch deleted.");
    } catch (nextError: any) {
      setError(nextError?.message || "Failed to delete batch");
    } finally {
      setDeletingBatchId("");
    }
  }

  if (loading || financeLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading Transaction Inbox..." />
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
              Bulk Update
            </p>
            <h1 className="text-2xl font-semibold text-text">Transaction Inbox</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="md">
              {`${summaryValue(summary, "pending_count") + summaryValue(summary, "needs_review_count")} waiting`}
            </Badge>
            <Badge variant="outline" size="md">
              {`${summaryValue(summary, "duplicate_count")} duplicates`}
            </Badge>
            <Link
              to="/transactions"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-accent/30 hover:text-accent-dark"
            >
              <i className="ri-arrow-left-line text-base" />
              Back to Transactions
            </Link>
          </div>
        </div>

        <Card className="mb-4 p-4">
          <div className="grid gap-3 xl:grid-cols-[1.15fr,0.85fr,1fr,auto] xl:items-end">
            <label className="space-y-1 text-sm text-text-secondary">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Source label</span>
              <input
                value={sourceLabel}
                onChange={(event) => setSourceLabel(event.target.value)}
                placeholder="May payroll statement"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
              />
            </label>
            <label className="space-y-1 text-sm text-text-secondary">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Entity</span>
              <select
                value={selectedEntity}
                onChange={(event) => setSelectedEntity(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
              >
                <option value="">Auto-detect from account</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-text-secondary">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Account</span>
              <select
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
              >
                <option value="">Review without account preset</option>
                {filteredAccounts.map((account) => (
                  <option key={account.id} value={String(account.id)}>
                    {account.entity_name} · {account.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                multiple
                disabled={uploadState === "uploading"}
                onChange={(event) => {
                  void handleFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
                className="hidden"
              />
              <Badge variant="outline" size="md">
                {balance?.currency_code || "PHP"}
              </Badge>
              <button
                type="button"
                disabled={uploadState === "uploading"}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className="ri-file-upload-line text-base" />
                {uploadState === "uploading" ? "Processing..." : "Upload files"}
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            <span>PDF and image only</span>
            <span>One uploaded file becomes one review batch</span>
            <span>Review and approval happen on the batch page</span>
          </div>
          {uploadError ? <p className="mt-2 text-sm text-negative-dark">{uploadError}</p> : null}
          {uploadNotice ? <p className="mt-2 text-sm text-positive-dark">{uploadNotice}</p> : null}
        </Card>

        {error ? <p className="mb-4 text-sm text-negative-dark">{error}</p> : null}

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Recent batches</h2>
              <p className="text-sm text-text-secondary">
                Open a batch to review imported transactions for approval.
              </p>
            </div>
          </div>

          {batches.length === 0 ? (
            <EmptyState
              title="No uploads yet"
              body="Upload a statement or screenshot to create your first Transaction Inbox batch."
            />
          ) : (
            <div className="space-y-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/imports/${encodeURIComponent(batch.id)}`)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-text">
                            {batchTitle(batch)}
                          </h3>
                          <Badge variant={batchStatusVariant(batch.status)}>{batch.status}</Badge>
                          <Badge variant="outline">{sourceTypeLabel(batch.source_type)}</Badge>
                          {batchHasPendingReview(batch) ? (
                            <Badge variant="warning">pending review</Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                          <span>{formatLongDate(batch.created_at)}</span>
                          <span>{summaryValue(batch.summary, "total_count")} candidates</span>
                          <span>{summaryValue(batch.summary, "pending_count") + summaryValue(batch.summary, "needs_review_count")} waiting</span>
                          <span>{summaryValue(batch.summary, "duplicate_count")} duplicates</span>
                        </div>
                      </div>
                      <i className="ri-arrow-right-s-line text-xl text-text-muted" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingBatchId === batch.id}
                      onClick={() => void handleDeleteBatch(batch.id)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-text transition hover:border-negative/30 hover:text-negative-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <i className="ri-delete-bin-line text-base" />
                      Delete
                    </button>
                  </div>

                  {batch.error_message ? (
                    <p className="mt-2 text-sm text-negative-dark">{batch.error_message}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
