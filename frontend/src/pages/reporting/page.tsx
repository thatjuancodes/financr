import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/api";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { ALL_ENTITIES_ID, formatCompactCurrency } from "@/lib/finance";
import { InsightsContent } from "@/pages/insights/page";
import { monthLabel } from "@/utils/format";
import type { MonthlyReportListItem } from "./shared";

type ReportingTab = "reports" | "insights";

const TABS: ReportingTab[] = ["reports", "insights"];

export default function Reporting() {
  const navigate = useNavigate();
  const { balance, loading, selectedEntityId } = useFinanceData();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "insights" ? "insights" : "reports";
  const scopedEntityId = selectedEntityId !== ALL_ENTITIES_ID ? selectedEntityId : undefined;
  const currency = balance?.currency_code || "PHP";

  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [reports, setReports] = useState<MonthlyReportListItem[]>([]);
  const [generating, setGenerating] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError("");
    try {
      const response = await api.getMonthlyReports(
        scopedEntityId ? { entity_id: scopedEntityId, page_size: 24 } : { page_size: 24 }
      );
      setReports(Array.isArray(response?.items) ? response.items : []);
    } catch (error: any) {
      setReportsError(error?.message || "Failed to load monthly reports");
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [scopedEntityId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleGenerate = useCallback(
    async (monthKey: string | null) => {
      setGenerating(true);
      setReportsError("");
      try {
        const response = await api.generateMonthlyReport(
          monthKey,
          scopedEntityId ? { entity_id: scopedEntityId } : {}
        );
        await loadReports();
        if (response?.month_key) {
          navigate(`/reporting/${encodeURIComponent(response.month_key)}`);
        }
      } catch (error: any) {
        setReportsError(error?.message || "Failed to generate monthly report");
      } finally {
        setGenerating(false);
      }
    },
    [loadReports, navigate, scopedEntityId]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading reporting..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text">Reporting</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monthly reports are listed first. Open any month for the full report view.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((value) => (
            <button
              key={value}
              onClick={() => updateParams({ tab: value === "reports" ? null : value })}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                tab === value ? "bg-accent text-white" : "bg-bg-subtle text-text-secondary"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {reportsError ? (
          <Card className="mb-6 border border-negative/20 bg-negative-light p-4 text-sm text-negative-dark">
            {reportsError}
          </Card>
        ) : null}

        {tab === "insights" ? <InsightsContent showHeader={false} /> : null}

        {tab === "reports" ? (
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">Monthly Reports</h2>
                <p className="text-sm text-text-secondary">Generated closed-month snapshots</p>
              </div>
              <button
                onClick={() => void handleGenerate(null)}
                disabled={generating}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>

            {reportsLoading ? (
              <LoadingState label="Loading reports..." />
            ) : reports.length === 0 ? (
              <EmptyState
                title="No reports yet"
                body="Generate the last closed month to create your first report snapshot."
              />
            ) : (
              <div className="space-y-2">
                {reports.map((item) => (
                  <button
                    key={item.month_key}
                    type="button"
                    onClick={() => navigate(`/reporting/${encodeURIComponent(item.month_key)}`)}
                    className="w-full rounded-xl border border-bg-subtle bg-white px-4 py-3 text-left transition-colors hover:border-accent/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-sm font-semibold text-text">{monthLabel(item.month_key)}</p>
                          <p className="text-xs text-text-secondary">
                            Updated {String(item.updated_at || item.generated_at || "").slice(0, 10)}
                          </p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                          <span>
                            Income{" "}
                            <span className="font-medium text-positive">
                              {formatCompactCurrency(item.summary?.income || 0, currency)}
                            </span>
                          </span>
                          <span>
                            Expenses{" "}
                            <span className="font-medium text-negative">
                              {formatCompactCurrency(item.summary?.expenses || 0, currency)}
                            </span>
                          </span>
                          <span>
                            Net{" "}
                            <span
                              className={`font-medium ${
                                (item.summary?.net || 0) >= 0 ? "text-positive" : "text-negative"
                              }`}
                            >
                              {formatCompactCurrency(item.summary?.net || 0, currency)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <i className="ri-arrow-right-s-line text-xl text-text-muted" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        ) : null}
      </main>
    </div>
  );
}
