function registerDebtRoutes(app, deps) {
  const {
    all,
    get,
    run,
    getEntityById,
    hasEntityFilter,
    isValidDate,
    isValidMonthKey,
    normalizeEntityId,
    normalizeOptionalString,
    parseCsvAmount,
    parseCsvRows,
    parseDayOfMonth,
    pickCategoryColor,
    pickCsvValue,
    resolveWriteEntityId,
    normalizeCsvHeader,
    isCsvRowEmpty,
  } = deps;

  app.get("/debts", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    if (filterActive && !entityId) {
      return res.status(400).json({ error: "Invalid debt filters" });
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
          d.id,
          d.amount,
          d.name,
          d.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          d.loan_origin,
          d.notes,
          d.spent_at,
          d.statement_month,
          d.created_at,
          d.debt_category_id,
          c.name AS debt_category_name
        FROM debts d
        LEFT JOIN entities ent ON d.entity_id = ent.id
        LEFT JOIN categories c ON d.debt_category_id = c.id
        ${entityId ? "WHERE d.entity_id = ?" : ""}
        ORDER BY d.spent_at DESC, d.id DESC
        `,
        entityId ? [entityId] : []
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load debts" });
    }
  });

  app.get("/debt-origins", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    if (filterActive && !entityId) {
      return res.status(400).json({ error: "Invalid debt origin filters" });
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
          d1.loan_origin,
          d1.name AS last_name,
          d1.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          d1.amount AS last_amount,
          d1.debt_category_id AS last_category_id,
          c.name AS last_category_name
        FROM debts d1
        LEFT JOIN entities ent ON d1.entity_id = ent.id
        LEFT JOIN categories c ON d1.debt_category_id = c.id
        WHERE d1.loan_origin IS NOT NULL AND d1.loan_origin <> '' AND d1.amount > 0
        ${entityId ? "AND d1.entity_id = ?" : ""}
        AND d1.id = (
          SELECT d2.id
          FROM debts d2
          WHERE d2.loan_origin = d1.loan_origin AND d2.amount > 0
          ${entityId ? "AND d2.entity_id = ?" : ""}
          ORDER BY d2.spent_at DESC, d2.id DESC
          LIMIT 1
        )
        ORDER BY d1.loan_origin ASC
        `,
        entityId ? [entityId, entityId] : []
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load debt origins" });
    }
  });

  app.get("/loan-origin-configs", async (req, res) => {
    const filterActive = hasEntityFilter(req.query);
    const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
    if (filterActive && !entityId) {
      return res.status(400).json({ error: "Invalid loan origin filters" });
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
          origins.loan_origin,
          c.statement_day,
          c.due_day,
          COALESCE(debt_counts.debt_count, 0) AS debt_count
        FROM (
          SELECT DISTINCT loan_origin
          FROM debts
          WHERE loan_origin IS NOT NULL AND TRIM(loan_origin) <> ''
          ${entityId ? "AND entity_id = ?" : ""}
          UNION
          SELECT loan_origin
          FROM loan_origin_configs
        ) origins
        LEFT JOIN loan_origin_configs c
          ON c.loan_origin = origins.loan_origin
        LEFT JOIN (
          SELECT loan_origin, COUNT(*) AS debt_count
          FROM debts
          WHERE loan_origin IS NOT NULL AND TRIM(loan_origin) <> ''
          ${entityId ? "AND entity_id = ?" : ""}
          GROUP BY loan_origin
        ) debt_counts
          ON debt_counts.loan_origin = origins.loan_origin
        WHERE origins.loan_origin IS NOT NULL AND TRIM(origins.loan_origin) <> ''
        ORDER BY origins.loan_origin ASC
        `,
        entityId ? [entityId, entityId] : []
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load loan origin configs" });
    }
  });

  app.put("/loan-origin-configs", async (req, res) => {
    const loanOrigin =
      typeof req.body?.loan_origin === "string"
        ? req.body.loan_origin.trim()
        : "";
    const previousLoanOrigin =
      typeof req.body?.previous_loan_origin === "string"
        ? req.body.previous_loan_origin.trim()
        : "";
    const statementDay = parseDayOfMonth(req.body?.statement_day);
    const dueDay = parseDayOfMonth(req.body?.due_day);

    if (!loanOrigin) {
      return res.status(400).json({ error: "loan_origin is required" });
    }
    if (!statementDay.valid || !dueDay.valid) {
      return res.status(400).json({
        error: "statement_day and due_day must be integers from 1 to 31",
      });
    }

    try {
      if (previousLoanOrigin && previousLoanOrigin !== loanOrigin) {
        const existingTarget = await get(
          "SELECT loan_origin FROM loan_origin_configs WHERE loan_origin = ?",
          [loanOrigin]
        );
        if (existingTarget) {
          return res.status(400).json({
            error: "loan_origin already exists",
          });
        }

        await run("UPDATE debts SET loan_origin = ? WHERE loan_origin = ?", [
          loanOrigin,
          previousLoanOrigin,
        ]);
        await run("DELETE FROM loan_origin_configs WHERE loan_origin = ?", [
          previousLoanOrigin,
        ]);
      }

      const updatedAt = new Date().toISOString();
      await run(
        `
        INSERT INTO loan_origin_configs (loan_origin, statement_day, due_day, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(loan_origin)
        DO UPDATE SET
          statement_day = excluded.statement_day,
          due_day = excluded.due_day,
          updated_at = excluded.updated_at
        `,
        [loanOrigin, statementDay.value, dueDay.value, updatedAt]
      );

      const row = await get(
        `
        SELECT loan_origin, statement_day, due_day
        FROM loan_origin_configs
        WHERE loan_origin = ?
        `,
        [loanOrigin]
      );
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to save loan origin config" });
    }
  });

  app.delete("/loan-origin-configs/:loanOrigin", async (req, res) => {
    const loanOrigin =
      typeof req.params?.loanOrigin === "string"
        ? decodeURIComponent(req.params.loanOrigin).trim()
        : "";
    if (!loanOrigin) {
      return res.status(400).json({ error: "loan_origin is required" });
    }

    try {
      const clearDebtsResult = await run(
        "UPDATE debts SET loan_origin = NULL WHERE loan_origin = ?",
        [loanOrigin]
      );
      const deleteConfigResult = await run(
        "DELETE FROM loan_origin_configs WHERE loan_origin = ?",
        [loanOrigin]
      );
      if (clearDebtsResult.changes === 0 && deleteConfigResult.changes === 0) {
        return res.status(404).json({ error: "Loan origin config not found" });
      }
      res.json({
        ok: true,
        removed_loan_origin: loanOrigin,
        cleared_debts: clearDebtsResult.changes,
        removed_config: deleteConfigResult.changes,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete loan origin config" });
    }
  });

  app.post("/debts", async (req, res) => {
    const {
      amount,
      name,
      loan_origin,
      notes,
      spent_at,
      debt_category_id,
      statement_month,
      entity_id,
    } = req.body;
    const parsedAmount = Number(amount);
    const debtName = typeof name === "string" ? name.trim() : "";
    const statementMonthValue =
      typeof statement_month === "string" && statement_month.trim()
        ? statement_month.trim()
        : null;
    const categoryId =
      debt_category_id === null || debt_category_id === undefined
        ? null
        : Number(debt_category_id);
    if (
      Number.isNaN(parsedAmount) ||
      !debtName ||
      !isValidDate(spent_at) ||
      (statementMonthValue !== null && !isValidMonthKey(statementMonthValue)) ||
      (categoryId !== null && Number.isNaN(categoryId))
    ) {
      return res.status(400).json({ error: "Invalid debt payload" });
    }

    try {
      const resolvedEntityId = await resolveWriteEntityId(entity_id);
      if (!resolvedEntityId) {
        return res.status(400).json({ error: "Invalid debt payload" });
      }
      const createdAt = new Date().toISOString();
      const result = await run(
        "INSERT INTO debts (amount, name, loan_origin, notes, spent_at, statement_month, created_at, debt_category_id, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          parsedAmount,
          debtName,
          loan_origin ? String(loan_origin).trim() : null,
          notes || null,
          spent_at,
          statementMonthValue,
          createdAt,
          categoryId,
          resolvedEntityId,
        ]
      );

      const row = await get(
        `
        SELECT
          d.id,
          d.amount,
          d.name,
          d.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          d.loan_origin,
          d.notes,
          d.spent_at,
          d.statement_month,
          d.created_at,
          d.debt_category_id,
          c.name AS debt_category_name
        FROM debts d
        LEFT JOIN entities ent ON d.entity_id = ent.id
        LEFT JOIN categories c ON d.debt_category_id = c.id
        WHERE d.id = ?
        `,
        [result.lastID]
      );

      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to add debt" });
    }
  });

  app.put("/debts/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { amount, name, loan_origin, notes, spent_at, debt_category_id } = req.body;
    const parsedAmount = Number(amount);
    const debtName = typeof name === "string" ? name.trim() : "";
    const loanOrigin =
      typeof loan_origin === "string" && loan_origin.trim()
        ? loan_origin.trim()
        : null;
    const categoryId =
      debt_category_id === null || debt_category_id === undefined
        ? null
        : Number(debt_category_id);

    if (
      Number.isNaN(id) ||
      Number.isNaN(parsedAmount) ||
      !debtName ||
      !isValidDate(spent_at) ||
      (categoryId !== null && Number.isNaN(categoryId))
    ) {
      return res.status(400).json({ error: "Invalid debt update payload" });
    }

    try {
      const result = await run(
        `
        UPDATE debts
        SET
          amount = ?,
          name = ?,
          loan_origin = ?,
          notes = ?,
          spent_at = ?,
          debt_category_id = ?
        WHERE id = ?
        `,
        [parsedAmount, debtName, loanOrigin, notes || null, spent_at, categoryId, id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: "Debt not found" });
      }

      const row = await get(
        `
        SELECT
          d.id,
          d.amount,
          d.name,
          d.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          d.loan_origin,
          d.notes,
          d.spent_at,
          d.statement_month,
          d.created_at,
          d.debt_category_id,
          c.name AS debt_category_name
        FROM debts d
        LEFT JOIN entities ent ON d.entity_id = ent.id
        LEFT JOIN categories c ON d.debt_category_id = c.id
        WHERE d.id = ?
        `,
        [id]
      );
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update debt" });
    }
  });

  app.post("/debts/payoff", async (req, res) => {
    const loanOrigin =
      typeof req.body?.loan_origin === "string" ? req.body.loan_origin.trim() : "";
    const paymentDate =
      typeof req.body?.payment_date === "string" ? req.body.payment_date.trim() : "";
    const statementMonthRaw =
      typeof req.body?.statement_month === "string"
        ? req.body.statement_month.trim()
        : "";
    const statementMonth = statementMonthRaw || paymentDate.slice(0, 7);
    const parsedAmount = Number(req.body?.amount);
    const requestedEntityId = normalizeEntityId(req.body?.entity_id);

    if (
      !loanOrigin ||
      !isValidDate(paymentDate) ||
      !isValidMonthKey(statementMonth) ||
      Number.isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return res.status(400).json({ error: "Invalid debt payoff payload" });
    }

    try {
      const resolvedEntityId = await resolveWriteEntityId(requestedEntityId);
      if (!resolvedEntityId) {
        return res.status(400).json({ error: "Invalid debt payoff payload" });
      }
      const totalRow = await get(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM debts WHERE loan_origin = ? AND entity_id = ?",
        [loanOrigin, resolvedEntityId]
      );
      const outstandingTotal = Number(totalRow?.total ?? 0);
      if (outstandingTotal <= 0) {
        return res.status(400).json({
          error: `No outstanding debt balance for ${loanOrigin}`,
        });
      }
      if (parsedAmount > outstandingTotal) {
        return res.status(400).json({
          error: `Payoff amount exceeds outstanding balance for ${loanOrigin}`,
        });
      }

      const createdAt = new Date().toISOString();
      const expenseName = `Debt Payment - ${loanOrigin}`;
      const paymentAmount = Number(parsedAmount.toFixed(2));

      const expenseResult = await run(
        "INSERT INTO expenses (amount, category, notes, spent_at, created_at, expense_category_id, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          paymentAmount,
          expenseName,
          `Debt payoff for ${loanOrigin}`,
          paymentDate,
          createdAt,
          null,
          resolvedEntityId,
        ]
      );

      let debtResult = null;
      try {
        debtResult = await run(
          "INSERT INTO debts (amount, name, loan_origin, notes, spent_at, statement_month, created_at, debt_category_id, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            -Math.abs(paymentAmount),
            "Debt Payment",
            loanOrigin,
            `Recorded payoff via expense #${expenseResult.lastID}`,
            paymentDate,
            statementMonth,
            createdAt,
            null,
            resolvedEntityId,
          ]
        );
      } catch (err) {
        await run("DELETE FROM expenses WHERE id = ?", [expenseResult.lastID]);
        throw err;
      }

      const expenseRow = await get(
        `
        SELECT
          e.id,
          e.amount,
          e.category AS name,
          e.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          e.notes,
          e.spent_at,
          e.created_at,
          e.expense_category_id,
          e.expense_expectation,
          c.name AS expense_category_name
        FROM expenses e
        LEFT JOIN entities ent ON e.entity_id = ent.id
        LEFT JOIN categories c ON e.expense_category_id = c.id
        WHERE e.id = ?
        `,
        [expenseResult.lastID]
      );

      const debtRow = await get(
        `
        SELECT
          d.id,
          d.amount,
          d.name,
          d.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          d.loan_origin,
          d.notes,
          d.spent_at,
          d.statement_month,
          d.created_at,
          d.debt_category_id,
          c.name AS debt_category_name
        FROM debts d
        LEFT JOIN entities ent ON d.entity_id = ent.id
        LEFT JOIN categories c ON d.debt_category_id = c.id
        WHERE d.id = ?
        `,
        [debtResult.lastID]
      );

      res.status(201).json({
        loan_origin: loanOrigin,
        amount: paymentAmount,
        payment_date: paymentDate,
        statement_month: statementMonth,
        outstanding_before: outstandingTotal,
        outstanding_after: Number((outstandingTotal - paymentAmount).toFixed(2)),
        expense: expenseRow,
        debt: debtRow,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to record debt payoff" });
    }
  });

  app.post("/debts/import-csv", async (req, res) => {
    const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
    const defaultLoanOrigin = normalizeOptionalString(req.body?.default_loan_origin);
    const defaultCategoryRaw = req.body?.default_debt_category_id;
    const defaultCategoryId =
      defaultCategoryRaw === null ||
      defaultCategoryRaw === undefined ||
      defaultCategoryRaw === ""
        ? null
        : Number(defaultCategoryRaw);
    const requestedEntityId = normalizeEntityId(req.body?.entity_id);

    if (!csv.trim()) {
      return res.status(400).json({ error: "csv is required" });
    }
    if (defaultCategoryId !== null && Number.isNaN(defaultCategoryId)) {
      return res.status(400).json({ error: "default_debt_category_id must be numeric" });
    }

    try {
      const resolvedEntityId = await resolveWriteEntityId(requestedEntityId);
      if (!resolvedEntityId) {
        return res.status(400).json({ error: "Invalid debt import payload" });
      }
      if (defaultCategoryId !== null) {
        const defaultCategory = await get(
          "SELECT id FROM categories WHERE id = ?",
          [defaultCategoryId]
        );
        if (!defaultCategory) {
          return res.status(400).json({
            error: "default_debt_category_id does not match an existing category",
          });
        }
      }

      const parsedRows = parseCsvRows(csv);
      const populatedRows = parsedRows.filter((row) => !isCsvRowEmpty(row.cells));
      if (populatedRows.length < 2) {
        return res.status(400).json({
          error: "CSV must include a header row and at least one data row",
        });
      }

      const headerRow = populatedRows[0];
      const headers = headerRow.cells.map(normalizeCsvHeader);
      const hasNameColumn =
        headers.includes("description") ||
        headers.includes("name") ||
        headers.includes("merchant");
      const hasAmountColumn = headers.includes("amount");
      const hasDateColumn = headers.includes("date") || headers.includes("spent_at");
      const hasPostDateColumn =
        headers.includes("post_date") || headers.includes("posted_date");
      const missingHeaders = [];
      if (!hasNameColumn) {
        missingHeaders.push("description");
      }
      if (!hasAmountColumn) {
        missingHeaders.push("amount");
      }
      if (!hasDateColumn && !hasPostDateColumn) {
        missingHeaders.push("date");
      }
      if (missingHeaders.length > 0) {
        return res.status(400).json({
          error: `Missing required CSV header(s): ${missingHeaders.join(", ")}`,
        });
      }

      const categoryRows = await all("SELECT id, name FROM categories ORDER BY id ASC");
      const categoryNameMap = new Map(
        categoryRows.map((row) => [String(row.name).trim().toLowerCase(), row.id])
      );

      const errors = [];
      let importedCount = 0;

      for (const entry of populatedRows.slice(1)) {
        const row = {};
        headers.forEach((header, index) => {
          if (header) {
            row[header] = (entry.cells[index] || "").trim();
          }
        });

        const spentAt = pickCsvValue(row, [
          "spent_at",
          "date",
          "transaction_date",
          "purchase_date",
          "post_date",
          "posted_date",
        ]);
        const name = pickCsvValue(row, ["name", "description", "merchant"]);
        const amount = parseCsvAmount(
          pickCsvValue(row, ["amount", "debt_amount", "debit_amount", "value"])
        );

        if (!isValidDate(spentAt || "")) {
          errors.push({
            line: entry.line,
            error: "Invalid or missing date (expected YYYY-MM-DD)",
          });
          continue;
        }
        if (!name) {
          errors.push({
            line: entry.line,
            error: "Missing description/name",
          });
          continue;
        }
        if (Number.isNaN(amount)) {
          errors.push({
            line: entry.line,
            error: "Invalid or missing amount",
          });
          continue;
        }

        let categoryId = defaultCategoryId;
        const rowCategoryIdRaw = pickCsvValue(row, [
          "debt_category_id",
          "category_id",
        ]);
        if (rowCategoryIdRaw !== null) {
          const parsedCategoryId = Number(rowCategoryIdRaw);
          if (Number.isNaN(parsedCategoryId)) {
            errors.push({
              line: entry.line,
              error: "debt_category_id must be numeric when provided",
            });
            continue;
          }
          const categoryById = await get("SELECT id FROM categories WHERE id = ?", [
            parsedCategoryId,
          ]);
          if (!categoryById) {
            errors.push({
              line: entry.line,
              error: `Unknown debt_category_id: ${parsedCategoryId}`,
            });
            continue;
          }
          categoryId = parsedCategoryId;
        } else {
          const rowCategoryName = normalizeOptionalString(
            pickCsvValue(row, ["debt_category", "category"])
          );
          if (rowCategoryName) {
            const key = rowCategoryName.toLowerCase();
            if (!categoryNameMap.has(key)) {
              const created = await run(
                "INSERT INTO categories (name, color) VALUES (?, ?)",
                [rowCategoryName, pickCategoryColor(rowCategoryName)]
              );
              categoryNameMap.set(key, created.lastID);
            }
            categoryId = categoryNameMap.get(key);
          }
        }

        const rowLoanOrigin =
          normalizeOptionalString(
            pickCsvValue(row, ["loan_origin", "origin", "lender"])
          ) || defaultLoanOrigin;
        const rowNotes =
          normalizeOptionalString(pickCsvValue(row, ["notes", "note", "memo"])) ||
          null;

        const createdAt = new Date().toISOString();
        await run(
          "INSERT INTO debts (amount, name, loan_origin, notes, spent_at, statement_month, created_at, debt_category_id, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            amount,
            name,
            rowLoanOrigin,
            rowNotes,
            spentAt,
            null,
            createdAt,
            categoryId,
            resolvedEntityId,
          ]
        );
        importedCount += 1;
      }

      if (importedCount === 0 && errors.length > 0) {
        return res.status(400).json({
          error: "No debt rows were imported",
          imported_count: 0,
          skipped_count: errors.length,
          errors,
        });
      }

      res.status(201).json({
        imported_count: importedCount,
        skipped_count: errors.length,
        total_rows: populatedRows.length - 1,
        errors,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to import debts from CSV" });
    }
  });

  app.delete("/debts/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid debt id" });
    }
    try {
      const result = await run("DELETE FROM debts WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Debt not found" });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete debt" });
    }
  });

  app.put("/debts/:id/category", async (req, res) => {
    const id = Number(req.params.id);
    const { debt_category_id } = req.body;
    const categoryId =
      debt_category_id === null || debt_category_id === undefined
        ? null
        : Number(debt_category_id);
    if (Number.isNaN(id) || (categoryId !== null && Number.isNaN(categoryId))) {
      return res.status(400).json({ error: "Invalid debt category update" });
    }
    try {
      const result = await run(
        "UPDATE debts SET debt_category_id = ? WHERE id = ?",
        [categoryId, id]
      );
      if (result.changes === 0) {
        return res.status(404).json({ error: "Debt not found" });
      }
      const row = await get(
        `
        SELECT
          d.id,
          d.amount,
          d.name,
          d.entity_id,
          ent.name AS entity_name,
          ent.type AS entity_type,
          d.loan_origin,
          d.notes,
          d.spent_at,
          d.statement_month,
          d.created_at,
          d.debt_category_id,
          c.name AS debt_category_name
        FROM debts d
        LEFT JOIN entities ent ON d.entity_id = ent.id
        LEFT JOIN categories c ON d.debt_category_id = c.id
        WHERE d.id = ?
        `,
        [id]
      );
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update debt category" });
    }
  });
}

module.exports = {
  registerDebtRoutes,
};
