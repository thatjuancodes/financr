const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeBudgetPayload,
  buildBudgetSchedule,
  buildBudgetMetrics,
} = require("./budgetRoutes");

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

test("budget payload normalizes one-time budgets", () => {
  const payload = normalizeBudgetPayload(
    {
      entity_id: "entity-1",
      name: "  Buy Laptop  ",
      category: " Tech ",
      target_amount: "2450",
      payment_plan: "one_time",
      payment_frequency: "once",
      start_date: "2026-06-15",
      target_date: "2026-06-20",
      notes: "  Work setup  ",
      is_active: true,
    },
    { isValidDate }
  );

  assert.equal(payload.error, undefined);
  assert.equal(payload.name, "Buy Laptop");
  assert.equal(payload.category, "Tech");
  assert.equal(payload.target_amount, 2450);
  assert.equal(payload.payment_amount, 2450);
  assert.equal(payload.payment_count, 1);
  assert.equal(payload.target_date, "2026-06-20");
});

test("budget payload rejects installment schedules that do not cover the target", () => {
  const payload = normalizeBudgetPayload(
    {
      entity_id: "entity-1",
      name: "Move to Spain",
      target_amount: "10000",
      payment_plan: "installment",
      payment_frequency: "monthly",
      payment_amount: "1000",
      payment_count: "6",
      start_date: "2026-06-01",
    },
    { isValidDate }
  );

  assert.equal(payload.error, "Installment count and amount must cover the total budget");
});

test("budget schedule builds partial final installment and computes impacts", () => {
  const schedule = buildBudgetSchedule(
    {
      target_amount: 2500,
      payment_plan: "installment",
      payment_frequency: "monthly",
      payment_amount: 800,
      payment_count: null,
      start_date: "2026-05-02",
    },
    { isValidDate }
  );

  assert.deepEqual(schedule, [
    { date: "2026-05-02", amount: 800 },
    { date: "2026-06-02", amount: 800 },
    { date: "2026-07-02", amount: 800 },
    { date: "2026-08-02", amount: 100 },
  ]);

  const metrics = buildBudgetMetrics(
    {
      target_amount: 2500,
      payment_plan: "installment",
      payment_frequency: "monthly",
      payment_amount: 800,
      payment_count: null,
      start_date: "2026-05-02",
      is_active: true,
    },
    {
      isValidDate,
      todayISO: () => "2026-05-02",
    }
  );

  assert.equal(metrics.today_impact, 800);
  assert.equal(metrics.weekly_impact, 800);
  assert.equal(metrics.monthly_impact, 800);
  assert.equal(metrics.remaining_amount, 2500);
  assert.equal(metrics.next_payment_date, "2026-05-02");
  assert.equal(metrics.final_payment_date, "2026-08-02");
  assert.equal(metrics.scheduled_payment_count, 4);
});

test("budget metrics ignore future impact for inactive budgets", () => {
  const metrics = buildBudgetMetrics(
    {
      target_amount: 1200,
      payment_plan: "installment",
      payment_frequency: "monthly",
      payment_amount: 300,
      payment_count: 4,
      start_date: "2026-05-02",
      is_active: false,
    },
    {
      isValidDate,
      todayISO: () => "2026-05-02",
    }
  );

  assert.equal(metrics.today_impact, 0);
  assert.equal(metrics.weekly_impact, 0);
  assert.equal(metrics.monthly_impact, 0);
  assert.equal(metrics.next_payment_date, null);
  assert.equal(metrics.remaining_payment_count, 0);
});

test("budget payload derives totals and cadence from itemized plans", () => {
  const payload = normalizeBudgetPayload(
    {
      entity_id: "entity-1",
      name: "Family Trip",
      start_date: "2026-05-01",
      target_date: "2026-07-15",
      budget_items: [
        { name: "Flights", cadence: "one_time", amount: "18000" },
        { name: "Pocket Money", cadence: "monthly", amount: "5000" },
      ],
    },
    { isValidDate }
  );

  assert.equal(payload.error, undefined);
  assert.equal(payload.target_amount, 33000);
  assert.equal(payload.payment_plan, "installment");
  assert.equal(payload.payment_frequency, "monthly");
  assert.equal(payload.payment_amount, 5000);
  assert.equal(payload.payment_count, 3);
  assert.deepEqual(payload.budget_items, [
    { id: "item-1", name: "Flights", cadence: "one_time", amount: 18000, notes: null },
    { id: "item-2", name: "Pocket Money", cadence: "monthly", amount: 5000, notes: null },
  ]);
});

test("itemized budgets require a target date", () => {
  const payload = normalizeBudgetPayload(
    {
      entity_id: "entity-1",
      name: "Family Trip",
      start_date: "2026-05-01",
      budget_items: [{ name: "Flights", cadence: "one_time", amount: "18000" }],
    },
    { isValidDate }
  );

  assert.equal(payload.error, "Budget plans with items require a target date");
});

test("itemized budgets build one-time and monthly schedule metrics", () => {
  const metrics = buildBudgetMetrics(
    {
      target_amount: 33000,
      start_date: "2026-05-01",
      target_date: "2026-07-15",
      is_active: true,
      budget_items_json: JSON.stringify([
        { id: "item-1", name: "Flights", cadence: "one_time", amount: 18000 },
        { id: "item-2", name: "Pocket Money", cadence: "monthly", amount: 5000 },
      ]),
    },
    {
      isValidDate,
      todayISO: () => "2026-05-01",
    }
  );

  assert.equal(metrics.today_impact, 5000);
  assert.equal(metrics.weekly_impact, 5000);
  assert.equal(metrics.monthly_impact, 5000);
  assert.equal(metrics.one_time_total, 18000);
  assert.equal(metrics.monthly_total, 5000);
  assert.equal(metrics.item_count, 2);
  assert.equal(metrics.final_payment_date, "2026-07-15");
  assert.deepEqual(metrics.schedule_preview, [
    { date: "2026-05-01", amount: 5000 },
    { date: "2026-06-01", amount: 5000 },
    { date: "2026-07-01", amount: 5000 },
    { date: "2026-07-15", amount: 18000 },
  ]);
});
