import Card from "@/components/base/Card";
import { aiInsights } from "@/mocks/dashboard";

const insightColors = {
  positive: { bg: "bg-positive-light", icon: "text-positive" },
  warning: { bg: "bg-warning-light", icon: "text-warning" },
  accent: { bg: "bg-accent-light", icon: "text-accent" },
};

export default function AIInsightsSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {aiInsights.map((insight) => {
        const color = insightColors[insight.color];
        return (
          <Card key={insight.id} className={`p-5 ${color.bg}`}>
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-7 h-7 flex items-center justify-center ${color.icon}`}>
                <i className={`${insight.icon} text-lg`} />
              </div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-secondary mt-1">
                AI Insight
              </span>
            </div>
            <h3 className="text-base font-semibold text-text mb-2">{insight.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              {insight.description}
            </p>
            <button className="text-sm font-medium text-accent hover:text-accent-dark transition-colors whitespace-nowrap">
              {insight.action} →
            </button>
          </Card>
        );
      })}
    </div>
  );
}