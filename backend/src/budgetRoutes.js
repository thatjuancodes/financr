const BUDGET_PAYMENT_PLANS = new Set(["one_time", "installment"]);
const BUDGET_PAYMENT_FREQUENCIES = new Set(["once", "weekly", "monthly", "yearly"]);

function roundMoney(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function formatIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIsoDate(value, isValidDate) {
  if (!isValidDate(value)) {
    return null;
  }
  const [year, month, day] = String(value).split("-").map(Number);
  return { year, month, day };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(dateString, dayCount, isValidDate) {
  const parsed = parseIsoDate(dateString, isValidDate);
  if (!parsed) {
    throw new Error("Invalid date");
  }
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + dayCount);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateString, monthCount, isValidDate) {
  const parsed = parseIsoDate(dateString, isValidDate);
  if (!parsed) {
    throw new Error("Invalid date");
  }
  const totalMonths = parsed.year * 12 + (parsed.month - 1) + monthCount;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  const nextDay = Math.min(parsed.day, daysInMonth(nextYear, nextMonth));
  return formatIsoDate(nextYear, nextMonth, nextDay);
}

function advanceBudgetDate(dateString, frequency, isValidDate) {
  if (frequency === "weekly") {
    return addDays(dateString, 7, isValidDate);
  }
  if (frequency === "monthly") {
    return addMonths(dateString, 1, isValidDate);
  }
  if (frequency === "yearly") {
    return addMonths(dateString, 12, isValidDate);
  }
  throw new Error("Invalid budget frequency");
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function normalizeBudgetPayload(body, { isValidDate }) {
  const entityId = body?.entity_id;
  const name =
    typeof body?.name === "string"
      ? body.name.trim()
      : "";
  const category = normalizeOptionalText(body?.category);
  const targetAmount = Number(body?.target_amount);
  const paymentPlan =
    typeof body?.payment_plan === "string"
      ? body.payment_plan.trim().toLowerCase()
      : "";
  const paymentFrequency =
    typeof body?.payment_frequency === "string"
      ? body.payment_frequency.trim().toLowerCase()
      : "";
  const paymentAmountRaw = body?.payment_amount;
  const paymentAmount =
    paymentAmountRaw === null || paymentAmountRaw === undefined || paymentAmountRaw === ""
      ? null
      : Number(paymentAmountRaw);
  const startDate =
    typeof body?.start_date === "string"
      ? body.start_date.trim()
      : "";
  const targetDate =
    typeof body?.target_date === "string" && body.target_date.trim()
      ? body.target_date.trim()
      : null;
  const paymentCountRaw = body?.payment_count;
  const paymentCount =
    paymentCountRaw === null || paymentCountRaw === undefined || paymentCountRaw === ""
      ? null
      : Number(paymentCountRaw);
  const notes = normalizeOptionalText(body?.notes);
  const isActive =
    body?.is_active === undefined
      ? true
      : body?.is_active === true ||
        body?.is_active === 1 ||
        String(body?.is_active).trim().toLowerCase() === "true";

  if (
    !name ||
    !Number.isFinite(targetAmount) ||
    targetAmount <= 0 ||
    !BUDGET_PAYMENT_PLANS.has(paymentPlan) ||
    !BUDGET_PAYMENT_FREQUENCIES.has(paymentFrequency) ||
    !isValidDate(startDate) ||
    (targetDate !== null && !isValidDate(targetDate))
  ) {
    return { error: "Invalid budget payload" };
  }

  if (targetDate && targetDate < startDate) {
    return { error: "Target date cannot be before the start date" };
  }

  if (paymentPlan === "one_time") {
    if (paymentFrequency !== "once") {
      return { error: "One-time budgets must use the once frequency" };
    }
    return {
      entity_id: entityId,
      name,
      category,
      target_amount: roundMoney(targetAmount),
      payment_plan: paymentPlan,
      payment_frequency: "once",
      payment_amount: roundMoney(targetAmount),
      payment_count: 1,
      start_date: startDate,
      target_date: targetDate,
      notes,
      is_active: isActive,
    };
  }

  if (paymentFrequency === "once") {
    return { error: "Installment budgets must use a recurring payment frequency" };
  }
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return { error: "Installment budgets require a valid payment amount" };
  }
  if (
    paymentCount !== null &&
    (!Number.isInteger(paymentCount) || paymentCount <= 0)
  ) {
    return { error: "payment_count must be a positive integer" };
  }
  if (
    Number.isInteger(paymentCount) &&
    roundMoney(paymentAmount * paymentCount) + 0.009 < roundMoney(targetAmount)
  ) {
    return { error: "Installment count and amount must cover the total budget" };
  }

  return {
    entity_id: entityId,
    name,
    category,
    target_amount: roundMoney(targetAmount),
    payment_plan: paymentPlan,
    payment_frequency,
    payment_amount: roundMoney(paymentAmount),
    payment_count: Number.isInteger(paymentCount) ? paymentCount : null,
    start_date: startDate,
    target_date: targetDate,
    notes,
    is_active: isActive,
  };
}

function buildBudgetSchedule(item, { isValidDate }) {
  const totalAmount = roundMoney(item?.target_amount);
  const startDate = String(item?.start_date || "").trim();
  if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !isValidDate(startDate)) {
    return [];
  }

  if (String(item?.payment_plan || "").trim().toLowerCase() === "one_time") {
    return [
      {
        date: startDate,
        amount: totalAmount,
      },
    ];
  }

  const paymentAmount = roundMoney(item?.payment_amount);
  const frequency = String(item?.payment_frequency || "").trim().toLowerCase();
  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0 ||
    !BUDGET_PAYMENT_FREQUENCIES.has(frequency) ||
    frequency === "once"
  ) {
    return [];
  }

  const fallbackCount = Math.max(1, Math.ceil(totalAmount / paymentAmount));
  const explicitCount = Number(item?.payment_count);
  const plannedCount =
    Number.isInteger(explicitCount) && explicitCount > 0 ? explicitCount : fallbackCount;

  const occurrences = [];
  let remainingAmount = totalAmount;
  let currentDate = startDate;

  for (let index = 0; index < plannedCount && remainingAmount > 0.0001; index += 1) {
    const occurrenceAmount = roundMoney(Math.min(paymentAmount, remainingAmount));
    occurrences.push({
      date: currentDate,
      amount: occurrenceAmount,
    });
    remainingAmount = roundMoney(remainingAmount - occurrenceAmount);
    if (remainingAmount > 0.0001) {
      currentDate = advanceBudgetDate(currentDate, frequency, isValidDate);
    }
  }

  return occurrences;
}

function buildBudgetMetrics(item, { isValidDate, todayISO }) {
  const schedule = buildBudgetSchedule(item, { isValidDate });
  const today = todayISO();
  const weeklyEndDate = addDays(today, 6, isValidDate);
  const monthlyEndDate = addDays(today, 29, isValidDate);
  const active =
    item?.is_active === true || item?.is_active === 1 || item?.is_active === "1";

  let elapsedAmount = 0;
  let upcomingDaily = 0;
  let upcomingWeekly = 0;
  let upcomingMonthly = 0;
  let completedPaymentCount = 0;

  schedule.forEach((entry) => {
    if (entry.date < today) {
      elapsedAmount += Number(entry.amount ?? 0);
      completedPaymentCount += 1;
      return;
    }
    if (!active) {
      return;
    }
    if (entry.date === today) {
      upcomingDaily += Number(entry.amount ?? 0);
    }
    if (entry.date >= today && entry.date <= weeklyEndDate) {
      upcomingWeekly += Number(entry.amount ?? 0);
    }
    if (entry.date >= today && entry.date <= monthlyEndDate) {
      upcomingMonthly += Number(entry.amount ?? 0);
    }
  });

  const nextPayment = active
    ? schedule.find((entry) => entry.date >= today) || null
    : null;
  const finalPayment = schedule.length > 0 ? schedule[schedule.length - 1] : null;
  const remainingAmount = roundMoney(
    Math.max(0, Number(item?.target_amount ?? 0) - elapsedAmount)
  );
  const remainingSchedule = active
    ? schedule.filter((entry) => entry.date >= today)
    : [];

  return {
    today_impact: roundMoney(upcomingDaily),
    weekly_impact: roundMoney(upcomingWeekly),
    monthly_impact: roundMoney(upcomingMonthly),
    elapsed_amount: roundMoney(elapsedAmount),
    remaining_amount: remainingAmount,
    completed_payment_count: completedPaymentCount,
    remaining_payment_count: remainingSchedule.length,
    scheduled_payment_count: schedule.length,
    next_payment_date: nextPayment?.date ?? null,
    next_payment_amount: nextPayment ? roundMoney(nextPayment.amount) : null,
    final_payment_date: finalPayment?.date ?? null,
    schedule_preview: remainingSchedule.slice(0, 6).map((entry) => ({
      date: entry.date,
      amount: roundMoney(entry.amount),
    })),
  };
}

function serializeBudgetRow(row, deps) {
  if (!row) {
    return null;
  }
  const metrics = buildBudgetMetrics(row, deps);
  return {
    id: Number(row.id),
    entity_id: String(row.entity_id || ""),
    entity_name: row.entity_name ? String(row.entity_name) : null,
    entity_type: row.entity_type ? String(row.entity_type) : null,
    name: String(row.name || ""),
    category: row.category ? String(row.category) : null,
    target_amount: roundMoney(row.target_amount),
    payment_plan: String(row.payment_plan || "one_time"),
    payment_frequency: String(row.payment_frequency || "once"),
    payment_amount: roundMoney(row.payment_amount),
    payment_count:
      row.payment_count === null || row.payment_count === undefined
        ? null
        : Number(row.payment_count),
    start_date: String(row.start_date || ""),
    target_date: row.target_date ? String(row.target_date) : null,
    notes: row.notes ? String(row.notes) : null,
    is_active: row.is_active === true || row.is_active === 1 || row.is_active === "1",
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    ...metrics,
  };
}

function registerBudgetRoutes(app, deps) {
  const {
    all,
    get,
    run,
    hasEntityFilter,
    normalizeEntityId,
    getEntityById,
    resolveWriteEntityId,
    isValidDate,
    todayISO,
  } = deps;

  const serialize = (row) => serializeBudgetRow(row, { isValidDate, todayISO });

  app.get("/budgets", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    if (filterActive && !entityId) {
      return res.status(400).json({ error: "Invalid budget filters" });
    }

    try {
      if (entityId) {
        const entity = await getEntityById(entityId);
        if (!entity) {
          return res.status(404).json({ error: "Entity not found" });
        }
      }

      const rows = await all(
        `
        SELECT
          b.id,
          b.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          b.name,
          b.category,
          b.target_amount,
          b.payment_plan,
          b.payment_frequency,
          b.payment_amount,
          b.payment_count,
          b.start_date,
          b.target_date,
          b.notes,
          b.is_active,
          b.created_at,
          b.updated_at
        FROM budgets b
        LEFT JOIN entities ent ON ent.id = b.entity_id
        ${entityId ? "WHERE b.entity_id = ?" : ""}
        ORDER BY b.is_active DESC, b.start_date ASC, b.id ASC
        `,
        entityId ? [entityId] : []
      );

      res.json(rows.map(serialize));
    } catch (error) {
      res.status(500).json({ error: "Failed to load budgets" });
    }
  });

  app.post("/budgets", async (req, res) => {
    const payload = normalizeBudgetPayload(req.body, { isValidDate });
    if (payload.error) {
      return res.status(400).json({ error: payload.error });
    }

    try {
      const resolvedEntityId = await resolveWriteEntityId(payload.entity_id);
      if (!resolvedEntityId) {
        return res.status(400).json({ error: "Invalid budget payload" });
      }

      const now = new Date().toISOString();
      const result = await run(
        `
        INSERT INTO budgets (
          entity_id,
          name,
          category,
          target_amount,
          payment_plan,
          payment_frequency,
          payment_amount,
          payment_count,
          start_date,
          target_date,
          notes,
          is_active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          resolvedEntityId,
          payload.name,
          payload.category,
          payload.target_amount,
          payload.payment_plan,
          payload.payment_frequency,
          payload.payment_amount,
          payload.payment_count,
          payload.start_date,
          payload.target_date,
          payload.notes,
          payload.is_active ? 1 : 0,
          now,
          now,
        ]
      );

      const row = await get(
        `
        SELECT
          b.id,
          b.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          b.name,
          b.category,
          b.target_amount,
          b.payment_plan,
          b.payment_frequency,
          b.payment_amount,
          b.payment_count,
          b.start_date,
          b.target_date,
          b.notes,
          b.is_active,
          b.created_at,
          b.updated_at
        FROM budgets b
        LEFT JOIN entities ent ON ent.id = b.entity_id
        WHERE b.id = ?
        `,
        [result.lastID]
      );

      res.status(201).json(serialize(row));
    } catch (error) {
      res.status(500).json({ error: "Failed to create budget" });
    }
  });

  app.put("/budgets/:id", async (req, res) => {
    const id = Number(req.params.id);
    const payload = normalizeBudgetPayload(req.body, { isValidDate });
    if (Number.isNaN(id) || payload.error) {
      return res.status(400).json({ error: payload.error || "Invalid budget payload" });
    }

    try {
      const existing = await get("SELECT id, entity_id FROM budgets WHERE id = ?", [id]);
      if (!existing) {
        return res.status(404).json({ error: "Budget not found" });
      }

      const resolvedEntityId = await resolveWriteEntityId(payload.entity_id);
      if (!resolvedEntityId) {
        return res.status(400).json({ error: "Invalid budget payload" });
      }

      const updatedAt = new Date().toISOString();
      const result = await run(
        `
        UPDATE budgets
        SET
          entity_id = ?,
          name = ?,
          category = ?,
          target_amount = ?,
          payment_plan = ?,
          payment_frequency = ?,
          payment_amount = ?,
          payment_count = ?,
          start_date = ?,
          target_date = ?,
          notes = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [
          resolvedEntityId,
          payload.name,
          payload.category,
          payload.target_amount,
          payload.payment_plan,
          payload.payment_frequency,
          payload.payment_amount,
          payload.payment_count,
          payload.start_date,
          payload.target_date,
          payload.notes,
          payload.is_active ? 1 : 0,
          updatedAt,
          id,
        ]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: "Budget not found" });
      }

      const row = await get(
        `
        SELECT
          b.id,
          b.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          b.name,
          b.category,
          b.target_amount,
          b.payment_plan,
          b.payment_frequency,
          b.payment_amount,
          b.payment_count,
          b.start_date,
          b.target_date,
          b.notes,
          b.is_active,
          b.created_at,
          b.updated_at
        FROM budgets b
        LEFT JOIN entities ent ON ent.id = b.entity_id
        WHERE b.id = ?
        `,
        [id]
      );

      res.json(serialize(row));
    } catch (error) {
      res.status(500).json({ error: "Failed to update budget" });
    }
  });

  app.delete("/budgets/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid budget id" });
    }

    try {
      const result = await run("DELETE FROM budgets WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });
}

module.exports = {
  registerBudgetRoutes,
  normalizeBudgetPayload,
  buildBudgetSchedule,
  buildBudgetMetrics,
  advanceBudgetDate,
};
