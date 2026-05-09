import Card from "@/components/base/Card";
import Badge from "@/components/base/Badge";
import { upcomingBills } from "@/mocks/dashboard";

export default function BillsSection() {
  return (
    <Card className="p-5 md:p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-text">Upcoming Bills</h2>
          <p className="text-sm text-text-secondary mt-0.5">Next 7 days</p>
        </div>
        <a href="/recurring" className="text-sm text-accent font-medium hover:underline">
          View all
        </a>
      </div>

      <div className="space-y-0">
        {upcomingBills.slice(0, 5).map((bill, idx) => (
          <div key={bill.id}>
            <div className="flex items-center gap-3 py-3 group cursor-pointer hover:bg-bg-subtle -mx-2 px-2 rounded-lg transition-colors">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: bill.color }}
              >
                <i className={`${bill.icon} text-white text-sm`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{bill.name}</p>
                <p className="text-2xs text-text-secondary mt-0.5">Due {bill.dueDate}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-semibold text-text tabular-nums">
                  ${bill.amount.toFixed(2)}
                </span>
                {bill.autoPay && <Badge variant="positive" size="sm">Auto-pay</Badge>}
              </div>
            </div>
            {idx < 4 && <div className="h-px bg-bg-subtle" />}
          </div>
        ))}
      </div>
    </Card>
  );
}