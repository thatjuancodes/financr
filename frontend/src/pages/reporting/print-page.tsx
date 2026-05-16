import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api";
import { LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { ALL_ENTITIES_ID } from "@/lib/finance";
import { monthLabel } from "@/utils/format";
import ReportDetailContent from "./report-detail-content";
import type { MonthlyReportRecord } from "./shared";

export default function ReportPrintPage() {
  const { monthKey = "" } = useParams();
  const { balance, loading, selectedEntityId } = useFinanceData();
  const scopedEntityId = selectedEntityId !== ALL_ENTITIES_ID ? selectedEntityId : undefined;
  const currency = balance?.currency_code || "PHP";

  const [reportDetailLoading, setReportDetailLoading] = useState(true);
  const [reportError, setReportError] = useState("");
  const [reportDetail, setReportDetail] = useState<MonthlyReportRecord | null>(null);

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

  useEffect(() => {
    if (loading || reportDetailLoading || !reportDetail?.report) {
      return;
    }

    const previousTitle = document.title;
    document.title = `Steward Report ${monthKey}`;
    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
      document.title = previousTitle;
    };
  }, [loading, monthKey, reportDetail, reportDetailLoading]);

  if (loading || reportDetailLoading) {
    return (
      <main className="min-h-screen bg-white px-6 py-8">
        <LoadingState label="Preparing report for print..." />
      </main>
    );
  }

  if (!monthKey || !reportDetail?.report) {
    return (
      <main className="min-h-screen bg-white px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-text">Report unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {reportError || "The selected report could not be prepared for printing."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <ReportDetailContent
          currency={currency}
          monthLabel={monthLabel(monthKey)}
          report={reportDetail.report}
        />
      </div>
    </main>
  );
}
