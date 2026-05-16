const { createUuid, nowIso } = require("../auth");

function normalizeText(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function parsePositiveAmount(amountCents) {
  const parsed = Math.abs(Number(amountCents || 0));
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function buildExpenseLabel(candidate) {
  return (
    normalizeText(candidate?.merchant) ||
    normalizeText(candidate?.description) ||
    "Imported expense"
  );
}

function buildIncomeSource(candidate) {
  return (
    normalizeText(candidate?.merchant) ||
    normalizeText(candidate?.description) ||
    "Imported income"
  );
}

function buildExpenseNotes(candidate) {
  const description = normalizeText(candidate?.description);
  const merchant = normalizeText(candidate?.merchant);
  if (description && merchant && description !== merchant) {
    return description;
  }
  return null;
}

async function createApprovedExpense({ get, run, candidate, workspaceId }) {
  const amountCents = parsePositiveAmount(candidate.amount_cents);
  const entityId = normalizeText(candidate.suggested_entity_id);
  const accountId = Number(candidate.suggested_account_id);
  const categoryId =
    candidate.suggested_category_id === null || candidate.suggested_category_id === undefined
      ? null
      : Number(candidate.suggested_category_id);
  if (!amountCents || !entityId || !Number.isInteger(accountId) || !candidate.transaction_date) {
    const error = new Error("Expense candidate is missing required fields");
    error.status = 400;
    throw error;
  }
  const entity = await get(
    "SELECT id FROM entities WHERE id = ? AND workspace_id = ? LIMIT 1",
    [entityId, workspaceId]
  );
  if (!entity) {
    const error = new Error("Expense candidate entity is outside the active workspace");
    error.status = 403;
    throw error;
  }
  const account = await get(
    `
    SELECT a.id, a.entity_id
    FROM accounts a
    INNER JOIN entities e ON e.id = a.entity_id
    WHERE a.id = ? AND e.workspace_id = ?
    LIMIT 1
    `,
    [accountId, workspaceId]
  );
  if (!account || String(account.entity_id) !== entityId) {
    const error = new Error("Expense candidate account is outside the active workspace");
    error.status = 403;
    throw error;
  }
  if (categoryId !== null) {
    const category = await get("SELECT id FROM categories WHERE id = ? LIMIT 1", [categoryId]);
    if (!category) {
      const error = new Error("Expense candidate category is invalid");
      error.status = 400;
      throw error;
    }
  }

  const createdAt = nowIso();
  const result = await run(
    `
    INSERT INTO expenses (
      amount,
      category,
      notes,
      spent_at,
      created_at,
      expense_category_id,
      expense_expectation,
      entity_id,
      from_account_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      amountCents / 100,
      buildExpenseLabel(candidate),
      buildExpenseNotes(candidate),
      candidate.transaction_date,
      createdAt,
      categoryId,
      "unexpected",
      entityId,
      accountId,
    ]
  );

  const row = await get(
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
      e.from_account_id,
      a.name AS from_account_name,
      e.expense_category_id,
      e.expense_expectation,
      c.name AS expense_category_name
    FROM expenses e
    LEFT JOIN entities ent ON ent.id = e.entity_id
    LEFT JOIN accounts a ON a.id = e.from_account_id
    LEFT JOIN categories c ON c.id = e.expense_category_id
    WHERE e.id = ?
    `,
    [result.lastID]
  );
  return {
    createdType: "expense",
    createdId: String(result.lastID),
    record: row,
  };
}

async function createApprovedIncome({ get, run, candidate, workspaceId }) {
  const amountCents = parsePositiveAmount(candidate.amount_cents);
  const entityId = normalizeText(candidate.suggested_entity_id);
  const accountId = Number(candidate.suggested_account_id);
  const categoryId =
    candidate.suggested_category_id === null || candidate.suggested_category_id === undefined
      ? null
      : Number(candidate.suggested_category_id);
  if (!amountCents || !entityId || !Number.isInteger(accountId) || !candidate.transaction_date) {
    const error = new Error("Income candidate is missing required fields");
    error.status = 400;
    throw error;
  }
  const entity = await get(
    "SELECT id FROM entities WHERE id = ? AND workspace_id = ? LIMIT 1",
    [entityId, workspaceId]
  );
  if (!entity) {
    const error = new Error("Income candidate entity is outside the active workspace");
    error.status = 403;
    throw error;
  }
  const account = await get(
    `
    SELECT a.id, a.entity_id
    FROM accounts a
    INNER JOIN entities e ON e.id = a.entity_id
    WHERE a.id = ? AND e.workspace_id = ?
    LIMIT 1
    `,
    [accountId, workspaceId]
  );
  if (!account || String(account.entity_id) !== entityId) {
    const error = new Error("Income candidate account is outside the active workspace");
    error.status = 403;
    throw error;
  }
  if (categoryId !== null) {
    const category = await get("SELECT id FROM income_categories WHERE id = ? LIMIT 1", [
      categoryId,
    ]);
    if (!category) {
      const error = new Error("Income candidate category is invalid");
      error.status = 400;
      throw error;
    }
  }

  const result = await run(
    `
    INSERT INTO income (
      amount,
      source,
      received_date,
      income_category_id,
      entity_id,
      to_account_id
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      amountCents / 100,
      buildIncomeSource(candidate),
      candidate.transaction_date,
      categoryId,
      entityId,
      accountId,
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
    LEFT JOIN accounts a ON a.id = i.to_account_id
    LEFT JOIN income_categories c ON c.id = i.income_category_id
    WHERE i.id = ?
    `,
    [result.lastID]
  );
  return {
    createdType: "income",
    createdId: String(result.lastID),
    record: row,
  };
}

async function createApprovedTransfer({
  get,
  run,
  candidate,
  workspaceId,
  getTransferById,
  serializeTransferRow,
}) {
  const amountCents = parsePositiveAmount(candidate.amount_cents);
  const fromAccountId = Number(candidate.suggested_account_id);
  const toAccountId = Number(candidate.suggested_to_account_id);
  if (
    !amountCents ||
    !Number.isInteger(fromAccountId) ||
    !Number.isInteger(toAccountId) ||
    fromAccountId === toAccountId ||
    !candidate.transaction_date
  ) {
    const error = new Error("Transfer candidate is missing required fields");
    error.status = 400;
    throw error;
  }

  const [fromAccount, toAccount] = await Promise.all([
    get(
      `
      SELECT a.id, a.entity_id
      FROM accounts a
      INNER JOIN entities e ON e.id = a.entity_id
      WHERE a.id = ? AND e.workspace_id = ?
      LIMIT 1
      `,
      [fromAccountId, workspaceId]
    ),
    get(
      `
      SELECT a.id, a.entity_id
      FROM accounts a
      INNER JOIN entities e ON e.id = a.entity_id
      WHERE a.id = ? AND e.workspace_id = ?
      LIMIT 1
      `,
      [toAccountId, workspaceId]
    ),
  ]);
  if (!fromAccount || !toAccount) {
    const error = new Error("Transfer candidate accounts are outside the active workspace");
    error.status = 403;
    throw error;
  }

  const transferId = createUuid();
  const timestamp = nowIso();
  await run(
    `
    INSERT INTO transfers (
      id,
      from_account_id,
      to_account_id,
      amount_cents,
      transfer_fee_cents,
      fee_expense_id,
      mirror_as_income_expense,
      expense_category_id,
      income_category_id,
      bookkeeping_expense_id,
      bookkeeping_income_id,
      transfer_date,
      notes,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, 0, NULL, 0, NULL, NULL, NULL, NULL, ?, ?, ?, ?)
    `,
    [
      transferId,
      fromAccountId,
      toAccountId,
      amountCents,
      candidate.transaction_date,
      normalizeText(candidate.description),
      timestamp,
      timestamp,
    ]
  );

  const row = await getTransferById(get, transferId, workspaceId);
  return {
    createdType: "transfer",
    createdId: transferId,
    record: serializeTransferRow(row),
  };
}

async function approveCandidate({
  get,
  run,
  candidate,
  workspaceId,
  currentUserId,
  getTransferById,
  serializeTransferRow,
}) {
  let created;
  if (candidate.candidate_type === "expense") {
    created = await createApprovedExpense({ get, run, candidate, workspaceId });
  } else if (candidate.candidate_type === "income") {
    created = await createApprovedIncome({ get, run, candidate, workspaceId });
  } else if (candidate.candidate_type === "transfer") {
    created = await createApprovedTransfer({
      get,
      run,
      candidate,
      workspaceId,
      getTransferById,
      serializeTransferRow,
    });
  } else {
    const error = new Error("Only expense, income, and transfer candidates can be approved");
    error.status = 400;
    throw error;
  }

  const approvedAt = nowIso();
  await run(
    `
    UPDATE import_candidates
    SET status = 'approved', approved_at = ?, approved_by_user_id = ?
    WHERE id = ?
    `,
    [approvedAt, currentUserId, candidate.id]
  );

  return {
    ...created,
    approvedAt,
  };
}

module.exports = {
  approveCandidate,
};
