function registerReportRoutes(app, deps) {
  const {
    all,
    get,
    hasEntityFilter,
    normalizeEntityId,
    getEntityById,
    ensureMonthlyReportsForClosedMonths,
    normalizeMonthlyReportEntityScope,
    buildMonthlyReportForMonth,
    saveMonthlyReport,
    getMonthlyReportRecord,
    getMonthDebtTransactions,
    RECURRING_SELECT,
    buildRecurringReportSnapshot,
    shouldBackfillRecurringSnapshot,
    hasRecurringSnapshotStructure,
    paginateItems,
    getLastClosedMonthKey,
    isValidMonthKey,
    buildCsv,
  } = deps;

  app.get("/monthly-reports", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    if (filterActive && !entityId) {
      return res.status(400).json({ error: "Invalid monthly report filters" });
    }
    const pageRaw = Number(req.query?.page);
    const pageSizeRaw = Number(req.query?.page_size);
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSize =
      Number.isInteger(pageSizeRaw) && pageSizeRaw > 0
        ? Math.min(pageSizeRaw, 120)
        : 24;
    const offset = (page - 1) * pageSize;

    try {
      if (entityId) {
        const entity = await getEntityById(entityId);
        if (!entity) {
          return res.status(404).json({ error: "Entity not found" });
        }
        await ensureMonthlyReportsForClosedMonths(entityId);
      }
      const entityScope = normalizeMonthlyReportEntityScope(entityId);
      const [countRow, rows] = await Promise.all([
        get("SELECT COUNT(*) AS total FROM monthly_reports WHERE entity_id = ?", [
          entityScope,
        ]),
        all(
          `
          SELECT month_key, entity_id, generated_at, updated_at, report_json
          FROM monthly_reports
          WHERE entity_id = ?
          ORDER BY month_key DESC
          LIMIT ? OFFSET ?
          `,
          [entityScope, pageSize, offset]
        ),
      ]);

      const items = rows
        .map((row) => {
          let report = null;
          try {
            report = JSON.parse(String(row.report_json || "{}"));
          } catch (err) {
            report = null;
          }
          if (!report || typeof report !== "object") {
            return null;
          }
          return {
            month_key: row.month_key,
            entity_id: row.entity_id || null,
            generated_at: row.generated_at,
            updated_at: row.updated_at,
            summary: report.summary || null,
            buffer: report.buffer || null,
            projection: report.projection || null,
          };
        })
        .filter(Boolean);

      res.json({
        page,
        page_size: pageSize,
        total: Number(countRow?.total ?? items.length),
        items,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load monthly reports" });
    }
  });

  app.post("/monthly-reports/generate", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const bodyHasEntityId =
      Object.prototype.hasOwnProperty.call(req.body ?? {}, "entity_id") &&
      String(req.body?.entity_id ?? "").trim() !== "";
    const requestedEntityId = bodyHasEntityId
      ? normalizeEntityId(req.body?.entity_id)
      : null;
    const queryEntityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    const entityId = queryEntityId || requestedEntityId || null;
    if ((filterActive && !queryEntityId) || (bodyHasEntityId && !requestedEntityId)) {
      return res.status(400).json({ error: "Invalid monthly report filters" });
    }
    const monthKeyRaw =
      typeof req.body?.month_key === "string" ? req.body.month_key.trim() : "";
    const monthKey = monthKeyRaw || getLastClosedMonthKey();
    if (!monthKey || !isValidMonthKey(monthKey)) {
      return res.status(400).json({ error: "Invalid month_key" });
    }

    try {
      if (entityId) {
        const entity = await getEntityById(entityId);
        if (!entity) {
          return res.status(404).json({ error: "Entity not found" });
        }
      }
      const report = await buildMonthlyReportForMonth(monthKey, entityId);
      const saved = await saveMonthlyReport(monthKey, report, entityId);
      if (!saved) {
        return res.status(500).json({ error: "Failed to save monthly report" });
      }
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate monthly report" });
    }
  });

  app.get("/monthly-reports/:monthKey", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    if (filterActive && !entityId) {
      return res.status(400).json({ error: "Invalid monthly report filters" });
    }
    const monthKey =
      typeof req.params?.monthKey === "string" ? req.params.monthKey.trim() : "";
    if (!isValidMonthKey(monthKey)) {
      return res.status(400).json({ error: "Invalid month key" });
    }

    try {
      if (entityId) {
        const entity = await getEntityById(entityId);
        if (!entity) {
          return res.status(404).json({ error: "Entity not found" });
        }
      }
      let record = await getMonthlyReportRecord(monthKey, entityId);
      if (!record) {
        const report = await buildMonthlyReportForMonth(monthKey, entityId);
        record = await saveMonthlyReport(monthKey, report, entityId);
      }
      if (!record) {
        return res.status(404).json({ error: "Monthly report not found" });
      }

      const [debtList, recurringItems] = await Promise.all([
        getMonthDebtTransactions(monthKey, entityId),
        all(
          `${RECURRING_SELECT}${entityId ? " WHERE r.entity_id = ?" : ""}`,
          entityId ? [entityId] : []
        ),
      ]);
      const computedRecurringSnapshot = buildRecurringReportSnapshot(
        recurringItems,
        record.report?.summary
      );
      let recurringSnapshot = record.report?.recurring;
      if (shouldBackfillRecurringSnapshot(recurringSnapshot, computedRecurringSnapshot)) {
        const patchedReport = {
          ...record.report,
          recurring: computedRecurringSnapshot,
        };
        const saved = await saveMonthlyReport(monthKey, patchedReport, entityId);
        if (saved) {
          record = saved;
        } else {
          record = {
            ...record,
            report: patchedReport,
          };
        }
        recurringSnapshot = computedRecurringSnapshot;
      } else if (!hasRecurringSnapshotStructure(recurringSnapshot)) {
        recurringSnapshot = computedRecurringSnapshot;
      }
      record = {
        ...record,
        report: {
          ...record.report,
          recurring: recurringSnapshot,
          transactionsList: {
            ...(record.report?.transactionsList || {}),
            debts: debtList,
          },
        },
      };

      const hasFilter =
        Object.prototype.hasOwnProperty.call(req.query ?? {}, "transactions_page") ||
        Object.prototype.hasOwnProperty.call(
          req.query ?? {},
          "transactions_page_size"
        ) ||
        Object.prototype.hasOwnProperty.call(req.query ?? {}, "category");

      if (!hasFilter) {
        return res.json(record);
      }

      const pageRaw = Number(req.query?.transactions_page);
      const pageSizeRaw = Number(req.query?.transactions_page_size);
      const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
      const pageSize =
        Number.isInteger(pageSizeRaw) && pageSizeRaw > 0
          ? Math.min(pageSizeRaw, 500)
          : 50;
      const categoryFilter =
        typeof req.query?.category === "string"
          ? req.query.category.trim().toLowerCase()
          : "";

      const incomeList = Array.isArray(record.report?.transactionsList?.income)
        ? record.report.transactionsList.income
        : [];
      const expenseSource = Array.isArray(record.report?.transactionsList?.expenses)
        ? record.report.transactionsList.expenses
        : [];
      const expenseList = categoryFilter
        ? expenseSource.filter(
            (item) =>
              String(item?.category || "").trim().toLowerCase() === categoryFilter
          )
        : expenseSource;

      const incomePage = paginateItems(incomeList, page, pageSize);
      const expensePage = paginateItems(expenseList, page, pageSize);
      const debtPage = paginateItems(debtList, page, pageSize);

      res.json({
        ...record,
        report: {
          ...record.report,
          transactionsList: {
            income: incomePage.items,
            expenses: expensePage.items,
            debts: debtPage.items,
          },
        },
        filters: {
          category: categoryFilter || null,
        },
        pagination: {
          income: {
            page: incomePage.page,
            page_size: incomePage.page_size,
            total: incomePage.total,
          },
          expenses: {
            page: expensePage.page,
            page_size: expensePage.page_size,
            total: expensePage.total,
          },
          debts: {
            page: debtPage.page,
            page_size: debtPage.page_size,
            total: debtPage.total,
          },
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load monthly report" });
    }
  });

  app.get("/exports/:dataset", async (req, res) => {
    const dataset = String(req.params.dataset || "").trim().toLowerCase();
    const exportConfigs = {
      expenses: {
        filename: "expenses.csv",
        columns: [
          "id",
          "amount",
          "name",
          "notes",
          "spent_at",
          "created_at",
          "expense_expectation",
          "expense_category_id",
          "expense_category_name",
        ],
        query: `
          SELECT
            e.id,
            e.amount,
            e.category AS name,
            e.notes,
            e.spent_at,
            e.created_at,
            e.expense_expectation,
            e.expense_category_id,
            c.name AS expense_category_name
          FROM expenses e
          LEFT JOIN categories c ON e.expense_category_id = c.id
          ORDER BY e.spent_at DESC, e.id DESC
        `,
      },
      income: {
        filename: "income.csv",
        columns: [
          "id",
          "amount",
          "source",
          "received_date",
          "income_category_id",
          "income_category_name",
        ],
        query: `
          SELECT
            i.id,
            i.amount,
            i.source,
            i.received_date,
            i.income_category_id,
            c.name AS income_category_name
          FROM income i
          LEFT JOIN income_categories c ON i.income_category_id = c.id
          ORDER BY i.received_date DESC, i.id DESC
        `,
      },
      debts: {
        filename: "debts.csv",
        columns: [
          "id",
          "amount",
          "name",
          "loan_origin",
          "notes",
          "spent_at",
          "statement_month",
          "created_at",
          "debt_category_id",
          "debt_category_name",
        ],
        query: `
          SELECT
            d.id,
            d.amount,
            d.name,
            d.loan_origin,
            d.notes,
            d.spent_at,
            d.statement_month,
            d.created_at,
            d.debt_category_id,
            c.name AS debt_category_name
          FROM debts d
          LEFT JOIN categories c ON d.debt_category_id = c.id
          ORDER BY d.spent_at DESC, d.id DESC
        `,
      },
      recurring: {
        filename: "recurring.csv",
        columns: [
          "id",
          "type",
          "amount",
          "category",
          "expense_category_id",
          "expense_category_name",
          "income_category_id",
          "income_category_name",
          "description",
          "frequency",
          "semi_monthly_day_1",
          "semi_monthly_day_2",
          "next_due_date",
          "last_confirmed_date",
        ],
        query: `${RECURRING_SELECT} ORDER BY r.next_due_date ASC, r.id ASC`,
      },
    };

    const config = exportConfigs[dataset];
    if (!config) {
      return res.status(400).json({ error: "Invalid export dataset" });
    }

    try {
      const rows = await all(config.query);
      const csv = buildCsv(config.columns, rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${config.filename}"`
      );
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });
}

module.exports = {
  registerReportRoutes,
};
