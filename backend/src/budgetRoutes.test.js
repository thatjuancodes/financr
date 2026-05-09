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
