import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/base/Card";
import Badge from "@/components/base/Badge";
import Navbar from "@/components/feature/Navbar";

const paletteGroups = [
  {
    title: "Brand",
    description: "Primary identity for navigation, active states, and primary actions.",
    colors: [
      { token: "primary-50", value: "#EFF6FF" },
      { token: "primary-100", value: "#DBEAFE" },
      { token: "primary-300", value: "#93C5FD" },
      { token: "primary-500", value: "#2563EB", dark: true },
      { token: "primary-700", value: "#1E40AF", dark: true },
      { token: "primary-900", value: "#172554", dark: true },
    ],
  },
  {
    title: "Semantic",
    description: "Feedback and system status colors used in cards, badges, and alerts.",
    colors: [
      { token: "success-500", value: "#16A34A", dark: true },
      { token: "warning-500", value: "#D97706", dark: true },
      { token: "error-500", value: "#DC2626", dark: true },
      { token: "info-500", value: "#0284C7", dark: true },
      { token: "wealth-500", value: "#14B8A6", dark: true },
      { token: "gray-200", value: "#E2E8F0" },
    ],
  },
  {
    title: "Finance",
    description: "Domain colors reserved for money movement, savings, investment, and debt.",
    colors: [
      { token: "income", value: "#22C55E", dark: true },
      { token: "expense", value: "#EF4444", dark: true },
      { token: "savings", value: "#14B8A6", dark: true },
      { token: "investment", value: "#8B5CF6", dark: true },
      { token: "debt", value: "#F97316", dark: true },
      { token: "netWorthNegative", value: "#DC2626", dark: true },
    ],
  },
  {
    title: "Surfaces",
    description: "Backgrounds and text tokens for shell chrome and content areas.",
    colors: [
      { token: "bg", value: "#F8FAFC" },
      { token: "bg-card", value: "#FFFFFF" },
      { token: "bg-subtle", value: "#F1F5F9" },
      { token: "bg-hero", value: "#0F172A", dark: true },
      { token: "text", value: "#0F172A", dark: true },
      { token: "text-secondary", value: "#475569", dark: true },
    ],
  },
];

const typeScale = [
  { label: "5xl", sample: "Dashboard hero balance", className: "text-5xl font-bold" },
  { label: "4xl", sample: "Section lead number", className: "text-4xl font-bold" },
  { label: "3xl", sample: "Page section heading", className: "text-3xl font-semibold" },
  { label: "2xl", sample: "Primary card heading", className: "text-2xl font-semibold" },
  { label: "xl", sample: "Default card title", className: "text-xl font-semibold" },
  { label: "base", sample: "Default body copy and table text", className: "text-base" },
  { label: "sm", sample: "Labels, summaries, and helper text", className: "text-sm" },
  { label: "2xs", sample: "Badge labels and token metadata", className: "text-2xs font-medium uppercase tracking-[0.18em]" },
];

const lineData = [
  { month: "Jan", income: 6200, expenses: 3900, net: 2300 },
  { month: "Feb", income: 6100, expenses: 4025, net: 2075 },
  { month: "Mar", income: 6450, expenses: 4180, net: 2270 },
  { month: "Apr", income: 6520, expenses: 4100, net: 2420 },
  { month: "May", income: 6700, expenses: 4380, net: 2320 },
  { month: "Jun", income: 6800, expenses: 4205, net: 2595 },
];

const barData = [
  { category: "Housing", amount: 1800 },
  { category: "Food", amount: 720 },
  { category: "Transport", amount: 410 },
  { category: "Utilities", amount: 330 },
  { category: "Health", amount: 240 },
];

const pieData = [
  { name: "Cash", value: 42, color: "#2563EB" },
  { name: "Savings", value: 28, color: "#14B8A6" },
  { name: "Investments", value: 21, color: "#8B5CF6" },
  { name: "Debt payoff", value: 9, color: "#F97316" },
];

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.28em] text-text-muted">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-text">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Swatch({
  token,
  value,
  dark = false,
}: {
  token: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-black/5 p-4 shadow-card"
      style={{ backgroundColor: value, color: dark ? "#FFFFFF" : "#0F172A" }}
    >
      <p className="text-xs font-semibold">{token}</p>
      <p className="mt-1 text-2xs font-medium opacity-80">{value}</p>
    </div>
  );
}

function ExampleButton({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <button type="button" className={className}>
      {children}
    </button>
  );
}

function HeaderExample() {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            Reporting / Monthly summary
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-text">June financial snapshot</h3>
          <p className="mt-2 max-w-xl text-sm text-text-secondary">
            Page headers should lead with the task, keep the summary tight, and place
            secondary metadata underneath the title.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExampleButton className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600">
            Export
          </ExampleButton>
          <ExampleButton className="rounded-lg bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-200">
            Compare
          </ExampleButton>
        </div>
      </div>
    </Card>
  );
}

export default function DesignSystem() {
  const [name, setName] = useState("Emergency Fund");
  const [amount, setAmount] = useState("12500");
  const [date, setDate] = useState("2026-05-16");
  const [category, setCategory] = useState("savings");
  const [notes, setNotes] = useState("Round up monthly transfers after salary day.");
  const [automationEnabled, setAutomationEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="px-4 pb-16 pt-20 md:px-8 md:pt-24">
        <div className="mx-auto max-w-[1440px] space-y-8">
          <Card variant="hero" className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-900" />
            <div className="relative space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" size="md">
                  Private Route
                </Badge>
                <Badge variant="outline" size="md">
                  /styleguide
                </Badge>
              </div>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Financr v1 style guide
                  </p>
                  <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
                    System reference for the current web app.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm text-white/76 md:text-base">
                    This page documents the live Tailwind tokens, type scale, layout
                    patterns, shared UI primitives, and chart language used across the
                    authenticated React application.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-2xs uppercase tracking-[0.22em] text-white/60">Font</p>
                    <p className="mt-2 text-lg font-semibold text-white">Inter</p>
                    <p className="mt-1 text-sm text-white/70">Primary UI stack from `index.css`</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-2xs uppercase tracking-[0.22em] text-white/60">Layout</p>
                    <p className="mt-2 text-lg font-semibold text-white">Full-width shell</p>
                    <p className="mt-1 text-sm text-white/70">`Navbar` + padded `main` content</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-2xs uppercase tracking-[0.22em] text-white/60">Charts</p>
                    <p className="mt-2 text-lg font-semibold text-white">Recharts</p>
                    <p className="mt-1 text-sm text-white/70">Finance colors mapped to metrics</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Section
            eyebrow="Foundation"
            title="Color palette"
            description="Primary blue drives navigation and main actions. Supporting semantic and finance-specific colors should stay consistent between cards, badges, alerts, and charts."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {paletteGroups.map((group) => (
                <Card key={group.title} className="p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-text">{group.title}</h3>
                    <p className="mt-1 text-sm text-text-secondary">{group.description}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.colors.map((color) => (
                      <Swatch
                        key={color.token}
                        token={color.token}
                        value={color.value}
                        dark={color.dark}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </Section>

          <Section
            eyebrow="Typography"
            title="Fonts and type scale"
            description="The active application uses Inter via the TypeScript entrypoint. A legacy font bundle exists in `tailwind.css`, but it is not currently loaded by `main.tsx`."
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <Card className="p-5">
                <div className="space-y-4">
                  {typeScale.map((item) => (
                    <div
                      key={item.label}
                      className="border-b border-bg-subtle pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          {item.label}
                        </span>
                        <span className="text-xs text-text-secondary">{item.sample}</span>
                      </div>
                      <p className={`${item.className} text-text`}>{item.sample}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="text-lg font-semibold text-text">Usage notes</h3>
                <div className="mt-4 space-y-3 text-sm text-text-secondary">
                  <p>Use `text-2xl` for page and card headers that must stand out without turning into hero sections.</p>
                  <p>Reserve `text-5xl` and `text-4xl` for dashboard balances and major summary metrics.</p>
                  <p>Use `text-2xs` with uppercase tracking for labels, metadata, token names, and chart legends.</p>
                  <p>Keep body copy at `text-sm` or `text-base` to preserve dense financial layouts on mobile.</p>
                </div>
              </Card>
            </div>
          </Section>

          <Section
            eyebrow="Components"
            title="Headers, buttons, cards, and badges"
            description="These are the building blocks most visible in the authenticated shell. Their shapes and spacing should stay consistent before more decorative variations are introduced."
          >
            <HeaderExample />

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="p-5">
                <h3 className="text-lg font-semibold text-text">Buttons</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Current pages mostly use Tailwind-composed buttons with rounded corners,
                  medium weight, and compact vertical padding.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ExampleButton className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600">
                    Primary action
                  </ExampleButton>
                  <ExampleButton className="rounded-lg bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-200">
                    Secondary action
                  </ExampleButton>
                  <ExampleButton className="rounded-lg bg-bg-subtle px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-gray-200 hover:text-text">
                    Ghost action
                  </ExampleButton>
                  <ExampleButton className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white transition hover:bg-error-600">
                    Destructive
                  </ExampleButton>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-lg font-semibold text-text">Badges</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Shared status indicators come from the base `Badge` component and stay
                  small to avoid fighting with monetary values.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="accent">Active</Badge>
                  <Badge variant="positive">On track</Badge>
                  <Badge variant="warning">Needs review</Badge>
                  <Badge variant="negative">Over budget</Badge>
                  <Badge variant="outline">Draft</Badge>
                </div>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5">
                <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Default card
                </p>
                <h3 className="mt-3 text-xl font-semibold text-text">Content container</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  White surface, rounded corners, and a soft shadow. This is the default
                  frame for lists, forms, metrics, and empty states.
                </p>
              </Card>
              <Card className="bg-positive-light p-5">
                <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-positive-dark/70">
                  Insight card
                </p>
                <h3 className="mt-3 text-xl font-semibold text-text">Positive insight</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Semantic-tinted surfaces work for alerts, savings wins, and smart
                  recommendations without changing the card structure.
                </p>
              </Card>
              <Card variant="hero" className="p-5">
                <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Hero card
                </p>
                <h3 className="mt-3 text-xl font-semibold text-white">High-contrast summary</h3>
                <p className="mt-2 text-sm text-white/72">
                  Use for dashboard totals and top-level financial summaries that need to
                  anchor the page.
                </p>
              </Card>
            </div>
          </Section>

          <Section
            eyebrow="Forms"
            title="Form elements"
            description="Form controls should stay simple, readable, and touch-friendly. The app relies on subtle surfaces with focused borders instead of heavy outlines."
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card className="p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text">Goal name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-xl border border-transparent bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text">Target amount</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="w-full rounded-xl border border-transparent bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text">Target date</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="w-full rounded-xl border border-transparent bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-text">Category</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="w-full rounded-xl border border-transparent bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    >
                      <option value="savings">Savings</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="debt">Debt</option>
                    </select>
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-text">Notes</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="h-28 w-full rounded-xl border border-transparent bg-bg-subtle px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-lg font-semibold text-text">Control patterns</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-bg-subtle p-4">
                    <div>
                      <p className="text-sm font-medium text-text">Automation enabled</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Use a compact switch for binary workflow settings.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutomationEnabled((current) => !current)}
                      className={`relative h-7 w-12 rounded-full transition ${
                        automationEnabled ? "bg-success" : "bg-gray-300"
                      }`}
                      aria-pressed={automationEnabled}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                          automationEnabled ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="rounded-2xl bg-bg-subtle p-4">
                    <p className="text-sm font-medium text-text">Segmented filter</p>
                    <div className="mt-3 inline-flex rounded-xl bg-white p-1 shadow-card">
                      <button className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white">
                        Overview
                      </button>
                      <button className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text">
                        Accounts
                      </button>
                      <button className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text">
                        Trends
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-divider p-4">
                    <p className="text-sm font-medium text-text">Validation state</p>
                    <p className="mt-2 text-sm text-error">
                      Use semantic text and border feedback only when the user needs to
                      act. Avoid permanent red chrome on neutral fields.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Section>

          <Section
            eyebrow="Data Viz"
            title="Graphs and charts"
            description="Charts use Recharts and should keep a direct mapping between metric meaning and color. Income stays green, expenses red, savings teal, and general trend or net lines blue."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-text">Cash flow trend</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Use multi-line charts for monthly trend comparisons over time.
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="income"
                        stroke="#22C55E"
                        strokeWidth={3}
                        dot={false}
                        name="Income"
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke="#EF4444"
                        strokeWidth={3}
                        dot={false}
                        name="Expenses"
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="#2563EB"
                        strokeWidth={3}
                        dot={false}
                        name="Net"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-text">Expense categories</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Bar charts are the clearest option for ranked spending comparisons.
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="category" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#1E40AF" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-text">Allocation mix</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Pie charts should be reserved for coarse composition, not precise value comparison.
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={3}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pieData.map((entry) => (
                    <span
                      key={entry.name}
                      className="inline-flex items-center gap-2 rounded-full bg-bg-subtle px-3 py-1 text-xs text-text-secondary"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.name}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}
