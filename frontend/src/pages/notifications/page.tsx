import { useMemo } from "react";
import { Link } from "react-router-dom";
import Badge from "@/components/base/Badge";
import Card from "@/components/base/Card";
import Navbar from "@/components/feature/Navbar";
import { EmptyState, LoadingState } from "@/components/feature/PageState";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { formatCurrency, formatShortDate } from "@/lib/finance";
import { recurringFrequencyLabel } from "@/utils/recurring";

export default function Notifications() {
  const { balance, loading, pendingRecurringItems } = useFinanceData();
  const currency = balance?.currency_code || "PHP";

  const notifications = useMemo(
    () =>
      [...pendingRecurringItems]
        .sort((left, right) =>
          String(left.next_due_date || "").localeCompare(String(right.next_due_date || ""))
        )
        .map((item) => ({
          id: `recurring-due:${item.id}`,
          dueDate: item.next_due_date,
          href: "/recurring?tab=due_now",
          title: buildRecurringNotificationTitle(item),
          description: buildRecurringNotificationDescription(item),
          amount: Number(item.amount || 0),
          type: item.type,
        })),
    [pendingRecurringItems]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="px-4 pb-12 pt-20 md:px-8">
          <LoadingState label="Loading notifications..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-12 pt-20 md:px-8">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text">Notifications</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {notifications.length} due notification{notifications.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            body="Due recurring items will appear here."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Link key={notification.id} to={notification.href} className="block">
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning-light text-warning-dark">
                      <i className="ri-alarm-warning-line text-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text">{notification.title}</p>
                        <Badge variant="warning">Due now</Badge>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {notification.description}
                      </p>
                      <p className="mt-2 text-xs text-text-secondary">
                        Due {formatShortDate(notification.dueDate)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-text">
                        {formatCurrency(notification.amount, currency)}
                      </p>
                      <p className="mt-1 text-xs capitalize text-text-secondary">
                        {notification.type}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function buildRecurringNotificationTitle(item: {
  type: string;
  category?: string | null;
  expense_category_name?: string | null;
  income_category_name?: string | null;
  from_account_name?: string | null;
  to_account_name?: string | null;
}) {
  if (item.type === "transfer") {
    return item.from_account_name && item.to_account_name
      ? `${item.from_account_name} to ${item.to_account_name} is due`
      : "Transfer is due";
  }

  const label =
    item.type === "income"
      ? item.income_category_name || item.category || "Income"
      : item.expense_category_name || item.category || "Expense";

  return `${label} is due`;
}

function buildRecurringNotificationDescription(item: {
  type: string;
  frequency: string;
  category?: string | null;
  expense_category_name?: string | null;
  income_category_name?: string | null;
}) {
  const label =
    item.type === "income"
      ? item.income_category_name || item.category || "Income"
      : item.type === "expense"
        ? item.expense_category_name || item.category || "Expense"
        : "Transfer";

  return `${label} recurring item is due now • ${recurringFrequencyLabel(item.frequency)}`;
}
