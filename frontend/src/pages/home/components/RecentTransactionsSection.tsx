import Card from "@/components/base/Card";
import Badge from "@/components/base/Badge";
import { recentTransactions } from "@/mocks/dashboard";

export default function RecentTransactionsSection() {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-text">Recent Transactions</h2>
          <p className="text-sm text-text-secondary mt-0.5">Last 5 transactions</p>
        </div>
        <a href="/transactions" className="text-sm text-accent font-medium hover:underline">
          View all
        </a>
      </div>

      <div className="space-y-0">
        {recentTransactions.map((tx, idx) => (
          <div key={tx.id}>
            <div className="flex items-center gap-3 py-3 group cursor-pointer hover:bg-bg-subtle -mx-2 px-2 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-lg bg-bg-subtle flex items-center justify-center flex-shrink-0">
                <i className={`${tx.icon} text-text-secondary text-sm`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text truncate">{tx.name}</p>
                  {tx.confidence === "medium" && (
                    <Badge variant="warning" size="sm">Review</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xs text-text-secondary">{tx.date}</span>
                  <span className="text-2xs text-text-muted">·</span>
                  <span className="text-2xs text-text-secondary">{tx.category}</span>
                </div>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                  tx.amount > 0 ? "text-positive" : "text-text"
                }`}
              >
                {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
            {idx < recentTransactions.length - 1 && <div className="h-px bg-bg-subtle" />}
          </div>
        ))}
      </div>
    </Card>
  );
}