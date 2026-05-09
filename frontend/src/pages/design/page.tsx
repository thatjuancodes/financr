import { useState } from "react";
import Card from "@/components/base/Card";
import Badge from "@/components/base/Badge";

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {desc && <p className="text-sm text-text-secondary mt-1">{desc}</p>}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function DesignSystem() {
  const [toggleOn, setToggleOn] = useState(true);
  const [toggleOff, setToggleOff] = useState(false);
  const [inputVal, setInputVal] = useState("Sample text");
  const [selectVal, setSelectVal] = useState("option1");

  const primaryScale = [
    { name: "primary-50", hex: "#EFF6FF", text: "text-primary-900" },
    { name: "primary-100", hex: "#DBEAFE", text: "text-primary-900" },
    { name: "primary-200", hex: "#BFDBFE", text: "text-primary-900" },
    { name: "primary-300", hex: "#93C5FD", text: "text-primary-900" },
    { name: "primary-400", hex: "#60A5FA", text: "text-primary-900" },
    { name: "primary-500", hex: "#2563EB", text: "text-white" },
    { name: "primary-600", hex: "#1D4ED8", text: "text-white" },
    { name: "primary-700", hex: "#1E40AF", text: "text-white" },
    { name: "primary-800", hex: "#1E3A8A", text: "text-white" },
    { name: "primary-900", hex: "#172554", text: "text-white" },
  ];

  const grayScale = [
    { name: "gray-50", hex: "#F8FAFC", text: "text-gray-900" },
    { name: "gray-100", hex: "#F1F5F9", text: "text-gray-900" },
    { name: "gray-200", hex: "#E2E8F0", text: "text-gray-900" },
    { name: "gray-300", hex: "#CBD5E1", text: "text-gray-900" },
    { name: "gray-400", hex: "#94A3B8", text: "text-white" },
    { name: "gray-500", hex: "#64748B", text: "text-white" },
    { name: "gray-600", hex: "#475569", text: "text-white" },
    { name: "gray-700", hex: "#334155", text: "text-white" },
    { name: "gray-800", hex: "#1E293B", text: "text-white" },
    { name: "gray-900", hex: "#0F172A", text: "text-white" },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Simple top bar for this page */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 h-14 flex items-center gap-3 sticky top-0 z-40">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <i className="ri-palette-line text-white text-sm" />
        </div>
        <span className="font-semibold text-text">Design System</span>
        <span className="text-2xs text-text-secondary ml-2 hidden sm:inline">Reference for frontend agents</span>
      </div>

      <main className="px-4 md:px-8 py-8">
        {/* === COLOR PALETTE === */}
        <SectionTitle title="Color Palette" desc="Finance / Wealth app color system — Blue brand, teal wealth accent" />
        <SubSection title="Primary Brand (Blue)">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {primaryScale.map((c) => (
              <div key={c.name} className={`bg-${c.name} ${c.text} rounded-lg p-3 shadow-card text-center`}>
                <p className="text-xs font-semibold">{c.name.split("-")[1]}</p>
                <p className="text-2xs opacity-70 mt-0.5">{c.hex}</p>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Neutral Scale (Gray)">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {grayScale.map((c) => (
              <div key={c.name} className={`bg-${c.name} ${c.text} rounded-lg p-3 shadow-card text-center`}>
                <p className="text-xs font-semibold">{c.name.split("-")[1]}</p>
                <p className="text-2xs opacity-70 mt-0.5">{c.hex}</p>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Semantic Colors">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "success", bg: "bg-success-500", text: "text-white", label: "Success" },
              { name: "success-light", bg: "bg-success-50", text: "text-success-700", label: "Success Light" },
              { name: "warning", bg: "bg-warning-500", text: "text-white", label: "Warning" },
              { name: "warning-light", bg: "bg-warning-50", text: "text-warning-600", label: "Warning Light" },
              { name: "error", bg: "bg-error-500", text: "text-white", label: "Error" },
              { name: "error-light", bg: "bg-error-50", text: "text-error-700", label: "Error Light" },
              { name: "info", bg: "bg-info-500", text: "text-white", label: "Info" },
              { name: "info-light", bg: "bg-info-50", text: "text-info-600", label: "Info Light" },
            ].map((c) => (
              <div key={c.name} className={`${c.bg} ${c.text} rounded-lg p-4 shadow-card`}>
                <p className="text-xs font-semibold">{c.label}</p>
                <p className="text-2xs opacity-70 mt-0.5">{c.name}</p>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Wealth Accent (Teal)">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: "wealth-50", bg: "bg-wealth-50", text: "text-wealth-700", label: "Wealth 50" },
              { name: "wealth-500", bg: "bg-wealth-500", text: "text-white", label: "Wealth 500" },
              { name: "wealth-700", bg: "bg-wealth-700", text: "text-white", label: "Wealth 700" },
            ].map((c) => (
              <div key={c.name} className={`${c.bg} ${c.text} rounded-lg p-4 shadow-card`}>
                <p className="text-xs font-semibold">{c.label}</p>
                <p className="text-2xs opacity-70 mt-0.5">{c.name}</p>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Finance Semantic Tokens">
          <div className="flex flex-wrap gap-3">
            {[
              { name: "income", hex: "#22C55E", label: "Income" },
              { name: "expense", hex: "#EF4444", label: "Expense" },
              { name: "savings", hex: "#14B8A6", label: "Savings" },
              { name: "investment", hex: "#8B5CF6", label: "Investment" },
              { name: "debt", hex: "#F97316", label: "Debt" },
              { name: "netWorthPositive", hex: "#16A34A", label: "Net Worth +" },
              { name: "netWorthNegative", hex: "#DC2626", label: "Net Worth -" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-2 bg-white rounded-lg p-3 shadow-card">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: c.hex }} />
                <div>
                  <p className="text-xs font-medium text-text">{c.label}</p>
                  <p className="text-2xs text-text-secondary font-mono">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Chart Colors">
          <div className="flex flex-wrap gap-3">
            {[
              { name: "chart-income", hex: "#22C55E" },
              { name: "chart-expense", hex: "#EF4444" },
              { name: "chart-savings", hex: "#14B8A6" },
              { name: "chart-net", hex: "#1E40AF" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-2 bg-white rounded-lg p-3 shadow-card">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: c.hex }} />
                <div>
                  <p className="text-xs font-medium text-text">{c.name}</p>
                  <p className="text-2xs text-text-secondary font-mono">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="UI Surfaces">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "bg", class: "bg-bg", text: "text-text" },
              { name: "bg-card", class: "bg-bg-card text-text", text: "" },
              { name: "bg-hero", class: "bg-bg-hero text-white", text: "" },
              { name: "bg-subtle", class: "bg-bg-subtle text-text", text: "" },
            ].map((c) => (
              <div key={c.name} className={`${c.class} ${c.text} rounded-lg p-4 shadow-card`}>
                <p className="text-xs font-semibold">{c.name}</p>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Text Colors">
          <div className="space-y-2">
            <p className="text-text text-sm">text — Primary body text</p>
            <p className="text-text-secondary text-sm">text-secondary — Descriptions, labels</p>
            <p className="text-text-muted text-sm">text-muted — Hints, dividers</p>
            <p className="bg-bg-hero p-2 rounded text-text-inverse text-sm">text-inverse — White on dark</p>
            <p className="text-text-link text-sm font-medium">text-link — Clickable links</p>
          </div>
        </SubSection>
        <SubSection title="Legacy Semantic Aliases">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "accent", bg: "bg-accent", text: "text-white", label: "Accent" },
              { name: "accent-light", bg: "bg-accent-light", text: "text-accent-dark", label: "Accent Light" },
              { name: "positive", bg: "bg-positive", text: "text-white", label: "Positive" },
              { name: "positive-light", bg: "bg-positive-light", text: "text-positive-dark", label: "Positive Light" },
              { name: "negative", bg: "bg-negative", text: "text-white", label: "Negative" },
              { name: "negative-light", bg: "bg-negative-light", text: "text-negative-dark", label: "Negative Light" },
              { name: "warning", bg: "bg-warning", text: "text-white", label: "Warning" },
              { name: "warning-light", bg: "bg-warning-light", text: "text-warning-dark", label: "Warning Light" },
            ].map((c) => (
              <div key={c.name} className={`${c.bg} ${c.text} rounded-lg p-4 shadow-card`}>
                <p className="text-xs font-semibold">{c.label}</p>
                <p className="text-2xs opacity-70 mt-0.5">{c.name}</p>
              </div>
            ))}
          </div>
        </SubSection>

        {/* === TYPOGRAPHY === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Typography" desc="Font scale from tailwind.config.ts" />
        <SubSection title="Headings">
          <div className="space-y-3">
            <p className="text-5xl font-bold text-text">5xl — 48/56px Hero</p>
            <p className="text-4xl font-bold text-text">4xl — 32/40px Large</p>
            <p className="text-3xl font-semibold text-text">3xl — 24/32px Section</p>
            <p className="text-2xl font-semibold text-text">2xl — 20/28px Page Title</p>
            <p className="text-xl font-semibold text-text">xl — 18/26px Card Title</p>
          </div>
        </SubSection>
        <SubSection title="Body">
          <div className="space-y-3">
            <p className="text-lg text-text">lg — 16/24px Large body</p>
            <p className="text-base text-text">base — 14/20px Default body</p>
            <p className="text-sm text-text">sm — 13/18px Small body</p>
            <p className="text-xs text-text">xs — 12/16px Metadata</p>
            <p className="text-2xs text-text">2xs — 10/14px Labels, badges</p>
          </div>
        </SubSection>

        {/* === BUTTONS === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Buttons" desc="All button styles used across the app" />
        <SubSection title="Primary CTA">
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap">
              Primary Button
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600 transition-colors whitespace-nowrap">
              Small Primary
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg opacity-40 cursor-not-allowed whitespace-nowrap">
              Disabled
            </button>
          </div>
        </SubSection>
        <SubSection title="Secondary / Ghost">
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 text-sm font-medium text-primary bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors whitespace-nowrap">
              Secondary Button
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-text-secondary bg-bg-subtle rounded-md hover:text-text hover:bg-gray-200 transition-colors whitespace-nowrap">
              Ghost Button
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary-700 transition-colors whitespace-nowrap">
              Text Link
            </button>
          </div>
        </SubSection>
        <SubSection title="Danger">
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 text-sm font-medium text-white bg-error rounded-lg hover:bg-error-600 transition-colors whitespace-nowrap">
              Delete / Reset
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-error bg-error-50 rounded-md hover:bg-error-100 transition-colors whitespace-nowrap">
              Soft Delete
            </button>
          </div>
        </SubSection>
        <SubSection title="Pill / Chip">
          <div className="flex flex-wrap gap-2">
            <button className="px-2.5 py-1 rounded-full text-2xs font-medium bg-primary text-white transition-all whitespace-nowrap">
              Active Chip
            </button>
            <button className="px-2.5 py-1 rounded-full text-2xs font-medium bg-bg-subtle text-text-secondary hover:text-text transition-all whitespace-nowrap">
              Inactive Chip
            </button>
            <span className="px-2.5 py-1 rounded-full text-2xs font-medium bg-primary-100 text-primary-700 whitespace-nowrap">
              Static Chip
            </span>
          </div>
        </SubSection>

        {/* === INPUTS === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Inputs & Controls" desc="Form elements and interactive controls" />
        <SubSection title="Text Input">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-2xs text-text-secondary uppercase tracking-wide mb-1.5">Default</p>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-bg-subtle rounded-lg border border-transparent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <p className="text-2xs text-text-secondary uppercase tracking-wide mb-1.5">With Icon</p>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <i className="ri-search-line text-text-muted text-sm" />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-bg-subtle rounded-lg border border-transparent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div>
              <p className="text-2xs text-text-secondary uppercase tracking-wide mb-1.5">Number</p>
              <input
                type="number"
                placeholder="0.00"
                className="w-full px-3 py-2.5 text-sm bg-bg-subtle rounded-lg border border-transparent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all tabular-nums"
              />
            </div>
            <div>
              <p className="text-2xs text-text-secondary uppercase tracking-wide mb-1.5">Disabled</p>
              <input
                type="text"
                value="Read only"
                disabled
                className="w-full px-3 py-2.5 text-sm bg-bg-subtle rounded-lg opacity-40 cursor-not-allowed"
              />
            </div>
          </div>
        </SubSection>
        <SubSection title="Select / Dropdown">
          <div className="flex gap-3 flex-wrap">
            <select
              value={selectVal}
              onChange={(e) => setSelectVal(e.target.value)}
              className="px-3 py-2.5 text-sm bg-bg-subtle rounded-lg border border-transparent focus:border-primary focus:outline-none"
            >
              <option value="option1">Option One</option>
              <option value="option2">Option Two</option>
              <option value="option3">Option Three</option>
            </select>
          </div>
        </SubSection>
        <SubSection title="Textarea">
          <textarea
            placeholder="Enter notes..."
            maxLength={500}
            className="w-full h-24 px-3 py-2 text-sm font-mono bg-bg-subtle rounded-lg border border-transparent focus:border-primary focus:outline-none resize-none"
          />
        </SubSection>
        <SubSection title="Toggle Switch">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setToggleOn(!toggleOn)}
              className={`relative w-11 h-6 rounded-full transition-colors ${toggleOn ? "bg-success" : "bg-bg-subtle"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  toggleOn ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-text">{toggleOn ? "On" : "Off"}</span>
            <button
              onClick={() => setToggleOff(!toggleOff)}
              className={`relative w-11 h-6 rounded-full transition-colors ${toggleOff ? "bg-success" : "bg-bg-subtle"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  toggleOff ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-text">{toggleOff ? "On" : "Off"}</span>
          </div>
        </SubSection>
        <SubSection title="Checkbox">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded border-2 bg-primary border-primary flex items-center justify-center">
              <i className="ri-check-line text-white text-xs" />
            </div>
            <span className="text-sm text-text">Checked</span>
            <div className="w-5 h-5 rounded border-2 border-text-muted bg-transparent" />
            <span className="text-sm text-text">Unchecked</span>
          </div>
        </SubSection>

        {/* === CARDS === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Cards" desc="Card variants and usage patterns" />
        <SubSection title="Default Card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5">
              <p className="text-sm font-semibold text-text">Default Card</p>
              <p className="text-sm text-text-secondary mt-1">Standard white card with subtle shadow. Used for content blocks, lists, and forms.</p>
            </Card>
            <Card className="p-5 hover:shadow-card-hover">
              <p className="text-sm font-semibold text-text">Hover Card</p>
              <p className="text-sm text-text-secondary mt-1">With hover:shadow-card-hover — used for interactive cards and list items.</p>
            </Card>
          </div>
        </SubSection>
        <SubSection title="Alert / Insight Cards">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="alert" className="p-5">
              <p className="text-sm font-semibold text-text">Alert Card</p>
              <p className="text-sm text-text-secondary mt-1">bg-warning-light — for attention blocks</p>
            </Card>
            <Card variant="insight" insightColor="positive" className="p-5">
              <p className="text-sm font-semibold text-text">Positive Insight</p>
              <p className="text-sm text-text-secondary mt-1">bg-positive-light — for savings, gains</p>
            </Card>
            <Card variant="insight" insightColor="negative" className="p-5">
              <p className="text-sm font-semibold text-text">Negative Insight</p>
              <p className="text-sm text-text-secondary mt-1">bg-negative-light — for overspending</p>
            </Card>
          </div>
        </SubSection>
        <SubSection title="Stat Card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Stat One", value: "$12,840", trend: "+2.3%" },
              { label: "Stat Two", value: "42", trend: "-1.2%" },
              { label: "Stat Three", value: "Housing", trend: "21%" },
              { label: "Stat Four", value: "12", trend: "$340/mo" },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-2xs text-text-secondary uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-bold text-text mt-1 tabular-nums">{s.value}</p>
                <p className="text-2xs text-text-secondary mt-1">{s.trend}</p>
              </Card>
            ))}
          </div>
        </SubSection>

        {/* === BADGES === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Badges" desc="Status and category labels" />
        <SubSection title="Variants">
          <div className="flex flex-wrap gap-2">
            <Badge variant="positive" size="sm">Positive</Badge>
            <Badge variant="negative" size="sm">Negative</Badge>
            <Badge variant="warning" size="sm">Warning</Badge>
            <Badge variant="accent" size="sm">Accent</Badge>
            <Badge variant="outline" size="sm">Outline</Badge>
          </div>
        </SubSection>
        <SubSection title="Sizes">
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent" size="sm">Small</Badge>
            <Badge variant="accent" size="md">Medium</Badge>
          </div>
        </SubSection>

        {/* === ICONS === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Icons" desc="Remix Icon classes used throughout the app" />
        <SubSection title="Navigation">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {[
              "ri-dashboard-3-line",
              "ri-exchange-dollar-line",
              "ri-repeat-line",
              "ri-bar-chart-box-line",
              "ri-calculator-line",
              "ri-line-chart-line",
              "ri-settings-3-line",
              "ri-search-line",
            ].map((icon) => (
              <div key={icon} className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg shadow-card">
                <i className={`${icon} text-text-secondary text-lg`} />
                <span className="text-2xs text-text-secondary text-center truncate w-full">{icon.split("-").slice(1, -1).join("-")}</span>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Actions">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {[
              "ri-add-line",
              "ri-delete-bin-line",
              "ri-pencil-line",
              "ri-check-line",
              "ri-close-line",
              "ri-download-2-line",
              "ri-upload-2-line",
              "ri-more-2-line",
            ].map((icon) => (
              <div key={icon} className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg shadow-card">
                <i className={`${icon} text-text-secondary text-lg`} />
                <span className="text-2xs text-text-secondary text-center truncate w-full">{icon.split("-").slice(1, -1).join("-")}</span>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Categories">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {[
              "ri-home-4-line",
              "ri-restaurant-line",
              "ri-car-line",
              "ri-shopping-bag-line",
              "ri-heart-pulse-line",
              "ri-gamepad-line",
              "ri-flight-takeoff-line",
              "ri-lightbulb-line",
              "ri-smartphone-line",
              "ri-graduation-cap-line",
              "ri-bank-card-line",
              "ri-gift-line",
            ].map((icon) => (
              <div key={icon} className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg shadow-card">
                <i className={`${icon} text-text-secondary text-lg`} />
                <span className="text-2xs text-text-secondary text-center truncate w-full">{icon.split("-").slice(1, -1).join("-")}</span>
              </div>
            ))}
          </div>
        </SubSection>

        {/* === LAYOUT === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Layout Patterns" desc="Common grid and flex compositions" />
        <SubSection title="Two Column (Responsive)">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5">
              <Card className="p-4 bg-positive-light">
                <p className="text-sm font-medium text-text">Left / Narrow</p>
                <p className="text-2xs text-text-secondary mt-1">lg:col-span-5</p>
              </Card>
            </div>
            <div className="lg:col-span-7">
              <Card className="p-4 bg-primary-100">
                <p className="text-sm font-medium text-text">Right / Wide</p>
                <p className="text-2xs text-text-secondary mt-1">lg:col-span-7</p>
              </Card>
            </div>
          </div>
        </SubSection>
        <SubSection title="Three Column Stats">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 text-center">
                <p className="text-2xs text-text-secondary uppercase tracking-wide">Metric {i}</p>
                <p className="text-2xl font-bold text-text mt-1">{i * 42}</p>
              </Card>
            ))}
          </div>
        </SubSection>
        <SubSection title="Tabs / Segmented Control">
          <div className="flex items-center gap-1 bg-bg-subtle rounded-lg p-1 w-fit">
            {["Tab One", "Tab Two", "Tab Three"].map((t, i) => (
              <button
                key={t}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  i === 0 ? "bg-white text-text shadow-sm" : "text-text-secondary hover:text-text"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </SubSection>
        <SubSection title="List Item">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 p-4 hover:bg-bg-subtle transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-bank-card-line text-primary text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text">Item Title</p>
                  <Badge variant="accent" size="sm">Tag</Badge>
                </div>
                <p className="text-2xs text-text-secondary mt-0.5">Subtitle · Meta · Source</p>
              </div>
              <span className="text-sm font-semibold text-text tabular-nums">$1,240.00</span>
            </div>
          </Card>
        </SubSection>
        <SubSection title="Modal Container">
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Modal Title</h3>
              <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-subtle text-text-secondary hover:text-text transition-colors">
                <i className="ri-close-line text-sm" />
              </button>
            </div>
            <p className="text-sm text-text-secondary">This is how modal content is structured. Rounded-2xl, shadow-xl, max-w-lg.</p>
            <div className="flex justify-end gap-2 mt-6">
              <button className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text transition-colors">Cancel</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors">Confirm</button>
            </div>
          </div>
        </SubSection>
        <SubSection title="Dropdown Menu">
          <Card className="p-2 w-64 shadow-card-hover">
            <p className="text-2xs text-text-muted font-medium px-2 py-1.5 uppercase tracking-wide">Menu Section</p>
            {["Action One", "Action Two", "Action Three"].map((a, i) => (
              <button key={a} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors ${i === 0 ? "bg-primary-100 text-primary-700" : "hover:bg-bg-subtle text-text"}`}>
                <i className={`${i === 0 ? "ri-check-line text-primary" : "ri-circle-line text-text-muted"} text-sm`} />
                {a}
              </button>
            ))}
            <div className="border-t border-bg-subtle my-1.5" />
            <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left hover:bg-bg-subtle text-text-secondary transition-colors">
              <i className="ri-settings-4-line text-sm" />
              Settings
            </button>
          </Card>
        </SubSection>

        {/* === SPACING & SHADOWS === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Spacing & Shadows" desc="Standard spacing values and shadow tokens" />
        <SubSection title="Spacing Scale">
          <div className="flex flex-wrap gap-3 items-end">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className="bg-primary rounded" style={{ width: s * 4, height: s * 4 }} />
                <span className="text-2xs text-text-secondary">{s}</span>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Border Radius">
          <div className="flex flex-wrap gap-3 items-center">
            {[
              { label: "sm", class: "rounded-sm" },
              { label: "md", class: "rounded-md" },
              { label: "lg", class: "rounded-lg" },
              { label: "xl", class: "rounded-xl" },
              { label: "2xl", class: "rounded-2xl" },
              { label: "full", class: "rounded-full" },
            ].map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 bg-primary ${r.class}`} />
                <span className="text-2xs text-text-secondary">{r.label}</span>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Shadows">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 shadow-card">
              <p className="text-sm font-semibold text-text">shadow-card</p>
              <p className="text-2xs text-text-secondary mt-1">Default card shadow</p>
            </Card>
            <Card className="p-5 shadow-card-hover">
              <p className="text-sm font-semibold text-text">shadow-card-hover</p>
              <p className="text-2xs text-text-secondary mt-1">Elevated on hover / focus</p>
            </Card>
            <div className="p-5 bg-white rounded-lg shadow-nav">
              <p className="text-sm font-semibold text-text">shadow-nav</p>
              <p className="text-2xs text-text-secondary mt-1">Navigation bar shadow</p>
            </div>
          </div>
        </SubSection>

        {/* === PAGE STRUCTURE === */}
        <div className="border-t border-bg-subtle pt-8 mb-8" />
        <SectionTitle title="Page Structure" desc="Standard layout for every page" />
        <SubSection title="Container Pattern">
          <Card className="p-5 bg-bg-subtle">
            <pre className="text-xs font-mono text-text-secondary overflow-x-auto">
{`<div className="min-h-screen bg-bg">
  <Navbar />
  <main className="pt-16 md:pt-20 px-4 md:px-8 pb-12">
    {/* Full width, no max-w-*, no mx-auto */}
  </main>
</div>`}
            </pre>
          </Card>
        </SubSection>
        <SubSection title="Navbar Pattern">
          <Card className="p-5 bg-bg-subtle">
            <pre className="text-xs font-mono text-text-secondary overflow-x-auto">
{`<header className="fixed top-0 left-0 right-0 z-50 ...">
  <div className="px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">
    {/* Logo + brand */}
    <nav className="hidden md:flex items-center gap-1">
      {/* Nav links */}
    </nav>
    {/* EntitySwitcher + notification bell + hamburger */}
  </div>
</header>`}
            </pre>
          </Card>
        </SubSection>
        <SubSection title="Section Spacing">
          <div className="space-y-2">
            <Card className="p-4">
              <p className="text-sm font-medium text-text">section mb-6</p>
              <p className="text-2xs text-text-secondary">Standard gap between major sections</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-text">Card p-4 (mobile) / p-5 (desktop)</p>
              <p className="text-2xs text-text-secondary">Consistent card padding</p>
            </Card>
          </div>
        </SubSection>

        <div className="h-16" />
      </main>
    </div>
  );
}
