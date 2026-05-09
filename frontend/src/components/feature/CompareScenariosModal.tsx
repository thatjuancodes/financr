import { useState } from "react";
import { createPortal } from "react-dom";
import Card from "@/components/base/Card";
import type { ScenarioSet } from "@/hooks/useScenarioSets";

interface Scenario {
  id: string;
  name: string;
  type: "income" | "expense";
  impactMonthly: number;
  impact12Month?: number;
  upfrontCost?: number;
  amount: number;
  frequency: "one-time" | "monthly";
  category: string;
}

interface CompareScenariosModalProps {
  open: boolean;
  onClose: () => void;
  pageType: "budget" | "projection";
  savedSets: ScenarioSet[];
  allScenarios: Scenario[];
  currentActiveIds: string[];
  onSave: (name: string, description: string) => void;
  onDelete: (id: string) => void;
  onApply: (scenarioIds: string[]) => void;
  onCompareToggle: (id: string) => void;
  comparingIds: string[];
  onClearCompare: () => void;
}

function formatCurrency(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
  return `$${abs.toFixed(0)}`;
}

function computeSetStats(
  set: ScenarioSet,
  allScenarios: Scenario[]
) {
  const active = allScenarios.filter((s) => set.scenarioIds.includes(s.id));
  const monthlyImpact = active.reduce((sum, s) => sum + s.impactMonthly, 0);
  const twelveMonthImpact = active.reduce((sum, s) => {
    if (s.impact12Month) return sum + s.impact12Month;
    if (s.frequency === "monthly") return sum + s.impactMonthly * 12;
    return sum;
  }, 0);
  const upfront = active.reduce((sum, s) => sum + (s.upfrontCost || 0), 0);
  const oneTime = active
    .filter((s) => s.frequency === "one-time")
    .reduce((sum, s) => sum + s.amount, 0);
  return { monthlyImpact, twelveMonthImpact, upfront, oneTime, count: active.length };
}

export default function CompareScenariosModal({
  open,
  onClose,
  pageType,
  savedSets,
  allScenarios,
  currentActiveIds,
  onSave,
  onDelete,
  onApply,
  onCompareToggle,
  comparingIds,
  onClearCompare,
}: CompareScenariosModalProps) {
  const [tab, setTab] = useState<"sets" | "compare">("sets");
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");

  if (!open) return null;

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSave(saveName.trim(), saveDesc.trim());
    setSaveMode(false);
    setSaveName("");
    setSaveDesc("");
  };

  const comparingSets = savedSets.filter((s) => comparingIds.includes(s.id));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-subtle">
          <div>
            <h2 className="text-lg font-semibold text-text">
              Scenario Sets
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Save combinations and compare outcomes
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-subtle transition-colors"
          >
            <i className="ri-close-line text-text-secondary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2">
          <button
            onClick={() => setTab("sets")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === "sets"
                ? "bg-accent-light text-accent-dark"
                : "text-text-secondary hover:text-text"
            }`}
          >
            Your Sets ({savedSets.length})
          </button>
          <button
            onClick={() => setTab("compare")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === "compare"
                ? "bg-accent-light text-accent-dark"
                : "text-text-secondary hover:text-text"
            }`}
          >
            Compare ({comparingSets.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {tab === "sets" && (
            <div className="space-y-3">
              {/* Save Current */}
              {!saveMode ? (
                <button
                  onClick={() => setSaveMode(true)}
                  className="w-full flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-bg-subtle hover:border-accent/30 hover:bg-accent-light/30 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                    <i className="ri-add-line text-accent text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">
                      Save current selection
                    </p>
                    <p className="text-2xs text-text-secondary mt-0.5">
                      {currentActiveIds.length} active scenario
                      {currentActiveIds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              ) : (
                <Card className="p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-text mb-1 block">
                        Name
                      </label>
                      <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="e.g., Home Gym Plan"
                        className="w-full px-3 py-2 rounded-lg border border-bg-subtle bg-bg text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text mb-1 block">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        value={saveDesc}
                        onChange={(e) => setSaveDesc(e.target.value)}
                        placeholder="Brief note about this scenario set"
                        className="w-full px-3 py-2 rounded-lg border border-bg-subtle bg-bg text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        disabled={!saveName.trim()}
                        className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        Save Set
                      </button>
                      <button
                        onClick={() => {
                          setSaveMode(false);
                          setSaveName("");
                          setSaveDesc("");
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Saved Sets List */}
              {savedSets.length === 0 && !saveMode && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-bg-subtle flex items-center justify-center mx-auto mb-3">
                    <i className="ri-stack-line text-text-muted text-lg" />
                  </div>
                  <p className="text-sm text-text-secondary">
                    No saved sets yet
                  </p>
                  <p className="text-2xs text-text-muted mt-1">
                    Toggle scenarios and save your first combination
                  </p>
                </div>
              )}

              {savedSets.map((set) => {
                const stats = computeSetStats(set, allScenarios);
                const isCompared = comparingIds.includes(set.id);
                return (
                  <Card
                    key={set.id}
                    className={`p-4 transition-all ${
                      isCompared ? "ring-2 ring-accent/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        onClick={() => onCompareToggle(set.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer transition-colors ${
                          isCompared
                            ? "bg-accent border-accent"
                            : "border-text-muted bg-transparent hover:border-accent/50"
                        }`}
                      >
                        {isCompared && (
                          <i className="ri-check-line text-white text-xs" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-text truncate">
                            {set.name}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => onApply(set.scenarioIds)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-accent-light text-accent-dark hover:bg-accent/10 transition-colors whitespace-nowrap"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => onDelete(set.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-negative-light text-text-secondary hover:text-negative transition-colors"
                            >
                              <i className="ri-delete-bin-line text-xs" />
                            </button>
                          </div>
                        </div>
                        {set.description && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {set.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                          <span className="text-2xs text-text-secondary">
                            {stats.count} scenario{stats.count !== 1 ? "s" : ""}
                          </span>
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              stats.monthlyImpact >= 0
                                ? "text-positive"
                                : "text-negative"
                            }`}
                          >
                            {stats.monthlyImpact >= 0 ? "+" : "-"}
                            {formatCurrency(stats.monthlyImpact)}
                            <span className="text-2xs font-normal text-text-secondary ml-0.5">
                              /mo
                            </span>
                          </span>
                          {stats.upfront > 0 && (
                            <span className="text-xs font-semibold text-negative tabular-nums">
                              -{formatCurrency(stats.upfront)}
                              <span className="text-2xs font-normal text-text-secondary ml-0.5">
                                upfront
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {set.scenarioIds
                            .map((sid) => allScenarios.find((s) => s.id === sid))
                            .filter(Boolean)
                            .map((s) => (
                              <span
                                key={s!.id}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium ${
                                  s!.type === "income"
                                    ? "bg-positive-light text-positive-dark"
                                    : "bg-negative-light text-negative-dark"
                                }`}
                              >
                                {s!.name}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "compare" && (
            <div className="space-y-4">
              {comparingSets.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-bg-subtle flex items-center justify-center mx-auto mb-3">
                    <i className="ri-scales-3-line text-text-muted text-lg" />
                  </div>
                  <p className="text-sm text-text-secondary">
                    Select 2 or more sets to compare
                  </p>
                  <p className="text-2xs text-text-muted mt-1">
                    Go to "Your Sets" and check the boxes next to sets you want
                    to compare
                  </p>
                </div>
              )}

              {comparingSets.length > 0 && (
                <>
                  {/* Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-bg-subtle">
                          <th className="text-left py-2 px-2 text-xs font-medium text-text-secondary whitespace-nowrap">
                            Metric
                          </th>
                          {comparingSets.map((set) => {
                            const stats = computeSetStats(set, allScenarios);
                            return (
                              <th
                                key={set.id}
                                className="text-left py-2 px-2 min-w-[140px]"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-text">
                                    {set.name}
                                  </span>
                                  <button
                                    onClick={() => onApply(set.scenarioIds)}
                                    className="px-2 py-0.5 rounded text-2xs font-medium bg-accent-light text-accent-dark hover:bg-accent/10 transition-colors whitespace-nowrap"
                                  >
                                    Apply
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-2xs text-text-secondary">
                                    {stats.count} scenarios
                                  </span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            label: "Monthly Impact",
                            key: "monthlyImpact",
                            format: (v: number) =>
                              `${v >= 0 ? "+" : "-"}${formatCurrency(v)}/mo`,
                            color: (v: number) =>
                              v >= 0 ? "text-positive" : "text-negative",
                          },
                          {
                            label: "12-Month Impact",
                            key: "twelveMonthImpact",
                            format: (v: number) =>
                              `${v >= 0 ? "+" : "-"}${formatCurrency(v)}`,
                            color: (v: number) =>
                              v >= 0 ? "text-positive" : "text-negative",
                          },
                          {
                            label: "Upfront Cost",
                            key: "upfront",
                            format: (v: number) =>
                              v > 0 ? `-${formatCurrency(v)}` : "$0",
                            color: () => "text-negative",
                          },
                          {
                            label: "One-Time Expense",
                            key: "oneTime",
                            format: (v: number) =>
                              v > 0 ? `-${formatCurrency(v)}` : "$0",
                            color: () => "text-negative",
                          },
                        ].map((row) => (
                          <tr
                            key={row.key}
                            className="border-b border-bg-subtle/50"
                          >
                            <td className="py-2.5 px-2 text-xs font-medium text-text-secondary whitespace-nowrap">
                              {row.label}
                            </td>
                            {comparingSets.map((set) => {
                              const stats = computeSetStats(set, allScenarios);
                              const value = stats[row.key as keyof typeof stats] as number;
                              return (
                                <td
                                  key={set.id}
                                  className="py-2.5 px-2 text-sm font-semibold tabular-nums whitespace-nowrap"
                                >
                                  <span className={row.color(value)}>
                                    {row.format(value)}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Scenario Presence Comparison */}
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-text mb-2">
                      Scenario Breakdown
                    </h3>
                    <div className="space-y-1">
                      {allScenarios.map((scenario) => {
                        const presentIn = comparingSets.filter((set) =>
                          set.scenarioIds.includes(scenario.id)
                        );
                        return (
                          <div
                            key={scenario.id}
                            className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-bg-subtle/50"
                          >
                            <span className="text-xs text-text flex-1 min-w-0 truncate">
                              {scenario.name}
                            </span>
                            {comparingSets.map((set) => (
                              <div
                                key={set.id}
                                className="w-20 text-center"
                              >
                                {set.scenarioIds.includes(scenario.id) ? (
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${
                                      scenario.type === "income"
                                        ? "bg-positive-light text-positive-dark"
                                        : "bg-negative-light text-negative-dark"
                                    }`}
                                  >
                                    {scenario.type === "income" ? "+" : "-"}
                                    {scenario.frequency === "monthly"
                                      ? `$${scenario.amount}/mo`
                                      : `$${scenario.amount}`}
                                  </span>
                                ) : (
                                  <span className="text-2xs text-text-muted">
                                    —
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={onClearCompare}
                    className="w-full py-2.5 rounded-lg border border-bg-subtle text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors"
                  >
                    Clear Comparison
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}