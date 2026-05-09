import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { formatCurrency } from "@/lib/finance";

export function AutomationContent({ showHeader = true }: { showHeader?: boolean }) {
  const { balance, pendingRecurringItems, recurringItems, scopedTransactions } = useFinanceData();
  const currency = balance?.currency_code || "PHP";
  const transferRules = recurringItems.filter((item) => item.type === "transfer").length;
  const subscriptionRules = recurringItems.filter((item) => item.type === "expense").length;
  const autoDetectedTransactions = scopedTransactions.filter(
    (transaction) => transaction.source_type !== "transaction"
  ).length;

  return (
    <>
      {showHeader ? (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text">Automation Setup</h1>
          <p className="mt-1 text-sm text-text-secondary">
            This redesign keeps the current backend intact, so automation is represented through your existing recurring and imported records.
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text">Automation</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Existing recurring rules and imported records currently power automation behavior.
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Recurring Rules" value={String(recurringItems.length)} />
        <Metric label="Pending Actions" value={String(pendingRecurringItems.length)} />
        <Metric label="Imported Records" value={String(autoDetectedTransactions)} positive />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold text-text">Existing Signals</h2>
          <div className="space-y-3 text-sm text-text-secondary">
            <p>{subscriptionRules} recurring expense patterns currently act as bill reminders.</p>
            <p>{transferRules} recurring transfer rules already automate entity-to-entity movement planning.</p>
            <p>Safe-to-spend currently accounts for {formatCurrency(balance?.upcoming_recurring_expense_total || 0, currency)} of upcoming recurring expenses.</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold text-text">Backend Reuse</h2>
          <div className="space-y-3 text-sm text-text-secondary">
            <p>No new database tables were introduced for this redesign.</p>
            <p>The page is intentionally informational because the current backend does not expose source connectors or rule management endpoints.</p>
            <p>Recurring confirmations and projection previews continue to use the existing routes unchanged.</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold text-text">Recommended Next Backend Additions</h2>
          <div className="space-y-3 text-sm text-text-secondary">
            <p>Connector registry for email, bank, and card imports.</p>
            <p>User-defined categorization rules with confidence tracking.</p>
            <p>Sync history and audit logs for automated ingestion jobs.</p>
          </div>
        </Card>
      </div>
    </>
  );
}

export default function Automation() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <AutomationContent />
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <Card className="p-4 text-center">
      <p className="text-2xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${positive ? "text-positive" : "text-text"}`}>{value}</p>
    </Card>
  );
}
