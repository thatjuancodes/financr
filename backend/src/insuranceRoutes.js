const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LIFE_INSURANCE_FREQUENCIES = new Set([
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
]);

function normalizeRequiredText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeOptionalText(value) {
  const normalized = normalizeRequiredText(value);
  return normalized || null;
}

function normalizeOptionalDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = String(value).trim();
  if (!ISO_DATE.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeAmount(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function normalizeFrequency(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return LIFE_INSURANCE_FREQUENCIES.has(normalized) ? normalized : null;
}

function normalizeActiveFlag(value) {
  if (value === true || value === 1 || value === "1") {
    return 1;
  }
  if (value === false || value === 0 || value === "0") {
    return 0;
  }
  return null;
}

function registerInsuranceRoutes(app, deps) {
  const { all, get, run, assertEntityInWorkspace } = deps;

  app.get("/life-insurances", async (req, res) => {
    const entityId = normalizeRequiredText(req.query?.entity_id);
    try {
      const rows = entityId
        ? await all(
            `
            SELECT
              li.id,
              li.entity_id,
              e.name AS entity_name,
              e.type AS entity_type,
              li.provider,
              li.policy_name,
              li.insured_person,
              li.coverage_amount,
              li.cash_surrender_value,
              li.premium_amount,
              li.payment_frequency,
              li.renewal_date,
              li.notes,
              li.is_active,
              li.created_at,
              li.updated_at
            FROM life_insurances li
            INNER JOIN entities e ON e.id = li.entity_id
            WHERE e.workspace_id = ? AND li.entity_id = ?
            ORDER BY li.is_active DESC, li.renewal_date ASC, li.provider ASC, li.policy_name ASC
            `,
            [req.workspaceId, entityId]
          )
        : await all(
            `
            SELECT
              li.id,
              li.entity_id,
              e.name AS entity_name,
              e.type AS entity_type,
              li.provider,
              li.policy_name,
              li.insured_person,
              li.coverage_amount,
              li.cash_surrender_value,
              li.premium_amount,
              li.payment_frequency,
              li.renewal_date,
              li.notes,
              li.is_active,
              li.created_at,
              li.updated_at
            FROM life_insurances li
            INNER JOIN entities e ON e.id = li.entity_id
            WHERE e.workspace_id = ?
            ORDER BY e.name ASC, li.is_active DESC, li.renewal_date ASC, li.provider ASC, li.policy_name ASC
            `
            ,
            [req.workspaceId]
          );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load life insurances" });
    }
  });

  app.post("/life-insurances", async (req, res) => {
    const entityId = normalizeRequiredText(req.body?.entity_id);
    const provider = normalizeRequiredText(req.body?.provider);
    const policyName = normalizeRequiredText(req.body?.policy_name);
    const insuredPerson = normalizeRequiredText(req.body?.insured_person);
    const coverageAmount = normalizeAmount(req.body?.coverage_amount);
    const cashSurrenderValue =
      req.body?.cash_surrender_value === null ||
      req.body?.cash_surrender_value === undefined ||
      req.body?.cash_surrender_value === ""
        ? 0
        : normalizeAmount(req.body?.cash_surrender_value);
    const premiumAmount = normalizeAmount(req.body?.premium_amount);
    const paymentFrequency = normalizeFrequency(req.body?.payment_frequency);
    const renewalDate = normalizeOptionalDate(req.body?.renewal_date);
    const notes = normalizeOptionalText(req.body?.notes);
    const isActive =
      req.body?.is_active === undefined ? 1 : normalizeActiveFlag(req.body?.is_active);

    if (
      !entityId ||
      !provider ||
      !policyName ||
      !insuredPerson ||
      coverageAmount === null ||
      cashSurrenderValue === null ||
      premiumAmount === null ||
      !paymentFrequency ||
      isActive === null
    ) {
      return res.status(400).json({ error: "Invalid life insurance payload" });
    }
    if (req.body?.renewal_date && !renewalDate) {
      return res.status(400).json({ error: "Invalid renewal date" });
    }

    try {
      const entity = await get(
        "SELECT id FROM entities WHERE id = ? AND workspace_id = ? LIMIT 1",
        [entityId, req.workspaceId]
      );
      if (!entity) {
        return res.status(400).json({ error: "Entity not found" });
      }

      const nowIso = new Date().toISOString();
      const result = await run(
        `
        INSERT INTO life_insurances (
          entity_id,
          provider,
          policy_name,
          insured_person,
          coverage_amount,
          cash_surrender_value,
          premium_amount,
          payment_frequency,
          renewal_date,
          notes,
          is_active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          entityId,
          provider,
          policyName,
          insuredPerson,
          coverageAmount,
          cashSurrenderValue,
          premiumAmount,
          paymentFrequency,
          renewalDate,
          notes,
          isActive,
          nowIso,
          nowIso,
        ]
      );

      const row = await get(
        `
        SELECT
          li.id,
          li.entity_id,
          e.name AS entity_name,
          e.type AS entity_type,
          li.provider,
          li.policy_name,
          li.insured_person,
          li.coverage_amount,
          li.cash_surrender_value,
          li.premium_amount,
          li.payment_frequency,
          li.renewal_date,
          li.notes,
          li.is_active,
          li.created_at,
          li.updated_at
        FROM life_insurances li
        LEFT JOIN entities e ON e.id = li.entity_id
        WHERE li.id = ?
        LIMIT 1
        `,
        [result.lastID]
      );
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create life insurance" });
    }
  });

  app.put("/life-insurances/:id", async (req, res) => {
    const id = Number(req.params?.id);
    const entityId = normalizeRequiredText(req.body?.entity_id);
    const provider = normalizeRequiredText(req.body?.provider);
    const policyName = normalizeRequiredText(req.body?.policy_name);
    const insuredPerson = normalizeRequiredText(req.body?.insured_person);
    const coverageAmount = normalizeAmount(req.body?.coverage_amount);
    const cashSurrenderValue =
      req.body?.cash_surrender_value === null ||
      req.body?.cash_surrender_value === undefined ||
      req.body?.cash_surrender_value === ""
        ? 0
        : normalizeAmount(req.body?.cash_surrender_value);
    const premiumAmount = normalizeAmount(req.body?.premium_amount);
    const paymentFrequency = normalizeFrequency(req.body?.payment_frequency);
    const renewalDate = normalizeOptionalDate(req.body?.renewal_date);
    const notes = normalizeOptionalText(req.body?.notes);
    const isActive = normalizeActiveFlag(req.body?.is_active);

    if (
      Number.isNaN(id) ||
      !entityId ||
      !provider ||
      !policyName ||
      !insuredPerson ||
      coverageAmount === null ||
      cashSurrenderValue === null ||
      premiumAmount === null ||
      !paymentFrequency ||
      isActive === null
    ) {
      return res.status(400).json({ error: "Invalid life insurance payload" });
    }
    if (req.body?.renewal_date && !renewalDate) {
      return res.status(400).json({ error: "Invalid renewal date" });
    }

    try {
      const existing = await get(
        `
        SELECT li.id
        FROM life_insurances li
        INNER JOIN entities e ON e.id = li.entity_id
        WHERE li.id = ? AND e.workspace_id = ?
        LIMIT 1
        `,
        [id, req.workspaceId]
      );
      if (!existing) {
        return res.status(404).json({ error: "Life insurance not found" });
      }

      const entity = await get(
        "SELECT id FROM entities WHERE id = ? AND workspace_id = ? LIMIT 1",
        [entityId, req.workspaceId]
      );
      if (!entity) {
        return res.status(400).json({ error: "Entity not found" });
      }

      await run(
        `
        UPDATE life_insurances
        SET
          entity_id = ?,
          provider = ?,
          policy_name = ?,
          insured_person = ?,
          coverage_amount = ?,
          cash_surrender_value = ?,
          premium_amount = ?,
          payment_frequency = ?,
          renewal_date = ?,
          notes = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [
          entityId,
          provider,
          policyName,
          insuredPerson,
          coverageAmount,
          cashSurrenderValue,
          premiumAmount,
          paymentFrequency,
          renewalDate,
          notes,
          isActive,
          new Date().toISOString(),
          id,
        ]
      );

      const row = await get(
        `
        SELECT
          li.id,
          li.entity_id,
          e.name AS entity_name,
          e.type AS entity_type,
          li.provider,
          li.policy_name,
          li.insured_person,
          li.coverage_amount,
          li.cash_surrender_value,
          li.premium_amount,
          li.payment_frequency,
          li.renewal_date,
          li.notes,
          li.is_active,
          li.created_at,
          li.updated_at
        FROM life_insurances li
        LEFT JOIN entities e ON e.id = li.entity_id
        WHERE li.id = ?
        LIMIT 1
        `,
        [id]
      );
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update life insurance" });
    }
  });

  app.delete("/life-insurances/:id", async (req, res) => {
    const id = Number(req.params?.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid life insurance id" });
    }

    try {
      const result = await run("DELETE FROM life_insurances WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Life insurance not found" });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete life insurance" });
    }
  });
}

module.exports = {
  registerInsuranceRoutes,
};
