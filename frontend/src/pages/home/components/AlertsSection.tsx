import Card from "@/components/base/Card";
import { spendingAlerts } from "@/mocks/dashboard";

const alertStyles = {
  overspending: { border: "border-l-negative", bg: "bg-negative-light", iconColor: "text-negative" },
  unusual: { border: "border-l-negative", bg: "bg-negative-light", iconColor: "text-negative" },
  approaching: { border: "border-l-warning", bg: "bg-warning-light", iconColor: "text-warning" },
};

export default function AlertsSection() {
  return (
    <Card variant="alert" className="p-5 md:p-6 h-full">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 flex items-center justify-center">
          <i className="ri-alert-line text-warning text-lg" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text">Spending Alerts</h2>
          <p className="text-2xs text-text-secondary">Updated 2h ago</p>
        </div>
      </div>

      <div className="space-y-3">
        {spendingAlerts.map((alert) => {
          const pct = Math.round((alert.used / alert.budget) * 100);
          const style = alertStyles[alert.type];
          return (
            <div
              key={alert.id}
              className={`bg-white rounded-lg p-4 border-l-4 ${style.border} shadow-card hover:shadow-card-hover transition-shadow cursor-pointer`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 flex items-center justify-center ${style.iconColor}`}>
                  <i className={`${alert.icon} text-sm`} />
                </div>
                <span className="text-sm font-semibold text-text">{alert.category}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                {alert.message}
              </p>
              <div className="space-y-1.5">
                <div className="h-2 bg-bg-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor:
                        pct > 100 ? "#DC2626" : pct > 80 ? "#D97706" : "#16A34A",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-text-secondary">
                    ${alert.used} of ${alert.budget}
                  </span>
                  <span
                    className="text-2xs font-semibold tabular-nums"
                    style={{
                      color: pct > 100 ? "#DC2626" : pct > 80 ? "#D97706" : "#16A34A",
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}