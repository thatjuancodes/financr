const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");
const { AppError } = require("./errors");
const { createUuid, nowIso } = require("./auth");
const { extractText, inferSourceType } = require("./imports/extractText");
const { parseImportText } = require("./imports/parsers");
const {
  applyDuplicateDetection,
  buildComparisonRows,
} = require("./imports/duplicateDetection");
const { approveCandidate } = require("./imports/approveCandidate");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const BATCH_STATUSES = new Set(["uploaded", "extracting", "parsed", "failed", "reviewed"]);
const CANDIDATE_STATUSES = new Set([
  "pending",
  "approved",
  "rejected",
  "duplicate",
  "needs_review",
]);
const EDITABLE_CANDIDATE_STATUSES = new Set([
  "pending",
  "rejected",
  "duplicate",
  "needs_review",
]);
const CANDIDATE_TYPES = new Set(["income", "expense", "transfer", "unknown"]);

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function normalizeText(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function normalizeOptionalAccountId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOptionalCategoryId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeOptionalAmountCents(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeOptionalConfidence(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Number(parsed.toFixed(2));
}

function isValidDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sanitizeFilename(filename) {
  return String(filename || "upload")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch (_error) {
    return {};
  }
}

async function refreshBatchStatus({ get, run, batchId }) {
  const summary = await getBatchSummary({ get }, batchId);
  if (!summary) {
    return null;
  }
  const hasActionableCandidates =
    Number(summary.pending_count || 0) > 0 ||
    Number(summary.needs_review_count || 0) > 0 ||
    Number(summary.duplicate_count || 0) > 0;
  const nextStatus = hasActionableCandidates ? "parsed" : "reviewed";
  const processedAt = hasActionableCandidates ? null : nowIso();
  await run(
    `
    UPDATE import_batches
    SET status = ?, processed_at = ?, updated_at = ?
    WHERE id = ?
    `,
    [nextStatus, processedAt, nowIso(), batchId]
  );
  return getBatchSummary({ get }, batchId);
}

async function getBatchSummary({ get }, batchId) {
  const counts = await get(
    `
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN status = 'needs_review' THEN 1 ELSE 0 END) AS needs_review_count,
      SUM(CASE WHEN status = 'duplicate' THEN 1 ELSE 0 END) AS duplicate_count,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
    FROM import_candidates
    WHERE batch_id = ?
    `,
    [batchId]
  );
  return counts
    ? {
        total_count: Number(counts.total_count || 0),
        pending_count: Number(counts.pending_count || 0),
        needs_review_count: Number(counts.needs_review_count || 0),
        duplicate_count: Number(counts.duplicate_count || 0),
        approved_count: Number(counts.approved_count || 0),
        rejected_count: Number(counts.rejected_count || 0),
      }
    : null;
}

async function getBatchById({ get }, batchId, workspaceId) {
  return get(
    `
    SELECT
      id,
      workspace_id,
      created_by_user_id,
      source_type,
      source_label,
      status,
      parser_id,
      error_message,
      created_at,
      updated_at,
      processed_at
    FROM import_batches
    WHERE id = ? AND workspace_id = ?
    LIMIT 1
    `,
    [batchId, workspaceId]
  );
}

async function listBatchFiles({ all }, batchId, workspaceId) {
  return all(
    `
    SELECT
      id,
      workspace_id,
      batch_id,
      filename,
      mime_type,
      size_bytes,
      storage_path,
      sha256_hash,
      created_at
    FROM import_files
    WHERE batch_id = ? AND workspace_id = ?
    ORDER BY created_at ASC, id ASC
    `,
    [batchId, workspaceId]
  );
}

function removeStoredFile(uploadRoot, storagePath) {
  const normalizedStoragePath = String(storagePath || "").trim();
  if (!normalizedStoragePath) {
    return;
  }
  const absolutePath = path.resolve(uploadRoot, normalizedStoragePath);
  const rootPath = path.resolve(uploadRoot);
  if (!absolutePath.startsWith(rootPath)) {
    return;
  }
  try {
    fs.unlinkSync(absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

async function getDuplicateReference({ get, batchId }, candidate) {
  if (!candidate.duplicate_of_type || !candidate.duplicate_of_id) {
    return null;
  }
  const sourceType = String(candidate.duplicate_of_type);
  const sourceId = String(candidate.duplicate_of_id);
  if (sourceType === "expense") {
    const row = await get(
      `
      SELECT
        'expense' AS source_type,
        CAST(e.id AS TEXT) AS source_id,
        e.spent_at AS transaction_date,
        CAST(ROUND(e.amount * 100) AS INTEGER) AS amount_cents,
        COALESCE(e.notes, e.category, '') AS description
      FROM expenses e
      INNER JOIN entities ent ON ent.id = e.entity_id
      WHERE e.id = ? AND ent.workspace_id = ?
      `,
      [Number(sourceId), batchId.workspace_id]
    );
    return row || null;
  }
  if (sourceType === "income") {
    const row = await get(
      `
      SELECT
        'income' AS source_type,
        CAST(i.id AS TEXT) AS source_id,
        i.received_date AS transaction_date,
        CAST(ROUND(i.amount * 100) AS INTEGER) AS amount_cents,
        COALESCE(i.source, '') AS description
      FROM income i
      INNER JOIN entities ent ON ent.id = i.entity_id
      WHERE i.id = ? AND ent.workspace_id = ?
      `,
      [Number(sourceId), batchId.workspace_id]
    );
    return row || null;
  }
  if (sourceType === "transfer") {
    const row = await get(
      `
      SELECT
        'transfer' AS source_type,
        CAST(tr.id AS TEXT) AS source_id,
        substr(tr.transfer_date, 1, 10) AS transaction_date,
        tr.amount_cents,
        COALESCE(tr.notes, '') AS description
      FROM transfers tr
      INNER JOIN accounts from_account ON from_account.id = tr.from_account_id
      INNER JOIN entities from_entity ON from_entity.id = from_account.entity_id
      INNER JOIN accounts to_account ON to_account.id = tr.to_account_id
      INNER JOIN entities to_entity ON to_entity.id = to_account.entity_id
      WHERE tr.id = ? AND (from_entity.workspace_id = ? OR to_entity.workspace_id = ?)
      `,
      [sourceId, batchId.workspace_id, batchId.workspace_id]
    );
    return row || null;
  }
  const row = await get(
    `
    SELECT
      'transaction' AS source_type,
      CAST(t.id AS TEXT) AS source_id,
      substr(t.created_at, 1, 10) AS transaction_date,
      t.amount_cents,
      COALESCE(t.note, t.category, '') AS description
    FROM transactions t
    LEFT JOIN accounts from_account ON from_account.id = t.from_account_id
    LEFT JOIN entities from_entity ON from_entity.id = from_account.entity_id
    LEFT JOIN accounts to_account ON to_account.id = t.to_account_id
    LEFT JOIN entities to_entity ON to_entity.id = to_account.entity_id
    WHERE t.id = ? AND (from_entity.workspace_id = ? OR to_entity.workspace_id = ?)
    `,
    [Number(sourceId), batchId.workspace_id, batchId.workspace_id]
  );
  return row || null;
}

async function listCandidates({ all, get }, batchId, workspaceId) {
  const batch = { workspace_id: workspaceId };
  const rows = await all(
    `
    SELECT
      id,
      workspace_id,
      batch_id,
      status,
      candidate_type,
      transaction_date,
      posted_date,
      description,
      merchant,
      amount_cents,
      currency_code,
      suggested_entity_id,
      suggested_account_id,
      suggested_to_account_id,
      suggested_category_id,
      confidence_score,
      duplicate_of_type,
      duplicate_of_id,
      raw_line,
      raw_json,
      created_at,
      approved_at,
      approved_by_user_id
    FROM import_candidates
    WHERE batch_id = ? AND workspace_id = ?
    ORDER BY transaction_date DESC, created_at DESC, id DESC
    `,
    [batchId, workspaceId]
  );
  const enriched = [];
  for (const row of rows) {
    const rawJson = safeJsonParse(row.raw_json);
    enriched.push({
      ...row,
      amount_cents:
        row.amount_cents === null || row.amount_cents === undefined
          ? null
          : Number(row.amount_cents),
      suggested_account_id:
        row.suggested_account_id === null || row.suggested_account_id === undefined
          ? null
          : Number(row.suggested_account_id),
      suggested_to_account_id:
        row.suggested_to_account_id === null || row.suggested_to_account_id === undefined
          ? null
          : Number(row.suggested_to_account_id),
      suggested_category_id:
        row.suggested_category_id === null || row.suggested_category_id === undefined
          ? null
          : Number(row.suggested_category_id),
      confidence_score:
        row.confidence_score === null || row.confidence_score === undefined
          ? null
          : Number(row.confidence_score),
      raw_json: rawJson,
      duplicate_reference: await getDuplicateReference({ get, batchId: batch }, row),
    });
  }
  return enriched;
}

async function buildBatchPayload(db, batchId, workspaceId) {
  const [batch, files, summary, candidates] = await Promise.all([
    getBatchById(db, batchId, workspaceId),
    listBatchFiles(db, batchId, workspaceId),
    getBatchSummary(db, batchId),
    listCandidates(db, batchId, workspaceId),
  ]);
  if (!batch) {
    return null;
  }
  return {
    batch: {
      ...batch,
      display_title: files[0]?.filename || batch.source_label || null,
      primary_filename: files[0]?.filename || null,
    },
    files,
    summary,
    candidates,
  };
}

async function assertAccountOwnedByWorkspace({ get }, accountId, workspaceId) {
  const account = await get(
    `
    SELECT
      a.id,
      a.entity_id,
      e.workspace_id
    FROM accounts a
    INNER JOIN entities e ON e.id = a.entity_id
    WHERE a.id = ? AND e.workspace_id = ?
    LIMIT 1
    `,
    [accountId, workspaceId]
  );
  if (!account) {
    throw new AppError("Account access forbidden", 403);
  }
  return account;
}

async function assertCategoryAllowed({ get }, categoryId, candidateType) {
  if (categoryId === null || categoryId === undefined) {
    return null;
  }
  if (candidateType === "income") {
    const category = await get("SELECT id FROM income_categories WHERE id = ? LIMIT 1", [
      categoryId,
    ]);
    if (!category) {
      throw new AppError("Invalid income category", 400);
    }
    return category;
  }
  const category = await get("SELECT id FROM categories WHERE id = ? LIMIT 1", [categoryId]);
  if (!category) {
    throw new AppError("Invalid expense category", 400);
  }
  return category;
}

function candidateNeedsReview(candidate) {
  return candidate.candidate_type === "unknown" || !candidate.transaction_date;
}

async function createCandidateRows({
  run,
  batchId,
  workspaceId,
  candidates,
}) {
  const createdAt = nowIso();
  candidates.forEach((candidate) => {
    run(
      `
      INSERT INTO import_candidates (
        id,
        workspace_id,
        batch_id,
        status,
        candidate_type,
        transaction_date,
        posted_date,
        description,
        merchant,
        amount_cents,
        currency_code,
        suggested_entity_id,
        suggested_account_id,
        suggested_to_account_id,
        suggested_category_id,
        confidence_score,
        duplicate_of_type,
        duplicate_of_id,
        raw_line,
        raw_json,
        created_at,
        approved_at,
        approved_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      `,
      [
        createUuid(),
        workspaceId,
        batchId,
        candidateNeedsReview(candidate) ? "needs_review" : candidate.status,
        candidate.candidate_type,
        candidate.transaction_date,
        candidate.posted_date,
        candidate.description,
        candidate.merchant,
        candidate.amount_cents,
        candidate.currency_code,
        candidate.suggested_entity_id,
        candidate.suggested_account_id,
        candidate.suggested_to_account_id,
        candidate.suggested_category_id,
        normalizeOptionalConfidence(candidate.confidence_score),
        candidate.duplicate_of_type,
        candidate.duplicate_of_id,
        candidate.raw_line,
        candidate.raw_json,
        createdAt,
      ]
    );
  });
}

function registerImportRoutes(app, deps) {
  const {
    get,
    all,
    run,
    assertEntityInWorkspace,
    assertAccountInWorkspace,
    getTransferById,
    serializeTransferRow,
  } = deps;
  const uploadRoot = path.join(__dirname, "..", "uploads", "imports");

  app.post("/imports/upload", upload.single("file"), async (req, res) => {
    const sourceLabel = normalizeText(req.body?.sourceLabel);
    const entityId = normalizeText(req.body?.entityId);
    const accountId = normalizeOptionalAccountId(req.body?.accountId);
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: "file is required" });
    }

    try {
      if (entityId) {
        await assertEntityInWorkspace({ get }, entityId, req.workspaceId);
      }
      let selectedAccount = null;
      if (accountId) {
        selectedAccount = await assertAccountInWorkspace({ get }, accountId, req.workspaceId);
        if (entityId && String(selectedAccount.entity_id) !== entityId) {
          return res.status(400).json({
            error: "Selected account does not belong to the selected entity",
          });
        }
      }

      const sourceType = inferSourceType({
        mimeType: uploadedFile.mimetype,
        filename: uploadedFile.originalname,
      });
      if (!sourceType) {
        return res.status(400).json({ error: "Only PDF and image uploads are supported" });
      }

      const batchId = createUuid();
      const fileId = createUuid();
      const createdAt = nowIso();
      const fileHash = sha256(uploadedFile.buffer);
      const safeFilename = sanitizeFilename(uploadedFile.originalname || "upload");
      const relativeStoragePath = path.join(req.workspaceId, `${batchId}-${safeFilename}`);
      const absoluteStoragePath = path.join(uploadRoot, relativeStoragePath);

      ensureDirectory(path.dirname(absoluteStoragePath));
      fs.writeFileSync(absoluteStoragePath, uploadedFile.buffer);

      await run(
        `
        INSERT INTO import_batches (
          id,
          workspace_id,
          created_by_user_id,
          source_type,
          source_label,
          status,
          parser_id,
          raw_text,
          error_message,
          created_at,
          updated_at,
          processed_at
        )
        VALUES (?, ?, ?, ?, ?, 'uploaded', NULL, NULL, NULL, ?, ?, NULL)
        `,
        [
          batchId,
          req.workspaceId,
          req.currentUser.id,
          sourceType,
          sourceLabel || uploadedFile.originalname,
          createdAt,
          createdAt,
        ]
      );

      await run(
        `
        INSERT INTO import_files (
          id,
          workspace_id,
          batch_id,
          filename,
          mime_type,
          size_bytes,
          storage_path,
          sha256_hash,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          fileId,
          req.workspaceId,
          batchId,
          uploadedFile.originalname,
          uploadedFile.mimetype,
          uploadedFile.size,
          relativeStoragePath,
          fileHash,
          createdAt,
        ]
      );

      await run(
        "UPDATE import_batches SET status = 'extracting', updated_at = ? WHERE id = ?",
        [nowIso(), batchId]
      );

      const extractionResult = await extractText({
        buffer: uploadedFile.buffer,
        mimeType: uploadedFile.mimetype,
        filename: uploadedFile.originalname,
      });
      if (extractionResult.quality !== "good") {
        await run(
          `
          UPDATE import_batches
          SET
            status = 'failed',
            raw_text = ?,
            error_message = ?,
            updated_at = ?,
            processed_at = ?
          WHERE id = ?
          `,
          [
            extractionResult.rawText || null,
            extractionResult.errorMessage,
            nowIso(),
            nowIso(),
            batchId,
          ]
        );
        const payload = await buildBatchPayload({ get, all }, batchId, req.workspaceId);
        return res.status(422).json(payload);
      }

      const workspaceAccounts = await all(
        `
        SELECT
          a.id,
          a.name,
          a.entity_id,
          e.name AS entity_name,
          a.currency_code
        FROM accounts a
        INNER JOIN entities e ON e.id = a.entity_id
        WHERE e.workspace_id = ?
        ORDER BY a.created_at ASC, a.id ASC
        `,
        [req.workspaceId]
      );
      const parserResult = parseImportText(extractionResult.rawText, {
        entityId,
        accountId,
        accounts: workspaceAccounts,
        currencyCode: selectedAccount?.currency_code || "PHP",
      });
      const dedupedCandidates = applyDuplicateDetection(
        parserResult.candidates,
        buildComparisonRows({ all, workspaceId: req.workspaceId })
      );
      await createCandidateRows({
        run,
        batchId,
        workspaceId: req.workspaceId,
        candidates: dedupedCandidates,
      });

      await run(
        `
        UPDATE import_batches
        SET
          status = 'parsed',
          parser_id = ?,
          raw_text = ?,
          error_message = NULL,
          updated_at = ?,
          processed_at = ?
        WHERE id = ?
        `,
        [parserResult.parserId, extractionResult.rawText, nowIso(), nowIso(), batchId]
      );
      await refreshBatchStatus({ get, run, batchId });

      const payload = await buildBatchPayload({ get, all }, batchId, req.workspaceId);
      return res.status(201).json(payload);
    } catch (error) {
      return res.status(error?.status || 500).json({
        error: error?.message || "Failed to process import upload",
      });
    }
  });

  app.get("/imports", async (req, res) => {
    try {
      const rows = await all(
        `
        SELECT
          b.id,
          b.workspace_id,
          b.created_by_user_id,
          b.source_type,
          b.source_label,
          MIN(f.filename) AS primary_filename,
          COALESCE(MIN(f.filename), b.source_label) AS display_title,
          b.status,
          b.parser_id,
          b.error_message,
          b.created_at,
          b.updated_at,
          b.processed_at,
          COUNT(DISTINCT f.id) AS file_count
        FROM import_batches b
        LEFT JOIN import_files f ON f.batch_id = b.id
        WHERE b.workspace_id = ?
        GROUP BY
          b.id,
          b.workspace_id,
          b.created_by_user_id,
          b.source_type,
          b.source_label,
          b.status,
          b.parser_id,
          b.error_message,
          b.created_at,
          b.updated_at,
          b.processed_at
        ORDER BY b.created_at DESC, b.id DESC
        `,
        [req.workspaceId]
      );

      const batches = [];
      for (const row of rows) {
        batches.push({
          ...row,
          file_count: Number(row.file_count || 0),
          summary: await getBatchSummary({ get }, row.id),
        });
      }

      const summary = batches.reduce(
        (accumulator, batch) => {
          accumulator.pending_count += Number(batch.summary?.pending_count || 0);
          accumulator.needs_review_count += Number(batch.summary?.needs_review_count || 0);
          accumulator.duplicate_count += Number(batch.summary?.duplicate_count || 0);
          accumulator.approved_count += Number(batch.summary?.approved_count || 0);
          accumulator.rejected_count += Number(batch.summary?.rejected_count || 0);
          accumulator.total_count += Number(batch.summary?.total_count || 0);
          return accumulator;
        },
        {
          pending_count: 0,
          needs_review_count: 0,
          duplicate_count: 0,
          approved_count: 0,
          rejected_count: 0,
          total_count: 0,
        }
      );

      res.json({
        batches,
        summary,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load imports" });
    }
  });

  app.get("/imports/:batchId", async (req, res) => {
    try {
      const payload = await buildBatchPayload({ get, all }, req.params.batchId, req.workspaceId);
      if (!payload) {
        return res.status(404).json({ error: "Import batch not found" });
      }
      return res.json(payload);
    } catch (error) {
      return res.status(500).json({ error: "Failed to load import batch" });
    }
  });

  app.delete("/imports/:batchId", async (req, res) => {
    try {
      const batch = await getBatchById({ get }, req.params.batchId, req.workspaceId);
      if (!batch) {
        return res.status(404).json({ error: "Import batch not found" });
      }
      const files = await listBatchFiles({ all }, batch.id, req.workspaceId);
      files.forEach((file) => {
        removeStoredFile(uploadRoot, file.storage_path);
      });

      await run("DELETE FROM import_candidates WHERE batch_id = ? AND workspace_id = ?", [
        batch.id,
        req.workspaceId,
      ]);
      await run("DELETE FROM import_files WHERE batch_id = ? AND workspace_id = ?", [
        batch.id,
        req.workspaceId,
      ]);
      await run("DELETE FROM import_batches WHERE id = ? AND workspace_id = ?", [
        batch.id,
        req.workspaceId,
      ]);

      return res.json({ ok: true, batch_id: batch.id });
    } catch (error) {
      return res.status(error?.status || 500).json({
        error: error?.message || "Failed to delete import batch",
      });
    }
  });

  app.patch("/imports/candidates/:candidateId", async (req, res) => {
    try {
      const candidate = await get(
        `
        SELECT *
        FROM import_candidates
        WHERE id = ? AND workspace_id = ?
        LIMIT 1
        `,
        [req.params.candidateId, req.workspaceId]
      );
      if (!candidate) {
        return res.status(404).json({ error: "Import candidate not found" });
      }
      if (candidate.status === "approved") {
        return res.status(400).json({ error: "Approved candidates cannot be edited" });
      }

      const nextCandidateType =
        req.body?.candidate_type === undefined
          ? String(candidate.candidate_type)
          : String(req.body.candidate_type || "").trim().toLowerCase();
      if (!CANDIDATE_TYPES.has(nextCandidateType)) {
        return res.status(400).json({ error: "Invalid candidate type" });
      }
      const nextStatus =
        req.body?.status === undefined
          ? String(candidate.status)
          : String(req.body.status || "").trim().toLowerCase();
      if (!EDITABLE_CANDIDATE_STATUSES.has(nextStatus)) {
        return res.status(400).json({ error: "Invalid candidate status" });
      }

      const transactionDate =
        req.body?.transaction_date === undefined
          ? candidate.transaction_date
          : normalizeText(req.body.transaction_date);
      if (transactionDate && !isValidDate(transactionDate)) {
        return res.status(400).json({ error: "Invalid transaction date" });
      }

      const amountCents =
        req.body?.amount_cents === undefined
          ? candidate.amount_cents
          : normalizeOptionalAmountCents(req.body.amount_cents);
      if (req.body?.amount_cents !== undefined && amountCents === null) {
        return res.status(400).json({ error: "Invalid amount_cents" });
      }

      const suggestedEntityId =
        req.body?.suggested_entity_id === undefined
          ? candidate.suggested_entity_id
          : normalizeText(req.body.suggested_entity_id);
      if (suggestedEntityId) {
        await assertEntityInWorkspace({ get }, suggestedEntityId, req.workspaceId);
      }

      const suggestedAccountId =
        req.body?.suggested_account_id === undefined
          ? candidate.suggested_account_id
          : normalizeOptionalAccountId(req.body.suggested_account_id);
      if (req.body?.suggested_account_id !== undefined && suggestedAccountId === null) {
        return res.status(400).json({ error: "Invalid suggested_account_id" });
      }
      if (suggestedAccountId !== null) {
        const account = await assertAccountOwnedByWorkspace({ get }, suggestedAccountId, req.workspaceId);
        if (suggestedEntityId && String(account.entity_id) !== String(suggestedEntityId)) {
          return res.status(400).json({
            error: "Selected account does not belong to the selected entity",
          });
        }
      }

      const suggestedToAccountId =
        req.body?.suggested_to_account_id === undefined
          ? candidate.suggested_to_account_id
          : normalizeOptionalAccountId(req.body.suggested_to_account_id);
      if (req.body?.suggested_to_account_id !== undefined && suggestedToAccountId === null) {
        return res.status(400).json({ error: "Invalid suggested_to_account_id" });
      }
      if (suggestedToAccountId !== null) {
        await assertAccountOwnedByWorkspace({ get }, suggestedToAccountId, req.workspaceId);
      }

      const suggestedCategoryId =
        req.body?.suggested_category_id === undefined
          ? candidate.suggested_category_id
          : normalizeOptionalCategoryId(req.body.suggested_category_id);
      if (req.body?.suggested_category_id !== undefined && suggestedCategoryId === null) {
        return res.status(400).json({ error: "Invalid suggested_category_id" });
      }
      if (suggestedCategoryId !== null) {
        await assertCategoryAllowed({ get }, suggestedCategoryId, nextCandidateType);
      }

      const description =
        req.body?.description === undefined ? candidate.description : normalizeText(req.body.description);

      await run(
        `
        UPDATE import_candidates
        SET
          candidate_type = ?,
          transaction_date = ?,
          description = ?,
          merchant = ?,
          amount_cents = ?,
          suggested_entity_id = ?,
          suggested_account_id = ?,
          suggested_to_account_id = ?,
          suggested_category_id = ?,
          status = ?
        WHERE id = ?
        `,
        [
          nextCandidateType,
          transactionDate,
          description,
          description,
          amountCents,
          suggestedEntityId,
          suggestedAccountId,
          suggestedToAccountId,
          suggestedCategoryId,
          nextStatus,
          candidate.id,
        ]
      );

      await refreshBatchStatus({ get, run, batchId: candidate.batch_id });
      const payload = await buildBatchPayload({ get, all }, candidate.batch_id, req.workspaceId);
      const updated = payload?.candidates?.find((row) => row.id === candidate.id) || null;
      return res.json({
        candidate: updated,
        summary: payload?.summary || null,
      });
    } catch (error) {
      return res.status(error?.status || 500).json({
        error: error?.message || "Failed to update import candidate",
      });
    }
  });

  app.post("/imports/:batchId/approve", async (req, res) => {
    const candidateIds = Array.isArray(req.body?.candidateIds) ? req.body.candidateIds : [];
    if (candidateIds.length === 0) {
      return res.status(400).json({ error: "candidateIds is required" });
    }

    try {
      const batch = await getBatchById({ get }, req.params.batchId, req.workspaceId);
      if (!batch) {
        return res.status(404).json({ error: "Import batch not found" });
      }

      const candidates = [];
      for (const candidateId of candidateIds) {
        const candidate = await get(
          `
          SELECT *
          FROM import_candidates
          WHERE id = ? AND batch_id = ? AND workspace_id = ?
          LIMIT 1
          `,
          [String(candidateId), batch.id, req.workspaceId]
        );
        if (!candidate) {
          return res.status(404).json({ error: "Import candidate not found" });
        }
        if (!["pending", "needs_review"].includes(String(candidate.status))) {
          return res.status(400).json({
            error: "Only pending or needs_review candidates can be approved",
          });
        }
        candidates.push(candidate);
      }

      const createdRecords = [];
      for (const candidate of candidates) {
        createdRecords.push(
          await approveCandidate({
            get,
            run,
            candidate,
            workspaceId: req.workspaceId,
            currentUserId: req.currentUser.id,
            getTransferById,
            serializeTransferRow,
          })
        );
      }

      const summary = await refreshBatchStatus({ get, run, batchId: batch.id });
      return res.json({
        batch: await getBatchById({ get }, batch.id, req.workspaceId),
        summary,
        created_records: createdRecords,
      });
    } catch (error) {
      return res.status(error?.status || 500).json({
        error: error?.message || "Failed to approve import candidates",
      });
    }
  });

  app.post("/imports/candidates/:candidateId/reject", async (req, res) => {
    try {
      const candidate = await get(
        `
        SELECT *
        FROM import_candidates
        WHERE id = ? AND workspace_id = ?
        LIMIT 1
        `,
        [req.params.candidateId, req.workspaceId]
      );
      if (!candidate) {
        return res.status(404).json({ error: "Import candidate not found" });
      }
      if (String(candidate.status) === "approved") {
        return res.status(400).json({ error: "Approved candidates cannot be rejected" });
      }

      await run("UPDATE import_candidates SET status = 'rejected' WHERE id = ?", [candidate.id]);
      const summary = await refreshBatchStatus({ get, run, batchId: candidate.batch_id });
      return res.json({
        ok: true,
        summary,
      });
    } catch (error) {
      return res.status(error?.status || 500).json({
        error: error?.message || "Failed to reject import candidate",
      });
    }
  });
}

module.exports = {
  registerImportRoutes,
};
