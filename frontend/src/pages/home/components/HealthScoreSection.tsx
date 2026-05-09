import { useState, useEffect } from "react";
import Card from "@/components/base/Card";
import { healthScore } from "@/mocks/dashboard";

export default function HealthScoreSection() {
  const [animatedScore, setAnimatedScore] = useState(0);
  const targetScore = healthScore.score;

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * targetScore));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [targetScore]);

  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (animatedScore / 1000) * circumference;

  return (
    <Card variant="hero" className="p-6 md:p-8 lg:p-10 overflow-hidden relative h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-[#1E40AF] to-[#172554]" />
      <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12">
        <div className="flex-shrink-0 flex flex-col items-center">
          <span className="text-2xs uppercase tracking-widest text-white/50 font-medium mb-2">
            Financial Health
          </span>
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="url(#healthGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#16A34A" />
                  <stop offset="100%" stopColor="#22C55E" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl md:text-5xl font-bold text-white tabular-nums">
                {animatedScore}
              </span>
              <span className="text-sm text-white/60 mt-1">/ 1000</span>
            </div>
          </div>
          <span className="text-base text-white/80 mt-3 font-medium">
            {healthScore.status}
          </span>
        </div>

        <div className="flex-1 w-full space-y-5">
          {healthScore.metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-medium">{metric.label}</span>
                <span className="text-white font-semibold tabular-nums">
                  {metric.value}
                  {metric.label === "Emergency Fund" ? " mo" : "%"}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${(metric.value / metric.target) * 100}%`,
                    backgroundColor:
                      metric.color === "positive"
                        ? "#16A34A"
                        : metric.color === "warning"
                          ? "#D97706"
                          : "#DC2626",
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xs text-white/40">Target: {metric.target}{metric.label === "Emergency Fund" ? " mo" : "%"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}