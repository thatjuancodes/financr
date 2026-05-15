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
    parseCsvAmount,
    parseCsvRows,
    pickCategoryColor,
    pickCsvValue,
    resolveWriteEntityId,
    normalizeCsvHeader,
    isCsvRowEmpty,
  } = deps;

  function normalizeOptionalString(value) {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  }

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

  async function resolveIncomeImportAccountId({
    rawAccountId,
    rawAccountName,
    entityId,
  }) {
    if (rawAccountId !== null && rawAccountId !== undefined && rawAccountId !== "") {
      return resolveIncomeAccountId(rawAccountId, entityId);
    }
    const accountName = normalizeOptionalString(rawAccountName);
    if (accountName) {
      const matches = await all(
        `
        SELECT id
        FROM accounts
        WHERE entity_id = ?
          AND LOWER(TRIM(name)) = LOWER(?)
        ORDER BY created_at ASC, id ASC
        `,
        [entityId, accountName]
      );
      if (matches.length === 0) {
        return { error: `Account not found: ${accountName}` };
      }
      if (matches.length > 1) {
        return { error: `Account name is ambiguous: ${accountName}` };
      }
      return { accountId: Number(matches[0].id) };
    }
    return resolveIncomeAccountId(undefined, entityId);
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

  app.post("/income/import-csv", async (req, res) => {
    const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
    const requestedEntityId = req.body?.entity_id;
    const defaultCategoryRaw = req.body?.default_income_category_id;
    const defaultAccountRaw = req.body?.default_to_account_id;
    const defaultCategoryId =
      defaultCategoryRaw === null ||
      defaultCategoryRaw === undefined ||
      defaultCategoryRaw === ""
        ? null
        : Number(defaultCategoryRaw);

    if (!csv.trim()) {
      return res.status(400).json({ error: "csv is required" });
    }
    if (defaultCategoryId !== null && Number.isNaN(defaultCategoryId)) {
      return res.status(400).json({
        error: "default_income_category_id must be numeric",
      });
    }

    try {
      const resolvedEntityId = await resolveWriteEntityId(requestedEntityId);
      if (!resolvedEntityId) {
        return res.status(400).json({ error: "Invalid income import payload" });
      }

      if (defaultCategoryId !== null) {
        const defaultCategory = await get(
          "SELECT id FROM income_categories WHERE id = ?",
          [defaultCategoryId]
        );
        if (!defaultCategory) {
          return res.status(400).json({
            error: "default_income_category_id does not match an existing category",
          });
        }
      }

      const defaultPostingAccount = await resolveIncomeAccountId(
        defaultAccountRaw === null || defaultAccountRaw === undefined || defaultAccountRaw === ""
          ? undefined
          : defaultAccountRaw,
        resolvedEntityId
      );
      if (defaultPostingAccount.error) {
        return res.status(400).json({ error: defaultPostingAccount.error });
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
      const hasSourceColumn =
        headers.includes("source") ||
        headers.includes("name") ||
        headers.includes("description");
      const hasAmountColumn = headers.includes("amount");
      const hasDateColumn =
        headers.includes("received_date") ||
        headers.includes("date") ||
        headers.includes("deposit_date");
      const missingHeaders = [];
      if (!hasSourceColumn) {
        missingHeaders.push("source");
      }
      if (!hasAmountColumn) {
        missingHeaders.push("amount");
      }
      if (!hasDateColumn) {
        missingHeaders.push("received_date");
      }
      if (missingHeaders.length > 0) {
        return res.status(400).json({
          error: `Missing required CSV header(s): ${missingHeaders.join(", ")}`,
        });
      }

      const categoryRows = await all(
        "SELECT id, name FROM income_categories ORDER BY id ASC"
      );
      const categoryNameMap = new Map(
        categoryRows.map((row) => [String(row.name).trim().toLowerCase(), Number(row.id)])
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

        const receivedDate = pickCsvValue(row, [
          "received_date",
          "date",
          "deposit_date",
        ]);
        const source = pickCsvValue(row, ["source", "name", "description"]);
        const amount = parseCsvAmount(
          pickCsvValue(row, ["amount", "credit_amount", "value"])
        );

        if (!isValidDate(receivedDate || "")) {
          errors.push({
            line: entry.line,
            error: "Invalid or missing date (expected YYYY-MM-DD)",
          });
          continue;
        }
        if (!source) {
          errors.push({
            line: entry.line,
            error: "Missing source/name",
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
          "income_category_id",
          "category_id",
        ]);
        if (rowCategoryIdRaw !== null) {
          const parsedCategoryId = Number(rowCategoryIdRaw);
          if (Number.isNaN(parsedCategoryId)) {
            errors.push({
              line: entry.line,
              error: "income_category_id must be numeric when provided",
            });
            continue;
          }
          const categoryById = await get(
            "SELECT id FROM income_categories WHERE id = ?",
            [parsedCategoryId]
          );
          if (!categoryById) {
            errors.push({
              line: entry.line,
              error: `Unknown income_category_id: ${parsedCategoryId}`,
            });
            continue;
          }
          categoryId = parsedCategoryId;
        } else {
          const rowCategoryName = normalizeOptionalString(
            pickCsvValue(row, ["income_category", "category"])
          );
          if (rowCategoryName) {
            const key = rowCategoryName.toLowerCase();
            if (!categoryNameMap.has(key)) {
              const created = await run(
                "INSERT INTO income_categories (name, color) VALUES (?, ?)",
                [rowCategoryName, pickCategoryColor(rowCategoryName)]
              );
              categoryNameMap.set(key, created.lastID);
            }
            categoryId = categoryNameMap.get(key);
          }
        }

        const postingAccount = await resolveIncomeImportAccountId({
          rawAccountId: pickCsvValue(row, ["to_account_id", "account_id"]),
          rawAccountName: pickCsvValue(row, ["to_account", "to_account_name", "account"]),
          entityId: resolvedEntityId,
        });
        if (postingAccount.error) {
          errors.push({
            line: entry.line,
            error: postingAccount.error,
          });
          continue;
        }

        await run(
          "INSERT INTO income (amount, source, received_date, income_category_id, entity_id, to_account_id) VALUES (?, ?, ?, ?, ?, ?)",
          [
            amount,
            source,
            receivedDate,
            categoryId,
            resolvedEntityId,
            postingAccount.accountId ?? defaultPostingAccount.accountId,
          ]
        );
        importedCount += 1;
      }

      if (importedCount === 0 && errors.length > 0) {
        return res.status(400).json({
          error: "No income rows were imported",
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
      res.status(500).json({ error: "Failed to import income from CSV" });
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
