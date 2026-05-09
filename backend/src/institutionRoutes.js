function registerInstitutionRoutes(app, deps) {
  const {
    all,
    get,
    run,
    createUuid,
    normalizeCurrencyCode,
    normalizeInstitutionActive,
    normalizeInstitutionSwiftCode,
    normalizeInstitutionType,
    normalizeOptionalText,
    normalizeRequiredText,
  } = deps;

  app.get("/institutions", async (_req, res) => {
    try {
      const rows = await all(
        `
        SELECT
          id,
          name,
          type,
          code,
          swift_code,
          currency_code,
          country,
          is_active,
          created_at,
          updated_at
        FROM institutions
        WHERE is_active = 1
        ORDER BY
          CASE type
            WHEN 'bank' THEN 1
            WHEN 'e_wallet' THEN 2
            ELSE 3
          END,
          name COLLATE NOCASE ASC,
          id ASC
        `
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load institutions" });
    }
  });

  app.post("/institutions", async (req, res) => {
    const name = normalizeRequiredText(req.body?.name);
    const type = normalizeInstitutionType(req.body?.type);
    const code = normalizeOptionalText(req.body?.code);
    const swiftCode = normalizeInstitutionSwiftCode(req.body?.swift_code, type);
    const currencyCode = normalizeCurrencyCode(req.body?.currency_code ?? "PHP");

    if (!name || !type || !currencyCode) {
      return res.status(400).json({ error: "name and type are required" });
    }
    if (swiftCode === "__INVALID_E_WALLET_SWIFT__") {
      return res.status(400).json({
        error: "swift_code must be null for e_wallet institutions",
      });
    }

    try {
      const duplicate = await get(
        `
        SELECT id
        FROM institutions
        WHERE lower(name) = lower(?)
        LIMIT 1
        `,
        [name]
      );
      if (duplicate) {
        return res.status(400).json({ error: "Institution name already exists" });
      }

      const nowIso = new Date().toISOString();
      const institutionId = createUuid();
      await run(
        `
        INSERT INTO institutions (
          id,
          name,
          type,
          code,
          swift_code,
          currency_code,
          country,
          is_active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'PH', 1, ?, ?)
        `,
        [institutionId, name, type, code, swiftCode, currencyCode, nowIso, nowIso]
      );

      const row = await get(
        `
        SELECT
          id,
          name,
          type,
          code,
          swift_code,
          currency_code,
          country,
          is_active,
          created_at,
          updated_at
        FROM institutions
        WHERE id = ?
        LIMIT 1
        `,
        [institutionId]
      );
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create institution" });
    }
  });

  app.patch("/institutions/:id", async (req, res) => {
    const institutionId = normalizeRequiredText(req.params?.id);
    if (!institutionId) {
      return res.status(400).json({ error: "Institution id is required" });
    }

    const hasNameField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "name");
    const hasCodeField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "code");
    const hasSwiftField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "swift_code");
    const hasCurrencyField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "currency_code");
    const hasActiveField = Object.prototype.hasOwnProperty.call(req.body ?? {}, "is_active");
    if (!hasNameField && !hasCodeField && !hasSwiftField && !hasCurrencyField && !hasActiveField) {
      return res.status(400).json({ error: "No institution fields to update" });
    }

    try {
      const existing = await get(
        `
        SELECT
          id,
          name,
          type,
          code,
          swift_code,
          currency_code,
          country,
          is_active,
          created_at,
          updated_at
        FROM institutions
        WHERE id = ?
        LIMIT 1
        `,
        [institutionId]
      );
      if (!existing) {
        return res.status(404).json({ error: "Institution not found" });
      }

      const nextName = hasNameField ? normalizeRequiredText(req.body?.name) : existing.name;
      const nextCode = hasCodeField ? normalizeOptionalText(req.body?.code) : existing.code;
      const nextCurrencyCode = hasCurrencyField
        ? normalizeCurrencyCode(req.body?.currency_code)
        : existing.currency_code;
      const nextIsActive = hasActiveField
        ? normalizeInstitutionActive(req.body?.is_active)
        : Number(existing.is_active ?? 1);
      const nextSwiftCode = hasSwiftField
        ? normalizeInstitutionSwiftCode(req.body?.swift_code, existing.type)
        : existing.swift_code;

      if (!nextName) {
        return res.status(400).json({ error: "name is required" });
      }
      if (nextIsActive === null) {
        return res.status(400).json({ error: "is_active must be a boolean" });
      }
      if (!nextCurrencyCode) {
        return res.status(400).json({ error: "currency_code must be a 3-letter code" });
      }
      if (nextSwiftCode === "__INVALID_E_WALLET_SWIFT__") {
        return res.status(400).json({
          error: "swift_code must be null for e_wallet institutions",
        });
      }

      const duplicate = await get(
        `
        SELECT id
        FROM institutions
        WHERE lower(name) = lower(?)
          AND id <> ?
        LIMIT 1
        `,
        [nextName, institutionId]
      );
      if (duplicate) {
        return res.status(400).json({ error: "Institution name already exists" });
      }

      await run(
        `
        UPDATE institutions
        SET
          name = ?,
          code = ?,
          swift_code = ?,
          currency_code = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [
          nextName,
          nextCode,
          nextSwiftCode,
          nextCurrencyCode,
          nextIsActive,
          new Date().toISOString(),
          institutionId,
        ]
      );

      const row = await get(
        `
        SELECT
          id,
          name,
          type,
          code,
          swift_code,
          currency_code,
          country,
          is_active,
          created_at,
          updated_at
        FROM institutions
        WHERE id = ?
        LIMIT 1
        `,
        [institutionId]
      );
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update institution" });
    }
  });

  app.delete("/institutions/:id", async (req, res) => {
    const institutionId = normalizeRequiredText(req.params?.id);
    if (!institutionId) {
      return res.status(400).json({ error: "Institution id is required" });
    }

    try {
      const existing = await get(
        "SELECT id, name FROM institutions WHERE id = ? LIMIT 1",
        [institutionId]
      );
      if (!existing) {
        return res.status(404).json({ error: "Institution not found" });
      }

      await run(
        `
        UPDATE institutions
        SET is_active = 0, updated_at = ?
        WHERE id = ?
        `,
        [new Date().toISOString(), institutionId]
      );
      res.json({
        ok: true,
        removed_institution_id: institutionId,
        removed_institution_name: existing.name,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete institution" });
    }
  });
}

module.exports = {
  registerInstitutionRoutes,
};
