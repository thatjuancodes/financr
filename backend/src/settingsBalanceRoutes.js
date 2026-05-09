const {
  listEntityAccountPreferences,
} = require("./accountPreferences");

function registerSettingsBalanceRoutes(app, deps) {
  const {
    all,
    get,
    run,
    hasEntityFilter,
    normalizeEntityId,
    getEntityById,
    normalizeOptionalAccountId,
    getAccountsTotalBalance,
    RECURRING_SELECT,
    todayISO,
    addDays,
    getUpcomingRecurringExpenseTotal,
  } = deps;

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/settings", async (_req, res) => {
    try {
      const [settings, entityDefaultAccounts] = await Promise.all([
        get(
          `
          SELECT
            base_balance,
            currency_code,
            default_expense_account_id,
            default_income_account_id
          FROM settings
          WHERE id = 1
          `
        ),
        listEntityAccountPreferences(all),
      ]);
      res.json({
        base_balance: settings?.base_balance ?? 0,
        currency_code: settings?.currency_code ?? "USD",
        default_expense_account_id:
          normalizeOptionalAccountId(settings?.default_expense_account_id),
        default_income_account_id:
          normalizeOptionalAccountId(settings?.default_income_account_id),
        entity_default_accounts: entityDefaultAccounts,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load settings" });
    }
  });

  app.put("/settings/base-balance", async (req, res) => {
    const { base_balance } = req.body;
    const amount = Number(base_balance);
    if (Number.isNaN(amount)) {
      return res.status(400).json({ error: "base_balance must be a number" });
    }
    try {
      await run("UPDATE settings SET base_balance = ? WHERE id = 1", [amount]);
      res.json({ base_balance: amount });
    } catch (err) {
      res.status(500).json({ error: "Failed to update base balance" });
    }
  });

  app.put("/settings/currency", async (req, res) => {
    const { currency_code } = req.body;
    const code =
      typeof currency_code === "string" ? currency_code.trim().toUpperCase() : "";
    if (!/^[A-Z]{3}$/.test(code)) {
      return res.status(400).json({ error: "currency_code must be a 3-letter code" });
    }
    try {
      await run("UPDATE settings SET currency_code = ? WHERE id = 1", [code]);
      res.json({ currency_code: code });
    } catch (err) {
      res.status(500).json({ error: "Failed to update currency" });
    }
  });

  app.put("/settings/default-accounts", async (req, res) => {
    const entityId =
      req.body?.entity_id === null || req.body?.entity_id === undefined
        ? null
        : normalizeEntityId(req.body.entity_id);
    const hasExpenseDefault = Object.prototype.hasOwnProperty.call(
      req.body ?? {},
      "default_expense_account_id"
    );
    const hasIncomeDefault = Object.prototype.hasOwnProperty.call(
      req.body ?? {},
      "default_income_account_id"
    );

    if (!hasExpenseDefault && !hasIncomeDefault) {
      return res.status(400).json({
        error:
          "At least one of default_expense_account_id or default_income_account_id is required",
      });
    }

    const rawExpenseDefault = req.body?.default_expense_account_id;
    const rawIncomeDefault = req.body?.default_income_account_id;
    const parsedExpenseDefault = hasExpenseDefault
      ? normalizeOptionalAccountId(rawExpenseDefault)
      : null;
    const parsedIncomeDefault = hasIncomeDefault
      ? normalizeOptionalAccountId(rawIncomeDefault)
      : null;

    if (hasExpenseDefault && parsedExpenseDefault === null) {
      return res.status(400).json({
        error: "default_expense_account_id must be a valid account id",
      });
    }
    if (hasIncomeDefault && parsedIncomeDefault === null) {
      return res.status(400).json({
        error: "default_income_account_id must be a valid account id",
      });
    }

    try {
      if (req.body?.entity_id !== undefined && !entityId) {
        return res.status(400).json({ error: "Invalid entity id" });
      }
      if (entityId) {
        const entity = await getEntityById(entityId);
        if (!entity) {
          return res.status(404).json({ error: "Entity not found" });
        }
      }
      if (hasExpenseDefault) {
        const account = await get("SELECT id, entity_id FROM accounts WHERE id = ? LIMIT 1", [
          parsedExpenseDefault,
        ]);
        if (!account) {
          return res
            .status(404)
            .json({ error: "Default expense account does not exist" });
        }
        if (entityId && String(account.entity_id || "") !== entityId) {
          return res
            .status(400)
            .json({ error: "Default expense account must belong to the selected entity" });
        }
      }
      if (hasIncomeDefault) {
        const account = await get("SELECT id, entity_id FROM accounts WHERE id = ? LIMIT 1", [
          parsedIncomeDefault,
        ]);
        if (!account) {
          return res
            .status(404)
            .json({ error: "Default income account does not exist" });
        }
        if (entityId && String(account.entity_id || "") !== entityId) {
          return res
            .status(400)
            .json({ error: "Default income account must belong to the selected entity" });
        }
      }

      if (entityId) {
        const existing = await get(
          `
          SELECT default_expense_account_id, default_income_account_id
          FROM entity_account_preferences
          WHERE entity_id = ?
          `,
          [entityId]
        );
        await run(
          `
          INSERT INTO entity_account_preferences (
            entity_id,
            default_expense_account_id,
            default_income_account_id
          )
          VALUES (?, ?, ?)
          ON CONFLICT(entity_id)
          DO UPDATE SET
            default_expense_account_id = excluded.default_expense_account_id,
            default_income_account_id = excluded.default_income_account_id
          `,
          [
            entityId,
            hasExpenseDefault
              ? parsedExpenseDefault
              : normalizeOptionalAccountId(existing?.default_expense_account_id),
            hasIncomeDefault
              ? parsedIncomeDefault
              : normalizeOptionalAccountId(existing?.default_income_account_id),
          ]
        );
      } else {
        const updateClauses = [];
        const updateParams = [];
        if (hasExpenseDefault) {
          updateClauses.push("default_expense_account_id = ?");
          updateParams.push(parsedExpenseDefault);
        }
        if (hasIncomeDefault) {
          updateClauses.push("default_income_account_id = ?");
          updateParams.push(parsedIncomeDefault);
        }
        updateParams.push(1);
        await run(
          `UPDATE settings SET ${updateClauses.join(", ")} WHERE id = ?`,
          updateParams
        );
      }

      const [settings, entityDefaultAccounts] = await Promise.all([
        get(
          `
          SELECT
            base_balance,
            currency_code,
            default_expense_account_id,
            default_income_account_id
          FROM settings
          WHERE id = 1
          `
        ),
        listEntityAccountPreferences(all),
      ]);

      res.json({
        base_balance: settings?.base_balance ?? 0,
        currency_code: settings?.currency_code ?? "USD",
        default_expense_account_id:
          normalizeOptionalAccountId(settings?.default_expense_account_id),
        default_income_account_id:
          normalizeOptionalAccountId(settings?.default_income_account_id),
        entity_default_accounts: entityDefaultAccounts,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to update default accounts" });
    }
  });

  app.get("/balance", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    if (filterActive && !entityId) {
      return res.status(400).json({ error: "Invalid balance filters" });
    }
    try {
      if (entityId) {
        const entity = await getEntityById(entityId);
        if (!entity) {
          return res.status(404).json({ error: "Entity not found" });
        }
      }
      const settings = await get(
        "SELECT base_balance, currency_code FROM settings WHERE id = 1"
      );
      const accountsTotal = await getAccountsTotalBalance(entityId || null);
      const incomeTotal = await get(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM income WHERE COALESCE(is_transfer_bookkeeping, 0) = 0${
          entityId ? " AND entity_id = ?" : ""
        }`,
        entityId ? [entityId] : []
      );
      const expenseTotal = await get(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE COALESCE(is_transfer_bookkeeping, 0) = 0${
          entityId ? " AND entity_id = ?" : ""
        }`,
        entityId ? [entityId] : []
      );
      const debtTotal = await get(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM debts${
          entityId ? " WHERE entity_id = ?" : ""
        }`,
        entityId ? [entityId] : []
      );
      const recurringItems = await all(
        `${RECURRING_SELECT} WHERE r.type = 'expense'${
          entityId ? " AND r.entity_id = ?" : ""
        } ORDER BY r.next_due_date ASC, r.id ASC`,
        entityId ? [entityId] : []
      );
      const today = todayISO();
      const projectionEndDate = addDays(today, 29);
      const upcomingRecurringExpenseTotal = getUpcomingRecurringExpenseTotal(
        recurringItems,
        today,
        projectionEndDate
      );

      const baseBalance = entityId ? 0 : Number(settings?.base_balance ?? 0);
      const balance = accountsTotal;
      const safeToSpend = balance - upcomingRecurringExpenseTotal - debtTotal.total;

      res.json({
        base_balance: baseBalance,
        accounts_total: accountsTotal,
        income_total: incomeTotal.total,
        expense_total: expenseTotal.total,
        debt_total: debtTotal.total,
        balance,
        upcoming_recurring_expense_total: upcomingRecurringExpenseTotal,
        safe_to_spend: safeToSpend,
        safe_to_spend_window_days: 30,
        currency_code: settings?.currency_code ?? "USD",
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to calculate balance" });
    }
  });
}

module.exports = {
  registerSettingsBalanceRoutes,
};
