import { useState } from "react";
import Card from "@/components/base/Card";
import { accounts } from "@/mocks/dashboard";

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toLocaleString()}`;
}

export default function AccountsSection() {
  const [expanded, setExpanded] = useState(false);

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);
  const visibleAccounts = expanded ? accounts : accounts.slice(0, 3);
  const positiveAccounts = visibleAccounts.filter((a) => a.balance >= 0);
  const debtAccounts = visibleAccounts.filter((a) => a.balance < 0);

  return (
    <Card className="p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-text">Accounts</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {accounts.length} accounts ·{" "}
            <span className="font-medium text-text">{formatCurrency(total)}</span> total
          </p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {/* Positive accounts */}
        {positiveAccounts.length > 0 && (
          <div className="space-y-2">
            {positiveAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 py-2.5 group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: account.color + "20" }}
                >
                  <i
                    className={`${account.icon} text-sm`}
                    style={{ color: account.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {account.name}
                  </p>
                  <p className="text-2xs text-text-secondary">
                    {account.institution} · ****{account.last4}
                  </p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-sm font-semibold text-text tabular-nums">
                    {formatCurrency(account.balance)}
                  </span>
                  {account.trend !== 0 && (
                    <span
                      className={`text-2xs font-medium ${
                        account.trend > 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {account.trend > 0 ? "+" : ""}
                      {formatCurrency(account.trend)} this mo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Separator if both types exist */}
        {positiveAccounts.length > 0 && debtAccounts.length > 0 && (
          <div className="h-px bg-bg-subtle" />
        )}

        {/* Debt accounts */}
        {debtAccounts.length > 0 && (
          <div className="space-y-2">
            {debtAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 py-2.5 group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: account.color + "20" }}
                >
                  <i
                    className={`${account.icon} text-sm`}
                    style={{ color: account.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {account.name}
                  </p>
                  <p className="text-2xs text-text-secondary">
                    {account.institution} · ****{account.last4}
                  </p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-sm font-semibold text-negative tabular-nums">
                    {formatCurrency(account.balance)}
                  </span>
                  {account.trend !== 0 && (
                    <span
                      className={`text-2xs font-medium ${
                        account.trend > 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {account.trend > 0 ? "+" : ""}
                      {formatCurrency(account.trend)} this mo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expand / Collapse */}
      {accounts.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full py-2.5 text-xs font-medium text-text-secondary hover:text-text transition-colors flex items-center justify-center gap-1 border-t border-bg-subtle"
        >
          <i className={expanded ? "ri-arrow-up-s-line text-sm" : "ri-arrow-down-s-line text-sm"} />
          {expanded ? "Show less" : `Show ${accounts.length - 3} more`}
        </button>
      )}
    </Card>
  );
}
