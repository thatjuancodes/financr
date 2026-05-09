function registerReferenceDataRoutes(app, deps) {
  const {
    all,
    get,
    run,
    normalizeCategoryColor,
    normalizeCategoryIcon,
    pickCategoryColor,
    normalizeSuggestionRow,
    expenseSuggestionPairKey,
    normalizeSuggestionName,
    normalizeSuggestionCategoryId,
    normalizeSuggestionSelectedForEncoding,
    upsertExpenseSuggestion,
  } = deps;

  async function findCategoryNameConflict(tableName, name, excludeId = null) {
    const params = [name];
    const excludeClause = excludeId === null ? "" : "AND id <> ?";
    if (excludeId !== null) {
      params.push(excludeId);
    }
    return get(
      `
      SELECT id
      FROM ${tableName}
      WHERE lower(trim(name)) = lower(trim(?))
        ${excludeClause}
      LIMIT 1
      `,
      params
    );
  }

  app.get("/expense-categories", async (_req, res) => {
    try {
      const suggestions = await all(
        `
        SELECT
          s.expense_category_id,
          s.category,
          s.last_amount,
          s.selected_for_encoding,
          c.name AS expense_category_name
        FROM expense_suggestions s
        LEFT JOIN categories c ON s.expense_category_id = c.id
        WHERE s.hidden = 0
        ORDER BY c.name ASC, s.category ASC
        `
      );
      const derived = await all(
        `
        SELECT
          COALESCE(e1.expense_category_id, 0) AS expense_category_id,
          c.name AS expense_category_name,
          (
            SELECT e2.category
            FROM expenses e2
            WHERE
              COALESCE(e2.expense_category_id, 0) = COALESCE(e1.expense_category_id, 0)
              AND LOWER(TRIM(e2.category)) = LOWER(TRIM(e1.category))
            ORDER BY e2.spent_at DESC, e2.id DESC
            LIMIT 1
          ) AS category,
          COUNT(*) AS count,
          0 AS selected_for_encoding,
          (
            SELECT amount
            FROM expenses e2
            WHERE
              LOWER(TRIM(e2.category)) = LOWER(TRIM(e1.category))
              AND COALESCE(e2.expense_category_id, 0) =
                COALESCE(e1.expense_category_id, 0)
            ORDER BY spent_at DESC, id DESC
            LIMIT 1
          ) AS last_amount
        FROM expenses e1
        LEFT JOIN categories c ON e1.expense_category_id = c.id
        WHERE NOT EXISTS (
          SELECT 1
          FROM expense_suggestions s
          WHERE
            s.hidden = 1
            AND LOWER(TRIM(s.category)) = LOWER(TRIM(e1.category))
            AND s.expense_category_id = COALESCE(e1.expense_category_id, 0)
        )
        GROUP BY
          COALESCE(e1.expense_category_id, 0),
          c.name,
          LOWER(TRIM(e1.category))
        ORDER BY count DESC, category ASC
        `
      );

      const map = new Map();
      for (const row of derived) {
        const normalized = normalizeSuggestionRow(row);
        map.set(
          expenseSuggestionPairKey(
            normalized.expense_category_id,
            normalized.category
          ),
          normalized
        );
      }
      for (const row of suggestions) {
        const normalized = normalizeSuggestionRow(row, 0);
        const key = expenseSuggestionPairKey(
          normalized.expense_category_id,
          normalized.category
        );
        const existing = map.get(key);
        map.set(key, {
          ...normalized,
          count: Number(existing?.count ?? normalized.count ?? 0),
        });
      }

      const rows = Array.from(map.values()).sort((a, b) => {
        const countDelta = Number(b.count ?? 0) - Number(a.count ?? 0);
        if (countDelta !== 0) {
          return countDelta;
        }
        const categoryNameCompare = String(a.expense_category_name || "").localeCompare(
          String(b.expense_category_name || "")
        );
        if (categoryNameCompare !== 0) {
          return categoryNameCompare;
        }
        return String(a.category || "").localeCompare(String(b.category || ""));
      });

      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load categories" });
    }
  });

  app.get("/expense-suggestions", async (_req, res) => {
    try {
      const rows = await all(
        `
        SELECT
          s.expense_category_id,
          s.category,
          s.last_amount,
          s.selected_for_encoding,
          c.name AS expense_category_name
        FROM expense_suggestions s
        LEFT JOIN categories c ON s.expense_category_id = c.id
        WHERE s.hidden = 0
        ORDER BY c.name ASC, s.category ASC
        `
      );
      res.json(rows.map((row) => normalizeSuggestionRow(row, 0)));
    } catch (err) {
      res.status(500).json({ error: "Failed to load suggestions" });
    }
  });

  app.put("/expense-suggestions", async (req, res) => {
    const { category, last_amount, expense_category_id, selected_for_encoding } =
      req.body;
    const name = normalizeSuggestionName(category);
    const amount = Number(last_amount);
    const categoryId = normalizeSuggestionCategoryId(expense_category_id);
    const selectedForEncoding = normalizeSuggestionSelectedForEncoding(
      selected_for_encoding,
      true
    );
    if (
      !name ||
      Number.isNaN(amount) ||
      categoryId === null ||
      selectedForEncoding === null
    ) {
      return res.status(400).json({ error: "Invalid suggestion payload" });
    }

    try {
      await upsertExpenseSuggestion({
        category: name,
        amount,
        expense_category_id: categoryId,
        selected_for_encoding: selectedForEncoding,
      });
      const row = await get(
        `
        SELECT
          s.expense_category_id,
          s.category,
          s.last_amount,
          s.selected_for_encoding,
          c.name AS expense_category_name
        FROM expense_suggestions s
        LEFT JOIN categories c ON s.expense_category_id = c.id
        WHERE s.expense_category_id = ? AND s.category = ?
        `,
        [categoryId, name]
      );
      res.json(normalizeSuggestionRow(row, 0));
    } catch (err) {
      res.status(500).json({ error: "Failed to save suggestion" });
    }
  });

  app.delete("/expense-suggestions/:category", async (req, res) => {
    const name = normalizeSuggestionName(req.params.category);
    const categoryId = normalizeSuggestionCategoryId(
      req.query?.expense_category_id
    );
    if (!name) {
      return res.status(400).json({ error: "Invalid category" });
    }
    if (categoryId === null) {
      return res.status(400).json({ error: "Invalid expense category" });
    }
    try {
      const existing = await get(
        `
        SELECT expense_category_id, category
        FROM expense_suggestions
        WHERE
          expense_category_id = ?
          AND LOWER(TRIM(category)) = LOWER(?)
        LIMIT 1
        `,
        [categoryId, name]
      );
      if (existing) {
        await run(
          `
          UPDATE expense_suggestions
          SET hidden = 1, selected_for_encoding = 0
          WHERE expense_category_id = ? AND category = ?
          `,
          [categoryId, existing.category]
        );
      } else {
        await run(
          `
          INSERT INTO expense_suggestions (
            expense_category_id,
            category,
            last_amount,
            hidden,
            selected_for_encoding
          )
          VALUES (?, ?, 0, 1, 0)
          `,
          [categoryId, name]
        );
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete suggestion" });
    }
  });

  app.get("/income-categories", async (_req, res) => {
    try {
      const rows = await all(
        "SELECT id, name, color, icon FROM income_categories ORDER BY name ASC"
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load income categories" });
    }
  });

  app.post("/income-categories", async (req, res) => {
    const { name, color, icon } = req.body;
    const trimmed = typeof name === "string" ? name.trim() : "";
    const normalizedColor = normalizeCategoryColor(color);
    const normalizedIcon = normalizeCategoryIcon(icon);
    const hasColorField = Object.prototype.hasOwnProperty.call(
      req.body ?? {},
      "color"
    );
    const hasIconField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "icon");
    if (!trimmed) {
      return res.status(400).json({ error: "Invalid income category name" });
    }
    if (
      hasColorField &&
      normalizedColor === null &&
      color !== null &&
      color !== ""
    ) {
      return res.status(400).json({ error: "Invalid income category color" });
    }
    if (hasIconField && normalizedIcon === null && icon !== null && icon !== "") {
      return res.status(400).json({ error: "Invalid income category icon" });
    }
    const categoryColor = normalizedColor || pickCategoryColor(`income:${trimmed}`);
    try {
      const duplicate = await findCategoryNameConflict("income_categories", trimmed);
      if (duplicate) {
        return res
          .status(409)
          .json({ error: "Income category name already exists" });
      }
      const result = await run(
        "INSERT INTO income_categories (name, color, icon) VALUES (?, ?, ?)",
        [trimmed, categoryColor, normalizedIcon]
      );
      const row = await get(
        "SELECT id, name, color, icon FROM income_categories WHERE id = ?",
        [result.lastID]
      );
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create income category" });
    }
  });

  app.put("/income-categories/:id", async (req, res) => {
    const id = Number(req.params.id);
    const hasNameField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "name");
    const hasColorField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "color");
    const hasIconField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "icon");
    const { name, color, icon } = req.body;
    const trimmed = typeof name === "string" ? name.trim() : "";
    const normalizedColor = normalizeCategoryColor(color);
    const normalizedIcon = normalizeCategoryIcon(icon);
    if (Number.isNaN(id) || (!hasNameField && !hasColorField && !hasIconField)) {
      return res.status(400).json({ error: "Invalid income category update" });
    }
    if (hasNameField && !trimmed) {
      return res.status(400).json({ error: "Invalid income category update" });
    }
    if (
      hasColorField &&
      normalizedColor === null &&
      color !== null &&
      color !== ""
    ) {
      return res.status(400).json({ error: "Invalid income category color" });
    }
    if (hasIconField && normalizedIcon === null && icon !== null && icon !== "") {
      return res.status(400).json({ error: "Invalid income category icon" });
    }
    try {
      const existing = await get(
        "SELECT id, name, color, icon FROM income_categories WHERE id = ?",
        [id]
      );
      if (!existing) {
        return res.status(404).json({ error: "Income category not found" });
      }
      const nextName = hasNameField ? trimmed : existing.name;
      const duplicate = await findCategoryNameConflict(
        "income_categories",
        nextName,
        id
      );
      if (duplicate) {
        return res
          .status(409)
          .json({ error: "Income category name already exists" });
      }
      const nextColor = hasColorField
        ? normalizedColor || pickCategoryColor(`income:${nextName}`)
        : normalizeCategoryColor(existing.color) ||
          pickCategoryColor(`income:${nextName}`);
      const nextIcon = hasIconField ? normalizedIcon : normalizeCategoryIcon(existing.icon);
      const result = await run(
        "UPDATE income_categories SET name = ?, color = ?, icon = ? WHERE id = ?",
        [nextName, nextColor, nextIcon, id]
      );
      if (result.changes === 0) {
        return res.status(404).json({ error: "Income category not found" });
      }
      const row = await get(
        "SELECT id, name, color, icon FROM income_categories WHERE id = ?",
        [id]
      );
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update income category" });
    }
  });

  app.delete("/income-categories/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid income category id" });
    }
    try {
      await run(
        "UPDATE income SET income_category_id = NULL WHERE income_category_id = ?",
        [id]
      );
      const result = await run("DELETE FROM income_categories WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Income category not found" });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete income category" });
    }
  });

  app.get("/categories", async (_req, res) => {
    try {
      const rows = await all("SELECT id, name, color, icon FROM categories ORDER BY name ASC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load categories" });
    }
  });

  app.post("/categories", async (req, res) => {
    const { name, color, icon } = req.body;
    const trimmed = typeof name === "string" ? name.trim() : "";
    const normalizedColor = normalizeCategoryColor(color);
    const normalizedIcon = normalizeCategoryIcon(icon);
    const hasColorField = Object.prototype.hasOwnProperty.call(
      req.body ?? {},
      "color"
    );
    const hasIconField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "icon");
    if (!trimmed) {
      return res.status(400).json({ error: "Invalid category name" });
    }
    if (
      hasColorField &&
      normalizedColor === null &&
      color !== null &&
      color !== ""
    ) {
      return res.status(400).json({ error: "Invalid category color" });
    }
    if (hasIconField && normalizedIcon === null && icon !== null && icon !== "") {
      return res.status(400).json({ error: "Invalid category icon" });
    }
    const categoryColor = normalizedColor || pickCategoryColor(trimmed);
    try {
      const duplicate = await findCategoryNameConflict("categories", trimmed);
      if (duplicate) {
        return res.status(409).json({ error: "Category name already exists" });
      }
      const result = await run(
        "INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)",
        [trimmed, categoryColor, normalizedIcon]
      );
      const row = await get("SELECT id, name, color, icon FROM categories WHERE id = ?", [
        result.lastID,
      ]);
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.put("/categories/:id", async (req, res) => {
    const id = Number(req.params.id);
    const hasNameField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "name");
    const hasColorField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "color");
    const hasIconField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "icon");
    const { name, color, icon } = req.body;
    const trimmed = typeof name === "string" ? name.trim() : "";
    const normalizedColor = normalizeCategoryColor(color);
    const normalizedIcon = normalizeCategoryIcon(icon);
    if (Number.isNaN(id) || (!hasNameField && !hasColorField && !hasIconField)) {
      return res.status(400).json({ error: "Invalid category update" });
    }
    if (hasNameField && !trimmed) {
      return res.status(400).json({ error: "Invalid category update" });
    }
    if (
      hasColorField &&
      normalizedColor === null &&
      color !== null &&
      color !== ""
    ) {
      return res.status(400).json({ error: "Invalid category color" });
    }
    if (hasIconField && normalizedIcon === null && icon !== null && icon !== "") {
      return res.status(400).json({ error: "Invalid category icon" });
    }
    try {
      const existing = await get(
        "SELECT id, name, color, icon FROM categories WHERE id = ?",
        [id]
      );
      if (!existing) {
        return res.status(404).json({ error: "Category not found" });
      }
      const nextName = hasNameField ? trimmed : existing.name;
      const duplicate = await findCategoryNameConflict("categories", nextName, id);
      if (duplicate) {
        return res.status(409).json({ error: "Category name already exists" });
      }
      const nextColor = hasColorField
        ? normalizedColor || pickCategoryColor(nextName)
        : normalizeCategoryColor(existing.color) || pickCategoryColor(nextName);
      const nextIcon = hasIconField ? normalizedIcon : normalizeCategoryIcon(existing.icon);
      const result = await run(
        "UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?",
        [nextName, nextColor, nextIcon, id]
      );
      if (result.changes === 0) {
        return res.status(404).json({ error: "Category not found" });
      }
      const row = await get("SELECT id, name, color, icon FROM categories WHERE id = ?", [
        id,
      ]);
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/categories/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid category id" });
    }
    try {
      const result = await run("DELETE FROM categories WHERE id = ?", [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
}

module.exports = {
  registerReferenceDataRoutes,
};
