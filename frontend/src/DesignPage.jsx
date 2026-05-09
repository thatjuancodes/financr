import React from "react";

const componentNames = [
  "PageFrame",
  "SectionPanel",
  "ColorSwatch",
  "TypeScaleRow",
  "ButtonSet",
  "BadgeSet",
  "CardGallery",
  "FormElements",
  "DataTable",
  "FeedbackStates",
];

const palette = [
  {
    name: "Primary",
    source: "Sea",
    hex: "#0f766e",
    token: "bg-semantic-primary text-white",
  },
  {
    name: "Secondary",
    source: "Sky",
    hex: "#38bdf8",
    token: "bg-semantic-secondary text-semantic-dark",
  },
  {
    name: "Success",
    source: "Lime",
    hex: "#84cc16",
    token: "bg-semantic-success text-semantic-dark",
  },
  {
    name: "Error",
    source: "Rose",
    hex: "#e11d48",
    token: "bg-semantic-error text-white",
  },
  {
    name: "Danger",
    source: "Coral",
    hex: "#f97316",
    token: "bg-semantic-danger text-white",
  },
  {
    name: "Dark",
    source: "Night",
    hex: "#111827",
    token: "bg-semantic-dark text-white",
  },
  {
    name: "Light",
    source: "Sand",
    hex: "#f8f5ef",
    token: "bg-semantic-light text-semantic-dark",
  },
];

function SectionPanel({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-panel backdrop-blur">
      <h2 className="font-display text-2xl font-bold text-semantic-dark">{title}</h2>
      {subtitle && (
        <p className="mt-1 font-body text-sm text-slate-600">{subtitle}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ColorSwatch({ name, source, hex, token }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className={`h-20 rounded-xl ${token}`} />
      <p className="mt-3 font-display text-sm font-semibold text-slate-900">
        {name}
      </p>
      <p className="font-body text-xs text-slate-500">{source}</p>
      <p className="font-mono text-xs text-slate-500">{hex}</p>
    </article>
  );
}

function TypeScaleRow({ label, className, sample }) {
  return (
    <div className="grid grid-cols-1 items-baseline gap-2 border-b border-dashed border-slate-200 py-3 md:grid-cols-[130px_1fr]">
      <p className="font-mono text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={className}>{sample}</p>
    </div>
  );
}

function ButtonSet() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button className="rounded-xl bg-semantic-primary px-4 py-2 font-body text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90">
          Primary Action
        </button>
        <button className="rounded-xl bg-semantic-secondary px-4 py-2 font-body text-sm font-semibold text-semantic-dark transition hover:opacity-90">
          Secondary
        </button>
        <button className="rounded-xl bg-semantic-success px-4 py-2 font-body text-sm font-semibold text-semantic-dark transition hover:opacity-90">
          Success
        </button>
        <button className="rounded-xl bg-semantic-error px-4 py-2 font-body text-sm font-semibold text-white transition hover:opacity-90">
          Error
        </button>
        <button className="rounded-xl bg-semantic-danger px-4 py-2 font-body text-sm font-semibold text-white transition hover:opacity-90">
          Danger
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-lg bg-semantic-light px-3 py-1.5 font-body text-xs font-semibold text-semantic-dark transition hover:brightness-95">
          Light
        </button>
        <button className="rounded-xl bg-semantic-dark px-4 py-2.5 font-body text-sm font-bold text-white transition hover:opacity-90">
          Dark
        </button>
        <button className="rounded-2xl bg-semantic-primary px-6 py-3 font-body text-base font-bold text-white transition hover:opacity-90">
          Primary Large
        </button>
      </div>
    </div>
  );
}

function BadgeSet() {
  const badges = [
    ["Primary", "bg-semantic-primary/15 text-semantic-primary"],
    ["Secondary", "bg-semantic-secondary/20 text-semantic-dark"],
    ["Success", "bg-semantic-success/25 text-semantic-dark"],
    ["Error", "bg-semantic-error/15 text-semantic-error"],
    ["Danger", "bg-semantic-danger/15 text-semantic-danger"],
    ["Dark", "bg-semantic-dark/10 text-semantic-dark"],
    ["Light", "bg-semantic-light text-semantic-dark"],
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map(([label, style]) => (
        <span
          key={label}
          className={`rounded-full px-3 py-1 font-body text-xs font-bold uppercase tracking-wide ${style}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function CardGallery() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="rounded-2xl bg-gradient-to-br from-semantic-dark to-semantic-primary p-5 text-white">
        <p className="font-body text-xs uppercase tracking-[0.15em] text-slate-200">
          Current Budget
        </p>
        <p className="mt-3 font-display text-3xl font-extrabold">$4,240</p>
        <p className="mt-2 font-body text-sm text-slate-200">+8.4% this cycle</p>
      </article>
      <article className="rounded-2xl border border-semantic-secondary/40 bg-semantic-light p-5">
        <p className="font-body text-xs uppercase tracking-[0.15em] text-semantic-dark/70">
          Insights
        </p>
        <h3 className="mt-2 font-display text-xl font-bold text-semantic-dark">
          Grocery spend rose 12%
        </h3>
        <p className="mt-2 font-body text-sm text-semantic-dark/70">
          Largest change came from weekend markets. Consider capping to $420.
        </p>
      </article>
      <article className="rounded-2xl border border-semantic-success/40 bg-semantic-success/20 p-5">
        <p className="font-body text-xs uppercase tracking-[0.15em] text-semantic-dark/70">
          Reminder
        </p>
        <h3 className="mt-2 font-display text-xl font-bold text-semantic-dark">
          Debt Statement Ends in 4 days
        </h3>
        <button className="mt-4 rounded-lg bg-semantic-primary px-3 py-2 font-body text-xs font-bold text-white transition hover:opacity-90">
          Review Statement
        </button>
      </article>
    </div>
  );
}

function FormElements() {
  return (
    <form className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1">
        <span className="font-body text-xs font-semibold uppercase tracking-wide text-slate-500">
          Text Input
        </span>
        <input
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-body text-sm text-slate-900 outline-none ring-semantic-secondary/40 transition focus:ring-4"
          placeholder="Mortgage Payment"
        />
      </label>
      <label className="grid gap-1">
        <span className="font-body text-xs font-semibold uppercase tracking-wide text-slate-500">
          Select
        </span>
        <select className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-body text-sm text-slate-900">
          <option>Housing</option>
          <option>Food</option>
          <option>Debt</option>
        </select>
      </label>
      <label className="grid gap-1 md:col-span-2">
        <span className="font-body text-xs font-semibold uppercase tracking-wide text-slate-500">
          Text Area
        </span>
        <textarea
          rows={3}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-body text-sm text-slate-900"
          placeholder="Add notes or context..."
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-semantic-primary focus:ring-semantic-secondary/40"
        />
        <span className="font-body text-sm text-slate-700">Recurring transaction</span>
      </label>
      <div className="flex items-center gap-3">
        <span className="font-body text-sm text-slate-700">Priority</span>
        <label className="flex items-center gap-1 font-body text-sm text-slate-700">
          <input
            type="radio"
            name="priority"
            defaultChecked
            className="text-semantic-primary focus:ring-semantic-secondary/40"
          />
          High
        </label>
        <label className="flex items-center gap-1 font-body text-sm text-slate-700">
          <input
            type="radio"
            name="priority"
            className="text-semantic-primary focus:ring-semantic-secondary/40"
          />
          Normal
        </label>
      </div>
    </form>
  );
}

function DataTable() {
  const rows = [
    {
      date: "Mar 04",
      name: "Groceries",
      category: "Food",
      amount: "$124.22",
      status: "Approved",
      tone: "bg-semantic-success/25 text-semantic-dark",
    },
    {
      date: "Mar 09",
      name: "Utility Bill",
      category: "Housing",
      amount: "$71.50",
      status: "Review",
      tone: "bg-semantic-secondary/25 text-semantic-dark",
    },
    {
      date: "Mar 11",
      name: "Debt Payment",
      category: "Debt",
      amount: "$250.00",
      status: "Alert",
      tone: "bg-semantic-danger/20 text-semantic-danger",
    },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full border-collapse">
        <thead className="bg-semantic-light">
          <tr>
            {["Date", "Name", "Category", "Amount", "Status"].map((head) => (
              <th
                key={head}
                className="px-4 py-3 text-left font-body text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.date}-${row.name}`} className="border-t border-slate-200">
              <td className="px-4 py-3 font-body text-sm text-slate-700">{row.date}</td>
              <td className="px-4 py-3 font-body text-sm text-slate-700">{row.name}</td>
              <td className="px-4 py-3 font-body text-sm text-slate-700">{row.category}</td>
              <td className="px-4 py-3 font-body text-sm text-slate-700">{row.amount}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 font-body text-xs font-bold uppercase tracking-wide ${row.tone}`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeedbackStates() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-semantic-success/50 bg-semantic-success/20 p-4">
        <p className="font-display text-sm font-bold text-semantic-dark">Success</p>
        <p className="mt-1 font-body text-sm text-semantic-dark/80">
          Payment recorded for March statement.
        </p>
      </div>
      <div className="rounded-xl border border-semantic-danger/50 bg-semantic-danger/15 p-4">
        <p className="font-display text-sm font-bold text-semantic-danger">Danger</p>
        <p className="mt-1 font-body text-sm text-semantic-danger">
          Budget utilization reached 86%.
        </p>
      </div>
      <div className="rounded-xl border border-semantic-error/50 bg-semantic-error/10 p-4">
        <p className="font-display text-sm font-bold text-semantic-error">Error</p>
        <p className="mt-1 font-body text-sm text-semantic-error">
          Loan origin is required to save this record.
        </p>
      </div>
    </div>
  );
}

export default function DesignPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-semantic-light via-white to-semantic-secondary/15 font-body text-slate-900 [&_button]:appearance-none [&_button]:border-0">
      <div className="bg-grid min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
          <header className="mb-8 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-panel backdrop-blur md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                  Homemaker Finance
                </p>
                <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-semantic-dark md:text-5xl">
                  /design styleguide
                </h1>
                <p className="mt-3 max-w-2xl font-body text-sm text-slate-600 md:text-base">
                  Tailwind-driven component inventory and UI tokens for the next
                  generation of dashboard and mobile surfaces.
                </p>
              </div>
              <a
                href="/"
                className="rounded-xl bg-semantic-dark px-4 py-2 font-body text-sm font-bold text-white transition hover:opacity-90"
              >
                Back to App
              </a>
            </div>
          </header>

          <div className="grid gap-6">
            <SectionPanel
              title="Component Inventory"
              subtitle="New React components used to build this styleguide page."
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {componentNames.map((name) => (
                  <div
                    key={name}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </SectionPanel>

            <SectionPanel title="Typography" subtitle="Headlines, body styles, and code styles.">
              <TypeScaleRow
                label="H1"
                className="font-display text-5xl font-extrabold leading-tight text-semantic-dark"
                sample="Money clarity for every home"
              />
              <TypeScaleRow
                label="H2"
                className="font-display text-4xl font-bold leading-tight text-semantic-dark"
                sample="Statement-aware debt management"
              />
              <TypeScaleRow
                label="H3"
                className="font-display text-3xl font-bold leading-snug text-slate-900"
                sample="Category and payment drilldowns"
              />
              <TypeScaleRow
                label="Body"
                className="font-body text-base leading-7 text-slate-700"
                sample="Use this style for most paragraphs, helper text, and contextual guidance."
              />
              <TypeScaleRow
                label="Mono"
                className="font-mono text-sm text-slate-700"
                sample="statement_month = 2026-03"
              />
            </SectionPanel>

            <SectionPanel title="Color Palette" subtitle="Brand and semantic colors.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {palette.map((color) => (
                  <ColorSwatch key={color.name} {...color} />
                ))}
              </div>
            </SectionPanel>

            <SectionPanel title="Buttons">
              <ButtonSet />
            </SectionPanel>

            <SectionPanel title="Badges">
              <BadgeSet />
            </SectionPanel>

            <SectionPanel title="Cards">
              <CardGallery />
            </SectionPanel>

            <SectionPanel title="Form Elements">
              <FormElements />
            </SectionPanel>

            <SectionPanel title="Data Table">
              <DataTable />
            </SectionPanel>

            <SectionPanel title="Feedback States">
              <FeedbackStates />
            </SectionPanel>
          </div>
        </div>
      </div>
    </main>
  );
}
