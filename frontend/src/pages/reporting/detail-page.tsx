import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import {
  ALL_ENTITIES_ID,
} from "@/lib/finance";
import { monthLabel } from "@/utils/format";
import type { MonthlyReportRecord } from "./shared";
import ReportDetailContent from "./report-detail-content";

export default function ReportDetailPage() {
  const { monthKey = "" } = useParams();
  const { balance, loading, selectedEntityId } = useFinanceData();
  const scopedEntityId = selectedEntityId !== ALL_ENTITIES_ID ? selectedEntityId : undefined;
  const currency = balance?.currency_code || "PHP";

  const [reportDetailLoading, setReportDetailLoading] = useState(true);
  const [reportError, setReportError] = useState("");
  const [reportDetail, setReportDetail] = useState<MonthlyReportRecord | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadReport = useCallback(async () => {
    if (!monthKey) {
      setReportDetail(null);
      setReportDetailLoading(false);
      return;
    }

    setReportDetailLoading(true);
    setReportError("");
    try {
      const response = await api.getMonthlyReport(
        monthKey,
        scopedEntityId ? { entity_id: scopedEntityId } : {}
      );
      setReportDetail(response || null);
    } catch (error: any) {
      setReportError(error?.message || "Failed to load monthly report");
      setReportDetail(null);
    } finally {
      setReportDetailLoading(false);
    }
  }, [monthKey, scopedEntityId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleGenerate = useCallback(async () => {
    if (!monthKey) {
      return;
    }
    setGenerating(true);
    setReportError("");
    try {
      await api.generateMonthlyReport(
        monthKey,
        scopedEntityId ? { entity_id: scopedEntityId } : {}
      );
      await loadReport();
    } catch (error: any) {
      setReportError(error?.message || "Failed to generate monthly report");
    } finally {
      setGenerating(false);
    }
  }, [loadReport, monthKey, scopedEntityId]);

  const report = reportDetail?.report || null;

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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              {monthKey ? `Report: ${monthLabel(monthKey)}` : "Report Detail"}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Summary, category mix, debt, and month-end recommendations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {monthKey ? (
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="rounded-lg bg-bg-subtle px-4 py-2 text-sm font-medium text-text disabled:opacity-60"
              >
                {generating ? "Refreshing..." : "Regenerate"}
              </button>
            ) : null}
            {monthKey ? (
              <Link
                to={`/reporting/${encodeURIComponent(monthKey)}/print`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark"
              >
                <i className="ri-download-line text-base" />
                Download PDF
              </Link>
            ) : null}
            <Link
              to="/reporting"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-accent/30 hover:text-accent-dark"
            >
              <i className="ri-arrow-left-line text-base" />
              Back to Reports
            </Link>
          </div>
        </div>

        {reportError ? (
          <Card className="mb-6 border border-negative/20 bg-negative-light p-4 text-sm text-negative-dark">
            {reportError}
          </Card>
        ) : null}

        {reportDetailLoading ? (
          <LoadingState label="Loading report detail..." />
        ) : !monthKey ? (
          <EmptyState title="No month selected" body="Open a report month from the reports list." />
        ) : !report ? (
          <EmptyState title="Report unavailable" body="The selected report month could not be loaded." />
        ) : (
          <ReportDetailContent
            currency={currency}
            monthLabel={monthLabel(monthKey)}
            report={report}
          />
        )}
      </main>
    </div>
  );
}
