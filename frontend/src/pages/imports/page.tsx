import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [dragActive, setDragActive] = useState(false);

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
          <Link
            to="/transactions"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-accent/30 hover:text-accent-dark"
          >
            <i className="ri-arrow-left-line text-base" />
            Back to Transactions
          </Link>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <InboxStatCard
            label="Waiting for review"
            value={String(summaryValue(summary, "pending_count") + summaryValue(summary, "needs_review_count"))}
            hint="Pending and needs review"
          />
          <InboxStatCard
            label="Possible duplicates"
            value={String(summaryValue(summary, "duplicate_count"))}
            hint="Review before approval"
          />
          <InboxStatCard
            label="Approved"
            value={String(summaryValue(summary, "approved_count"))}
            hint="Moved into finance tables"
          />
          <InboxStatCard
            label="Rejected"
            value={String(summaryValue(summary, "rejected_count"))}
            hint="Ignored candidates"
          />
          <InboxStatCard
            label="Currency"
            value={balance?.currency_code || "PHP"}
            hint="Workspace currency"
          />
        </div>

        <Card className="mb-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Upload statements or screenshots</h2>
              <p className="text-sm text-text-secondary">
                Files stay in the active Space and create review-only candidates until you approve them.
              </p>
            </div>
            <Badge variant="outline" size="md">
              PDF and image only
            </Badge>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <label className="space-y-2 text-sm text-text-secondary">
              <span className="block font-medium text-text">Source label</span>
              <input
                value={sourceLabel}
                onChange={(event) => setSourceLabel(event.target.value)}
                placeholder="May payroll statement"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
              />
            </label>
            <label className="space-y-2 text-sm text-text-secondary">
              <span className="block font-medium text-text">Target entity</span>
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
            <label className="space-y-2 text-sm text-text-secondary">
              <span className="block font-medium text-text">Target account</span>
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
          </div>

          <label
            onDragEnter={() => setDragActive(true)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void handleFiles(event.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${
              dragActive
                ? "border-accent bg-accent-light/50"
                : "border-slate-300 bg-bg-subtle hover:border-accent/50 hover:bg-accent-light/30"
            }`}
          >
            <input
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
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-accent shadow-sm">
              <i className="ri-file-upload-line text-xl" />
            </div>
            <p className="text-base font-semibold text-text">
              {uploadState === "uploading" ? "Processing files..." : "Drop files here or click to browse"}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Drag multiple bank statements or screenshots to create batches quickly.
            </p>
          </label>

          {uploadError ? <p className="mt-3 text-sm text-negative-dark">{uploadError}</p> : null}
          {uploadNotice ? <p className="mt-3 text-sm text-positive-dark">{uploadNotice}</p> : null}
        </Card>

        {error ? <p className="mb-4 text-sm text-negative-dark">{error}</p> : null}

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Recent batches</h2>
              <p className="text-sm text-text-secondary">
                Review new candidates and approve them into the unified transactions feed.
              </p>
            </div>
          </div>

          {batches.length === 0 ? (
            <EmptyState
              title="No uploads yet"
              body="Upload a statement or screenshot to create your first Transaction Inbox batch."
            />
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-text">
                          {batch.source_label || `Batch ${String(batch.id).slice(0, 8)}`}
                        </h3>
                        <Badge variant={batchStatusVariant(batch.status)}>{batch.status}</Badge>
                        <Badge variant="outline">{sourceTypeLabel(batch.source_type)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        Uploaded {formatLongDate(batch.created_at)} · {batch.file_count || 0} file
                        {batch.file_count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-text-secondary">
                      <p>{summaryValue(batch.summary, "pending_count") + summaryValue(batch.summary, "needs_review_count")} waiting</p>
                      <p>{summaryValue(batch.summary, "duplicate_count")} possible duplicates</p>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    <Link
                      to={`/imports/${encodeURIComponent(batch.id)}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-text transition hover:border-accent/30 hover:text-accent-dark"
                    >
                      <i className="ri-eye-line text-base" />
                      Open batch
                    </Link>
                    <button
                      type="button"
                      disabled={deletingBatchId === batch.id}
                      onClick={() => void handleDeleteBatch(batch.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-text transition hover:border-negative/30 hover:text-negative-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <i className="ri-delete-bin-line text-base" />
                      Delete batch
                    </button>
                  </div>

                  <div className="grid gap-2 text-xs text-text-secondary md:grid-cols-5">
                    <BatchMiniStat label="Total" value={String(summaryValue(batch.summary, "total_count"))} />
                    <BatchMiniStat label="Pending" value={String(summaryValue(batch.summary, "pending_count"))} />
                    <BatchMiniStat label="Review" value={String(summaryValue(batch.summary, "needs_review_count"))} />
                    <BatchMiniStat label="Duplicate" value={String(summaryValue(batch.summary, "duplicate_count"))} />
                    <BatchMiniStat label="Approved" value={String(summaryValue(batch.summary, "approved_count"))} />
                  </div>

                  {batch.error_message ? (
                    <p className="mt-3 text-sm text-negative-dark">{batch.error_message}</p>
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

function InboxStatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{hint}</p>
    </Card>
  );
}

function BatchMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-subtle px-3 py-2">
      <p className="font-semibold text-text">{value}</p>
      <p>{label}</p>
    </div>
  );
}
