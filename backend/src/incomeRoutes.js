const { resolveEntityDefaultAccountId } = require("./accountPreferences");

function registerIncomeRoutes(app, deps) {
  const {
    all,
    get,
    run,
    hasEntityFilter,
    normalizeEntityId,
    getEntityById,
    isValidDate,
    resolveWriteEntityId,
  } = deps;

  async function resolveIncomeAccountId(rawAccountId, entityId, keepNull = false) {
    if (rawAccountId !== undefined) {
      if (rawAccountId === null || rawAccountId === "") {
        if (keepNull) {
          return { accountId: null };
        }
        const fallbackAccountId = await resolveEntityDefaultAccountId({
          get,
          all,
          entityId,
          kind: "income",
        });
        return { accountId: fallbackAccountId };
      }
      const parsedAccountId = Number(rawAccountId);
      if (!Number.isInteger(parsedAccountId) || parsedAccountId <= 0) {
        return { error: "Invalid income account selection" };
      }
      const account = await get(
        "SELECT id, entity_id FROM accounts WHERE id = ? LIMIT 1",
        [parsedAccountId]
      );
      if (!account || String(account.entity_id || "") !== String(entityId || "")) {
        return { error: "Selected income account does not belong to the entity" };
      }
      return { accountId: parsedAccountId };
    }
    const fallbackAccountId = await resolveEntityDefaultAccountId({
      get,
      all,
      entityId,
      kind: "income",
    });
    return { accountId: fallbackAccountId };
  }

  app.get("/income", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    if (filterActive && !entityId) {
      return res.status(400).json({ error: "Invalid income filters" });
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
          i.id,
          i.amount,
          i.source,
          i.received_date,
          i.entity_id,
          e.name AS entity_name,
          e.type AS entity_type,
          i.to_account_id,
          a.name AS to_account_name,
          i.income_category_id,
          c.name AS income_category_name
        FROM income i
        LEFT JOIN entities e ON i.entity_id = e.id
        LEFT JOIN accounts a ON i.to_account_id = a.id
        LEFT JOIN income_categories c ON i.income_category_id = c.id
        ${entityId ? "WHERE i.entity_id = ?" : ""}
        ORDER BY i.received_date DESC, i.id DESC
        `,
        entityId ? [entityId] : []
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load income" });
    }
  });

  app.post("/income", async (req, res) => {
    const {
      amount,
      source,
      received_date,
      income_category_id,
      entity_id,
      to_account_id,
    } = req.body;
    const parsedAmount = Number(amount);
    const categoryId =
      income_category_id === null || income_category_id === undefined
        ? null
        : Number(income_category_id);
    if (
      Number.isNaN(parsedAmount) ||
      !source ||
      !isValidDate(received_date) ||
      (categoryId !== null && Number.isNaN(categoryId))
    ) {
      return res.status(400).json({ error: "Invalid income payload" });
    }

    try {
      const resolvedEntityId = await resolveWriteEntityId(entity_id);
      if (!resolvedEntityId) {
        return res.status(400).json({ error: "Invalid income payload" });
      }
      const postingAccount = await resolveIncomeAccountId(
        to_account_id,
        resolvedEntityId
      );
      if (postingAccount.error) {
        return res.status(400).json({ error: postingAccount.error });
      }
      if (categoryId !== null) {
        const category = await get("SELECT id FROM income_categories WHERE id = ?", [
          categoryId,
        ]);
        if (!category) {
          return res.status(400).json({ error: "Invalid income payload" });
        }
      }
      const result = await run(
        "INSERT INTO income (amount, source, received_date, income_category_id, entity_id, to_account_id) VALUES (?, ?, ?, ?, ?, ?)",
        [
          parsedAmount,
          source.trim(),
          received_date,
          categoryId,
          resolvedEntityId,
          postingAccount.accountId,
        ]
      );

      const row = await get(
        `
        SELECT
          i.id,
          i.amount,
          i.source,
          i.received_date,
          i.entity_id,
          e.name AS entity_name,
          e.type AS entity_type,
          i.to_account_id,
          a.name AS to_account_name,
          i.income_category_id,
          c.name AS income_category_name
        FROM income i
        LEFT JOIN entities e ON i.entity_id = e.id
        LEFT JOIN accounts a ON i.to_account_id = a.id
        LEFT JOIN income_categories c ON i.income_category_id = c.id
        WHERE i.id = ?
        `,
        [result.lastID]
      );

      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to add income" });
    }
  });

  app.put("/income/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { amount, source, received_date, income_category_id, to_account_id } = req.body;
    const parsedAmount = Number(amount);
    const incomeSource =
      typeof source === "string" && source.trim() ? source.trim() : "";
    const categoryId =
      income_category_id === null || income_category_id === undefined
        ? null
        : Number(income_category_id);

    if (
      Number.isNaN(id) ||
      Number.isNaN(parsedAmount) ||
      !incomeSource ||
      !isValidDate(received_date) ||
      (categoryId !== null && Number.isNaN(categoryId))
    ) {
      return res.status(400).json({ error: "Invalid income update payload" });
    }

    try {
      if (categoryId !== null) {
        const category = await get("SELECT id FROM income_categories WHERE id = ?", [
          categoryId,
        ]);
        if (!category) {
          return res.status(400).json({ error: "Invalid income update payload" });
        }
      }
      const existing = await get(
        "SELECT id, entity_id, to_account_id FROM income WHERE id = ?",
        [id]
      );
      if (!existing) {
        return res.status(404).json({ error: "Income not found" });
      }
      const postingAccount = await resolveIncomeAccountId(
        Object.prototype.hasOwnProperty.call(req.body ?? {}, "to_account_id")
          ? to_account_id
          : existing.to_account_id,
        existing.entity_id,
        !Object.prototype.hasOwnProperty.call(req.body ?? {}, "to_account_id")
      );
      if (postingAccount.error) {
        return res.status(400).json({ error: postingAccount.error });
      }
      const result = await run(
        "UPDATE income SET amount = ?, source = ?, received_date = ?, income_category_id = ?, to_account_id = ? WHERE id = ?",
        [parsedAmount, incomeSource, received_date, categoryId, postingAccount.accountId, id]
      );
      if (result.changes === 0) {
        return res.status(404).json({ error: "Income not found" });
      }

      const row = await get(
        `
        SELECT
          i.id,
          i.amount,
          i.source,
          i.received_date,
          i.entity_id,
          e.name AS entity_name,
          e.type AS entity_type,
          i.to_account_id,
          a.name AS to_account_name,
          i.income_category_id,
          c.name AS income_category_name
        FROM income i
        LEFT JOIN entities e ON i.entity_id = e.id
        LEFT JOIN accounts a ON i.to_account_id = a.id
        LEFT JOIN income_categories c ON i.income_category_id = c.id
        WHERE i.id = ?
        `,
        [id]
      );
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update income" });
    }
  });

  app.delete("/income/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid income id" });
    }
    try {
      const result = await run("DELETE FROM income WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Income not found" });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete income" });
    }
  });

  app.put("/income/:id/category", async (req, res) => {
    const id = Number(req.params.id);
    const { income_category_id } = req.body;
    const categoryId =
      income_category_id === null || income_category_id === undefined
        ? null
        : Number(income_category_id);
    if (Number.isNaN(id) || (categoryId !== null && Number.isNaN(categoryId))) {
      return res.status(400).json({ error: "Invalid income category update" });
    }

    try {
      if (categoryId !== null) {
        const category = await get("SELECT id FROM income_categories WHERE id = ?", [
          categoryId,
        ]);
        if (!category) {
          return res.status(400).json({ error: "Invalid income category update" });
        }
      }

      const result = await run(
        "UPDATE income SET income_category_id = ? WHERE id = ?",
        [categoryId, id]
      );
      if (result.changes === 0) {
        return res.status(404).json({ error: "Income not found" });
      }
      const row = await get(
        `
        SELECT
          i.id,
          i.amount,
          i.source,
          i.received_date,
          i.entity_id,
          e.name AS entity_name,
          e.type AS entity_type,
          i.income_category_id,
          c.name AS income_category_name
        FROM income i
        LEFT JOIN entities e ON i.entity_id = e.id
        LEFT JOIN income_categories c ON i.income_category_id = c.id
        WHERE i.id = ?
        `,
        [id]
      );
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update income category" });
    }
  });
}

module.exports = {
  registerIncomeRoutes,
};
