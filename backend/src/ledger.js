const crypto = require("node:crypto");
const { createTransferFeeExpense } = require("./transferFees");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ACCOUNT_TYPES = new Set(["bank", "cash", "ewallet"]);
const TRANSACTION_TYPES = new Set(["income", "expense", "transfer", "initial_balance"]);
const ENTITY_TYPES = new Set(["personal", "family", "business"]);
const TRANSACTION_SELECT = `
  SELECT
    t.id,
    t.type,
    t.amount_cents,
    t.from_account_id,
    t.to_account_id,
    t.category,
    t.note,
    t.created_at,
    from_account.name AS from_account_name,
    from_account.entity_id AS from_entity_id,
    from_entity.name AS from_entity_name,
    to_account.name AS to_account_name,
    to_account.entity_id AS to_entity_id,
    to_entity.name AS to_entity_name,
    COALESCE(to_account.currency_code, from_account.currency_code, 'PHP') AS currency_code
  FROM transactions t
  LEFT JOIN accounts from_account ON from_account.id = t.from_account_id
  LEFT JOIN entities from_entity ON from_entity.id = from_account.entity_id
  LEFT JOIN accounts to_account ON to_account.id = t.to_account_id
  LEFT JOIN entities to_entity ON to_entity.id = to_account.entity_id
`;
const TRANSFER_SELECT = `
  SELECT
    tr.id,
    tr.from_account_id,
    tr.to_account_id,
    tr.amount_cents,
    tr.transfer_fee_cents,
    tr.fee_expense_id,
    tr.mirror_as_income_expense,
    tr.expense_category_id,
    ec.name AS expense_category_name,
    tr.income_category_id,
    ic.name AS income_category_name,
    tr.bookkeeping_expense_id,
    tr.bookkeeping_income_id,
    tr.transfer_date,
    tr.notes,
    tr.created_at,
    tr.updated_at,
    from_account.name AS from_account_name,
    from_account.entity_id AS from_entity_id,
    from_entity.name AS from_entity_name,
    to_account.name AS to_account_name,
    to_account.entity_id AS to_entity_id,
    to_entity.name AS to_entity_name,
    from_account.currency_code AS currency_code
  FROM transfers tr
  INNER JOIN accounts from_account ON from_account.id = tr.from_account_id
  INNER JOIN entities from_entity ON from_entity.id = from_account.entity_id
  INNER JOIN accounts to_account ON to_account.id = tr.to_account_id
  INNER JOIN entities to_entity ON to_entity.id = to_account.entity_id
  LEFT JOIN categories ec ON ec.id = tr.expense_category_id
  LEFT JOIN income_categories ic ON ic.id = tr.income_category_id
`;
const ACCOUNT_BALANCE_SELECT = `
  COALESCE(income_totals.total_cents, 0)
  + COALESCE(legacy_income_totals.total_cents, 0)
  - COALESCE(expense_totals.total_cents, 0)
  - COALESCE(legacy_expense_totals.total_cents, 0)
  - COALESCE(legacy_transfer_out.total_cents, 0)
  + COALESCE(legacy_transfer_in.total_cents, 0)
  - COALESCE(transfer_out.total_cents, 0)
  + COALESCE(transfer_in.total_cents, 0)
`;

function hasField(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeEntityId(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  return normalized;
}

function normalizeInstitutionId(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  return normalized;
}

function normalizeCurrencyCode(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeEntityType(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!ENTITY_TYPES.has(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeAccountType(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!ACCOUNT_TYPES.has(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeTransactionType(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!TRANSACTION_TYPES.has(normalized)) {
    return null;
  }
  return normalized;
}

function institutionTypeForAccountType(accountType) {
  if (accountType === "bank") {
    return "bank";
  }
  if (accountType === "ewallet") {
    return "e_wallet";
  }
  return null;
}

function isProtectedCashOnHandAccount(account) {
  const name = normalizeText(account?.name).toLowerCase();
  const type = normalizeText(account?.type).toLowerCase();
  return name === "cash on hand" && type === "cash";
}

function parseOptionalAccountId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseOptionalCategoryId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseAmountToCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  const cents = Math.round(numeric * 100);
  if (Math.abs(numeric * 100 - cents) > 1e-6) {
    return null;
  }
  return cents;
}

function createUuid() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return [
    crypto.randomBytes(4).toString("hex"),
    crypto.randomBytes(2).toString("hex"),
    crypto.randomBytes(2).toString("hex"),
    crypto.randomBytes(2).toString("hex"),
    crypto.randomBytes(6).toString("hex"),
  ].join("-");
}

function centsToAmount(value) {
  const cents = Number(value ?? 0);
  if (!Number.isFinite(cents)) {
    return 0;
  }
  return Number((cents / 100).toFixed(2));
}

function normalizeCreatedAt(value) {
  if (value === null || value === undefined || value === "") {
    return new Date().toISOString();
  }
  const text = normalizeText(value);
  if (ISO_DATE.test(text)) {
    return `${text}T00:00:00.000Z`;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

async function getAccountById(get, id) {
  return get(
    `
    SELECT
      a.id,
      a.name,
      a.type,
      a.entity_id,
      a.institution_id,
      a.currency_code,
      e.name AS entity_name,
      e.type AS entity_type,
      i.name AS institution_name,
      i.type AS institution_type,
      i.currency_code AS institution_currency_code,
      a.created_at
    FROM accounts a
    LEFT JOIN entities e ON e.id = a.entity_id
    LEFT JOIN institutions i ON i.id = a.institution_id
    WHERE a.id = ?
    `,
    [id]
  );
}

async function getInstitutionById(get, id) {
  return get(
    `
    SELECT id, name, type, currency_code, is_active
    FROM institutions
    WHERE id = ?
    `,
    [id]
  );
}

async function getExpenseCategoryById(get, id) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return null;
  }
  return get(
    `
    SELECT id, name
    FROM categories
    WHERE id = ?
    `,
    [Number(id)]
  );
}

async function getIncomeCategoryById(get, id) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return null;
  }
  return get(
    `
    SELECT id, name
    FROM income_categories
    WHERE id = ?
    `,
    [Number(id)]
  );
}

async function getDefaultCurrencyCode(get) {
  const row = await get("SELECT currency_code FROM settings WHERE id = 1");
  return normalizeCurrencyCode(row?.currency_code) || "PHP";
}

async function getEntityById(get, id) {
  return get(
    `
    SELECT id, name, type, created_at, updated_at
    FROM entities
    WHERE id = ?
    `,
    [id]
  );
}

async function getDefaultEntityId(get) {
  const row = await get(
    `
    SELECT id
    FROM entities
    ORDER BY
      CASE type
        WHEN 'personal' THEN 1
        WHEN 'family' THEN 2
        WHEN 'business' THEN 3
        ELSE 4
      END,
      created_at ASC,
      id ASC
    LIMIT 1
    `
  );
  return normalizeEntityId(row?.id);
}

async function getDefaultCashAccountId(get) {
  const row = await get(
    `
    SELECT id
    FROM accounts
    WHERE type = 'cash'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    `
  );
  if (row?.id) {
    return row.id;
  }
  const fallback = await get(
    `
    SELECT id
    FROM accounts
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    `
  );
  return fallback?.id ?? null;
}

async function getDefaultBankAccountId(get) {
  const row = await get(
    `
    SELECT id
    FROM accounts
    WHERE type = 'bank'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    `
  );
  if (row?.id) {
    return row.id;
  }
  return getDefaultCashAccountId(get);
}

async function getPreferredDefaultAccountId(get, columnName, fallbackResolver) {
  const row = await get(`SELECT ${columnName} AS account_id FROM settings WHERE id = 1`);
  const preferredAccountId = parseOptionalAccountId(row?.account_id);
  if (preferredAccountId) {
    const preferredAccount = await getAccountById(get, preferredAccountId);
    if (preferredAccount) {
      return preferredAccount.id;
    }
  }
  return fallbackResolver(get);
}

async function getDefaultExpenseAccountId(get) {
  return getPreferredDefaultAccountId(
    get,
    "default_expense_account_id",
    getDefaultCashAccountId
  );
}

async function getDefaultIncomeAccountId(get) {
  return getPreferredDefaultAccountId(
    get,
    "default_income_account_id",
    getDefaultBankAccountId
  );
}

function accountTypePriority(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized === "bank") {
    return 1;
  }
  if (normalized === "cash") {
    return 2;
  }
  if (normalized === "ewallet") {
    return 3;
  }
  return 4;
}

function amountToCents(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100);
}

async function getLegacyEntityAccountDeltaMap({ get, all }) {
  const [settingsRow, accountRows, incomeTotalsByEntity, expenseTotalsByEntity] =
    await Promise.all([
      get(
        `
        SELECT default_expense_account_id, default_income_account_id
        FROM settings
        WHERE id = 1
        `
      ),
      all(
        `
        SELECT id, entity_id, type, created_at
        FROM accounts
        ORDER BY created_at ASC, id ASC
        `
      ),
      all(
        `
        SELECT entity_id, COALESCE(SUM(amount), 0) AS total
        FROM income
        WHERE COALESCE(is_transfer_bookkeeping, 0) = 0
          AND to_account_id IS NULL
        GROUP BY entity_id
        `
      ),
      all(
        `
        SELECT entity_id, COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE COALESCE(is_transfer_bookkeeping, 0) = 0
          AND from_account_id IS NULL
        GROUP BY entity_id
        `
      ),
    ]);

  const deltas = new Map();
  if (!Array.isArray(accountRows) || accountRows.length === 0) {
    return deltas;
  }

  const accountById = new Map();
  const accountsByEntity = new Map();
  const sortedAccounts = [...accountRows].sort((left, right) => {
    const typeCmp = accountTypePriority(left?.type) - accountTypePriority(right?.type);
    if (typeCmp !== 0) {
      return typeCmp;
    }
    const createdCmp = String(left?.created_at || "").localeCompare(
      String(right?.created_at || "")
    );
    if (createdCmp !== 0) {
      return createdCmp;
    }
    return Number(left?.id ?? 0) - Number(right?.id ?? 0);
  });

  sortedAccounts.forEach((row) => {
    const accountId = parseOptionalAccountId(row?.id);
    if (!accountId) {
      return;
    }
    const entityId = normalizeEntityId(row?.entity_id) || "";
    const normalizedRow = {
      id: accountId,
      entity_id: entityId,
      type: String(row?.type || ""),
      created_at: String(row?.created_at || ""),
    };
    accountById.set(String(accountId), normalizedRow);
    if (!accountsByEntity.has(entityId)) {
      accountsByEntity.set(entityId, []);
    }
    accountsByEntity.get(entityId).push(normalizedRow);
  });

  const primaryAccountByEntity = new Map();
  accountsByEntity.forEach((rows, entityId) => {
    if (rows.length > 0) {
      primaryAccountByEntity.set(entityId, rows[0].id);
    }
  });

  const globalFallbackAccountId = sortedAccounts
    .map((row) => parseOptionalAccountId(row?.id))
    .find((id) => id !== null);

  const defaultIncomeAccountId = parseOptionalAccountId(
    settingsRow?.default_income_account_id
  );
  const defaultExpenseAccountId = parseOptionalAccountId(
    settingsRow?.default_expense_account_id
  );
  const defaultIncomeAccount = defaultIncomeAccountId
    ? accountById.get(String(defaultIncomeAccountId)) || null
    : null;
  const defaultExpenseAccount = defaultExpenseAccountId
    ? accountById.get(String(defaultExpenseAccountId)) || null
    : null;

  function resolveTargetAccountId(entityIdRaw, preferredAccountId, preferredAccount) {
    const entityId = normalizeEntityId(entityIdRaw) || "";
    if (
      preferredAccountId &&
      preferredAccount &&
      String(preferredAccount.entity_id || "") === entityId
    ) {
      return preferredAccountId;
    }

    const primaryAccountId = primaryAccountByEntity.get(entityId);
    if (primaryAccountId) {
      return primaryAccountId;
    }

    if (preferredAccountId) {
      return preferredAccountId;
    }

    return globalFallbackAccountId || null;
  }

  function applyDelta(accountId, deltaCents) {
    if (!accountId || !Number.isFinite(deltaCents) || deltaCents === 0) {
      return;
    }
    const key = String(accountId);
    deltas.set(key, Number(deltas.get(key) || 0) + deltaCents);
  }

  incomeTotalsByEntity.forEach((row) => {
    const cents = amountToCents(row?.total);
    if (cents <= 0) {
      return;
    }
    const targetAccountId = resolveTargetAccountId(
      row?.entity_id,
      defaultIncomeAccountId,
      defaultIncomeAccount
    );
    applyDelta(targetAccountId, cents);
  });

  expenseTotalsByEntity.forEach((row) => {
    const cents = amountToCents(row?.total);
    if (cents <= 0) {
      return;
    }
    const targetAccountId = resolveTargetAccountId(
      row?.entity_id,
      defaultExpenseAccountId,
      defaultExpenseAccount
    );
    applyDelta(targetAccountId, -cents);
  });

  return deltas;
}

async function getAccountBalanceCents(get, all, accountId) {
  const row = await get(
    `
    SELECT
      COALESCE(
        (SELECT SUM(amount_cents) FROM transactions WHERE type IN ('income', 'initial_balance') AND to_account_id = ?),
        0
      )
      + COALESCE(
        (SELECT SUM(ROUND(amount * 100)) FROM income WHERE COALESCE(is_transfer_bookkeeping, 0) = 0 AND to_account_id = ?),
        0
      )
      - COALESCE(
        (SELECT SUM(amount_cents) FROM transactions WHERE type = 'expense' AND from_account_id = ?),
        0
      )
      - COALESCE(
        (SELECT SUM(ROUND(amount * 100)) FROM expenses WHERE COALESCE(is_transfer_bookkeeping, 0) = 0 AND from_account_id = ?),
        0
      )
      - COALESCE(
        (SELECT SUM(amount_cents) FROM transactions WHERE type = 'transfer' AND from_account_id = ?),
        0
      )
      + COALESCE(
        (SELECT SUM(amount_cents) FROM transactions WHERE type = 'transfer' AND to_account_id = ?),
        0
      )
      - COALESCE((SELECT SUM(amount_cents) FROM transfers WHERE from_account_id = ?), 0)
      + COALESCE((SELECT SUM(amount_cents) FROM transfers WHERE to_account_id = ?), 0)
      AS balance_cents
    `,
    [accountId, accountId, accountId, accountId, accountId, accountId, accountId, accountId]
  );
  return Number(row?.balance_cents ?? 0);
}

async function getAccountWithBalance(get, all, id) {
  const row = await get(
    `
    SELECT
      a.id,
      a.name,
      a.type,
      a.entity_id,
      a.institution_id,
      a.currency_code,
      e.name AS entity_name,
      e.type AS entity_type,
      i.name AS institution_name,
      i.type AS institution_type,
      i.currency_code AS institution_currency_code,
      a.created_at,
      ${ACCOUNT_BALANCE_SELECT} AS balance_cents
    FROM accounts a
    LEFT JOIN entities e ON e.id = a.entity_id
    LEFT JOIN institutions i ON i.id = a.institution_id
    LEFT JOIN (
      SELECT to_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transactions
      WHERE type IN ('income', 'initial_balance') AND to_account_id IS NOT NULL
      GROUP BY to_account_id
    ) income_totals ON income_totals.account_id = a.id
    LEFT JOIN (
      SELECT to_account_id AS account_id, SUM(ROUND(amount * 100)) AS total_cents
      FROM income
      WHERE COALESCE(is_transfer_bookkeeping, 0) = 0 AND to_account_id IS NOT NULL
      GROUP BY to_account_id
    ) legacy_income_totals ON legacy_income_totals.account_id = a.id
    LEFT JOIN (
      SELECT from_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transactions
      WHERE type = 'expense' AND from_account_id IS NOT NULL
      GROUP BY from_account_id
    ) expense_totals ON expense_totals.account_id = a.id
    LEFT JOIN (
      SELECT from_account_id AS account_id, SUM(ROUND(amount * 100)) AS total_cents
      FROM expenses
      WHERE COALESCE(is_transfer_bookkeeping, 0) = 0 AND from_account_id IS NOT NULL
      GROUP BY from_account_id
    ) legacy_expense_totals ON legacy_expense_totals.account_id = a.id
    LEFT JOIN (
      SELECT from_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transactions
      WHERE type = 'transfer' AND from_account_id IS NOT NULL
      GROUP BY from_account_id
    ) legacy_transfer_out ON legacy_transfer_out.account_id = a.id
    LEFT JOIN (
      SELECT to_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transactions
      WHERE type = 'transfer' AND to_account_id IS NOT NULL
      GROUP BY to_account_id
    ) legacy_transfer_in ON legacy_transfer_in.account_id = a.id
    LEFT JOIN (
      SELECT from_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transfers
      WHERE from_account_id IS NOT NULL
      GROUP BY from_account_id
    ) transfer_out ON transfer_out.account_id = a.id
    LEFT JOIN (
      SELECT to_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transfers
      WHERE to_account_id IS NOT NULL
      GROUP BY to_account_id
    ) transfer_in ON transfer_in.account_id = a.id
    WHERE a.id = ?
    `,
    [id]
  );
  if (!row) {
    return null;
  }
  return {
    ...row,
    balance_cents: Number(row?.balance_cents ?? 0),
  };
}

async function getTransactionById(get, id) {
  return get(
    `
    ${TRANSACTION_SELECT}
    WHERE t.id = ?
    `,
    [id]
  );
}

function serializeAccountRow(row) {
  const institutionId = normalizeInstitutionId(row?.institution_id);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    entity_id: row.entity_id || null,
    entity_name: row.entity_name || null,
    entity_type: row.entity_type || null,
    institution_id: institutionId,
    currency_code: normalizeCurrencyCode(row?.currency_code) || "PHP",
    institution: institutionId
      ? {
          id: institutionId,
          name: row.institution_name || null,
          type: row.institution_type || null,
          currency_code: normalizeCurrencyCode(row?.institution_currency_code) || null,
        }
      : null,
    created_at: row.created_at,
    balance: centsToAmount(row.balance_cents),
  };
}

function serializeTransactionRow(row) {
  return {
    id: row.id,
    source_type: row.source_type || "transaction",
    type: row.type,
    amount: centsToAmount(row.amount_cents),
    from_account_id: row.from_account_id,
    to_account_id: row.to_account_id,
    from_account_name: row.from_account_name || null,
    from_entity_id: row.from_entity_id || null,
    from_entity_name: row.from_entity_name || null,
    to_account_name: row.to_account_name || null,
    to_entity_id: row.to_entity_id || null,
    to_entity_name: row.to_entity_name || null,
    currency_code: normalizeCurrencyCode(row?.currency_code) || "PHP",
    category: row.category || null,
    note: row.note || null,
    created_at: row.created_at,
  };
}

function serializeTransferRow(row) {
  return {
    id: row.id,
    source_type:
      row.source_type === "legacy_transaction" ? "legacy_transaction" : "transfer",
    from_account_id: row.from_account_id,
    to_account_id: row.to_account_id,
    from_account_name: row.from_account_name || null,
    to_account_name: row.to_account_name || null,
    from_entity_id: row.from_entity_id || null,
    to_entity_id: row.to_entity_id || null,
    from_entity_name: row.from_entity_name || null,
    to_entity_name: row.to_entity_name || null,
    currency_code: normalizeCurrencyCode(row?.currency_code) || "PHP",
    amount: centsToAmount(row.amount_cents),
    transfer_fee_amount: centsToAmount(row.transfer_fee_cents),
    fee_expense_id:
      Number.isInteger(Number(row?.fee_expense_id)) && Number(row?.fee_expense_id) > 0
        ? Number(row.fee_expense_id)
        : null,
    mirror_as_income_expense: Boolean(row?.mirror_as_income_expense),
    expense_category_id:
      Number.isInteger(Number(row?.expense_category_id)) && Number(row?.expense_category_id) > 0
        ? Number(row.expense_category_id)
        : null,
    expense_category_name: row?.expense_category_name || null,
    income_category_id:
      Number.isInteger(Number(row?.income_category_id)) && Number(row?.income_category_id) > 0
        ? Number(row.income_category_id)
        : null,
    income_category_name: row?.income_category_name || null,
    bookkeeping_expense_id:
      Number.isInteger(Number(row?.bookkeeping_expense_id)) &&
      Number(row?.bookkeeping_expense_id) > 0
        ? Number(row.bookkeeping_expense_id)
        : null,
    bookkeeping_income_id:
      Number.isInteger(Number(row?.bookkeeping_income_id)) &&
      Number(row?.bookkeeping_income_id) > 0
        ? Number(row.bookkeeping_income_id)
        : null,
    date: row.transfer_date || row.created_at,
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  };
}

function serializeEntityRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listAccountsWithBalances(all, get, { entityId = null } = {}) {
  const conditions = [];
  const params = [];
  if (entityId) {
    conditions.push("a.entity_id = ?");
    params.push(entityId);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await all(
    `
    SELECT
      a.id,
      a.name,
      a.type,
      a.entity_id,
      a.institution_id,
      a.currency_code,
      e.name AS entity_name,
      e.type AS entity_type,
      i.name AS institution_name,
      i.type AS institution_type,
      i.currency_code AS institution_currency_code,
      a.created_at,
      ${ACCOUNT_BALANCE_SELECT} AS balance_cents
    FROM accounts a
    LEFT JOIN entities e ON e.id = a.entity_id
    LEFT JOIN institutions i ON i.id = a.institution_id
    LEFT JOIN (
      SELECT to_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transactions
      WHERE type IN ('income', 'initial_balance') AND to_account_id IS NOT NULL
      GROUP BY to_account_id
    ) income_totals ON income_totals.account_id = a.id
    LEFT JOIN (
      SELECT to_account_id AS account_id, SUM(ROUND(amount * 100)) AS total_cents
      FROM income
      WHERE COALESCE(is_transfer_bookkeeping, 0) = 0 AND to_account_id IS NOT NULL
      GROUP BY to_account_id
    ) legacy_income_totals ON legacy_income_totals.account_id = a.id
    LEFT JOIN (
      SELECT from_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transactions
      WHERE type = 'expense' AND from_account_id IS NOT NULL
      GROUP BY from_account_id
    ) expense_totals ON expense_totals.account_id = a.id
    LEFT JOIN (
      SELECT from_account_id AS account_id, SUM(ROUND(amount * 100)) AS total_cents
      FROM expenses
      WHERE COALESCE(is_transfer_bookkeeping, 0) = 0 AND from_account_id IS NOT NULL
      GROUP BY from_account_id
    ) legacy_expense_totals ON legacy_expense_totals.account_id = a.id
    LEFT JOIN (
      SELECT from_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transactions
      WHERE type = 'transfer' AND from_account_id IS NOT NULL
      GROUP BY from_account_id
    ) legacy_transfer_out ON legacy_transfer_out.account_id = a.id
    LEFT JOIN (
      SELECT to_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transactions
      WHERE type = 'transfer' AND to_account_id IS NOT NULL
      GROUP BY to_account_id
    ) legacy_transfer_in ON legacy_transfer_in.account_id = a.id
    LEFT JOIN (
      SELECT from_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transfers
      WHERE from_account_id IS NOT NULL
      GROUP BY from_account_id
    ) transfer_out ON transfer_out.account_id = a.id
    LEFT JOIN (
      SELECT to_account_id AS account_id, SUM(amount_cents) AS total_cents
      FROM transfers
      WHERE to_account_id IS NOT NULL
      GROUP BY to_account_id
    ) transfer_in ON transfer_in.account_id = a.id
    ${whereClause}
    ORDER BY a.created_at ASC, a.id ASC
    `,
    params
  );
  return rows.map((row) =>
    serializeAccountRow({
      ...row,
      balance_cents: Number(row?.balance_cents ?? 0),
    })
  );
}

async function getAccountsTotalBalanceWithLegacy(all, get, entityId = null) {
  const rows = await listAccountsWithBalances(all, get, { entityId });
  return rows.reduce((sum, row) => sum + Number(row?.balance ?? 0), 0);
}

async function resolveAccountInstitution({
  get,
  type,
  rawInstitutionId,
  hasInstitutionId = false,
  existingAccount = null,
}) {
  const normalizedType = normalizeAccountType(type);
  if (!normalizedType) {
    return { error: "Invalid account payload" };
  }

  const expectedInstitutionType = institutionTypeForAccountType(normalizedType);
  const existingInstitutionId = normalizeInstitutionId(existingAccount?.institution_id);
  const nextInstitutionId = hasInstitutionId
    ? normalizeInstitutionId(rawInstitutionId)
    : existingInstitutionId;

  if (normalizedType === "cash") {
    if (hasInstitutionId && nextInstitutionId) {
      return { error: "Cash accounts cannot have an institution." };
    }
    return { institutionId: null, institution: null };
  }

  if (!nextInstitutionId) {
    const existingType = normalizeAccountType(existingAccount?.type);
    const typeChanged = !!existingAccount && existingType !== normalizedType;
    if (!hasInstitutionId && existingAccount && !typeChanged && !existingInstitutionId) {
      return { institutionId: null, institution: null };
    }
    return {
      error:
        normalizedType === "bank"
          ? "Bank accounts require an institution."
          : "E-wallet accounts require an institution.",
    };
  }

  const institution = await getInstitutionById(get, nextInstitutionId);
  if (!institution) {
    return { error: "Institution not found." };
  }
  if (String(institution.type || "") !== expectedInstitutionType) {
    return {
      error:
        normalizedType === "bank"
          ? "Selected institution must be a bank."
          : "Selected institution must be an e-wallet.",
    };
  }

  return { institutionId: institution.id, institution };
}

async function resolveAccountCurrency({
  get,
  rawCurrencyCode,
  hasCurrencyCode = false,
  institutionId = null,
  existingAccount = null,
}) {
  const explicitCurrencyCode = hasCurrencyCode
    ? normalizeCurrencyCode(rawCurrencyCode)
    : null;
  if (hasCurrencyCode && !explicitCurrencyCode) {
    return { error: "currency_code must be a 3-letter code" };
  }
  if (explicitCurrencyCode) {
    return { currencyCode: explicitCurrencyCode };
  }

  const existingCurrencyCode = normalizeCurrencyCode(existingAccount?.currency_code);
  if (existingCurrencyCode) {
    return { currencyCode: existingCurrencyCode };
  }

  if (institutionId) {
    const institution = await getInstitutionById(get, institutionId);
    const institutionCurrencyCode = normalizeCurrencyCode(institution?.currency_code);
    if (institutionCurrencyCode) {
      return { currencyCode: institutionCurrencyCode };
    }
  }

  return { currencyCode: await getDefaultCurrencyCode(get) };
}

async function resolveTransactionPayload({
  body,
  get,
  all,
  existingTransaction = null,
}) {
  const incomingType = hasField(body, "type") ? body.type : existingTransaction?.type;
  const type = normalizeTransactionType(incomingType);

  let amountCents = null;
  if (hasField(body, "amount")) {
    amountCents = parseAmountToCents(body.amount);
  } else if (existingTransaction) {
    amountCents = Number(existingTransaction.amount_cents);
  }

  let createdAt = null;
  if (hasField(body, "created_at")) {
    createdAt = normalizeCreatedAt(body.created_at);
  } else if (existingTransaction?.created_at) {
    createdAt = normalizeCreatedAt(existingTransaction.created_at);
  } else {
    createdAt = normalizeCreatedAt(null);
  }

  let fromAccountId = hasField(body, "from_account_id")
    ? parseOptionalAccountId(body.from_account_id)
    : parseOptionalAccountId(existingTransaction?.from_account_id);
  let toAccountId = hasField(body, "to_account_id")
    ? parseOptionalAccountId(body.to_account_id)
    : parseOptionalAccountId(existingTransaction?.to_account_id);

  const category = hasField(body, "category")
    ? normalizeText(body.category) || null
    : existingTransaction?.category || null;
  const note = hasField(body, "note")
    ? normalizeText(body.note) || null
    : existingTransaction?.note || null;

  if (!type || !amountCents || !createdAt) {
    return { error: "Invalid transaction payload" };
  }

  const [defaultCashAccountId, defaultExpenseAccountId, defaultIncomeAccountId] =
    await Promise.all([
      getDefaultCashAccountId(get),
      getDefaultExpenseAccountId(get),
      getDefaultIncomeAccountId(get),
    ]);

  if (!defaultCashAccountId) {
    return { error: "At least one account is required" };
  }

  if (type === "income" || type === "initial_balance") {
    fromAccountId = null;
    if (!toAccountId) {
      toAccountId = defaultIncomeAccountId || defaultCashAccountId;
    }
  }

  if (type === "expense") {
    toAccountId = null;
    if (!fromAccountId) {
      fromAccountId = defaultExpenseAccountId || defaultCashAccountId;
    }
  }

  if (type === "transfer") {
    if (!fromAccountId || !toAccountId) {
      return { error: "Transfer requires source and destination accounts" };
    }
    if (fromAccountId === toAccountId) {
      return { error: "Transfer must use two different accounts" };
    }
  }

  if ((type === "income" || type === "initial_balance") && !toAccountId) {
    return {
      error:
        type === "initial_balance"
          ? "Initial balance requires a destination account"
          : "Income requires a destination account",
    };
  }
  if (type === "expense" && !fromAccountId) {
    return { error: "Expense requires a source account" };
  }

  let fromAccount = null;
  let toAccount = null;
  if (fromAccountId) {
    fromAccount = await getAccountById(get, fromAccountId);
    if (!fromAccount) {
      return { error: "Source account does not exist" };
    }
  }
  if (toAccountId) {
    toAccount = await getAccountById(get, toAccountId);
    if (!toAccount) {
      return { error: "Destination account does not exist" };
    }
  }
  if (
    type === "transfer" &&
    fromAccount &&
    toAccount &&
    normalizeCurrencyCode(fromAccount.currency_code) !==
      normalizeCurrencyCode(toAccount.currency_code)
  ) {
    return { error: "Transfer requires accounts with the same currency" };
  }

  if (fromAccountId) {
    let availableBalanceCents = await getAccountBalanceCents(get, all, fromAccountId);

    if (existingTransaction) {
      const oldAmountCents = Number(existingTransaction.amount_cents ?? 0);
      if (Number(existingTransaction.from_account_id) === Number(fromAccountId)) {
        availableBalanceCents += oldAmountCents;
      }
      if (Number(existingTransaction.to_account_id) === Number(fromAccountId)) {
        availableBalanceCents -= oldAmountCents;
      }
    }

    if (availableBalanceCents < amountCents) {
      return { error: "Insufficient account balance" };
    }
  }

  return {
    payload: {
      type,
      amountCents,
      fromAccountId,
      toAccountId,
      category,
      note,
      createdAt,
    },
  };
}

async function resolveTransferPayload({
  body,
  get,
  all,
  existingTransfer = null,
}) {
  const fromAccountId = hasField(body, "from_account_id")
    ? parseOptionalAccountId(body.from_account_id)
    : parseOptionalAccountId(existingTransfer?.from_account_id);
  const toAccountId = hasField(body, "to_account_id")
    ? parseOptionalAccountId(body.to_account_id)
    : parseOptionalAccountId(existingTransfer?.to_account_id);

  let amountCents = null;
  if (hasField(body, "amount")) {
    amountCents = parseAmountToCents(body.amount);
  } else if (existingTransfer) {
    amountCents = Number(existingTransfer.amount_cents ?? 0);
  }

  let transferFeeCents = 0;
  if (hasField(body, "transfer_fee_amount")) {
    const rawFeeAmount = body.transfer_fee_amount;
    if (rawFeeAmount === null || rawFeeAmount === undefined || rawFeeAmount === "") {
      transferFeeCents = 0;
    } else {
      const parsedFeeAmount = Number(rawFeeAmount);
      if (!Number.isFinite(parsedFeeAmount) || parsedFeeAmount < 0) {
        return { error: "Invalid transfer fee" };
      }
      transferFeeCents = Math.round(parsedFeeAmount * 100);
      if (Math.abs(parsedFeeAmount * 100 - transferFeeCents) > 1e-6) {
        return { error: "Invalid transfer fee" };
      }
    }
  } else if (existingTransfer) {
    transferFeeCents = Number(existingTransfer.transfer_fee_cents ?? 0);
  }

  let transferDate = null;
  if (hasField(body, "date")) {
    transferDate = normalizeCreatedAt(body.date);
  } else if (existingTransfer?.transfer_date) {
    transferDate = normalizeCreatedAt(existingTransfer.transfer_date);
  } else {
    transferDate = normalizeCreatedAt(null);
  }

  const notes = hasField(body, "notes")
    ? normalizeText(body.notes) || null
    : existingTransfer?.notes || null;

  if (
    !fromAccountId ||
    !toAccountId ||
    !amountCents ||
    !transferDate ||
    !Number.isInteger(transferFeeCents) ||
    transferFeeCents < 0
  ) {
    return { error: "Invalid transfer payload" };
  }
  if (fromAccountId === toAccountId) {
    return { error: "Transfer must use two different accounts" };
  }

  const [fromAccount, toAccount] = await Promise.all([
    getAccountById(get, fromAccountId),
    getAccountById(get, toAccountId),
  ]);
  if (!fromAccount) {
    return { error: "Source account does not exist" };
  }
  if (!toAccount) {
    return { error: "Destination account does not exist" };
  }
  if (
    normalizeCurrencyCode(fromAccount.currency_code) !==
    normalizeCurrencyCode(toAccount.currency_code)
  ) {
    return { error: "Transfer requires accounts with the same currency" };
  }

  let availableBalanceCents = await getAccountBalanceCents(get, all, fromAccountId);
  if (existingTransfer) {
    const oldAmountCents = Number(existingTransfer.amount_cents ?? 0);
    if (Number(existingTransfer.from_account_id) === Number(fromAccountId)) {
      availableBalanceCents += oldAmountCents;
    }
    if (Number(existingTransfer.to_account_id) === Number(fromAccountId)) {
      availableBalanceCents -= oldAmountCents;
    }
  }
  if (availableBalanceCents < amountCents + transferFeeCents) {
    return { error: "Insufficient account balance" };
  }

  return {
    payload: {
      fromAccountId,
      toAccountId,
      amountCents,
      transferFeeCents,
      transferDate,
      notes,
      fromAccount,
      toAccount,
    },
  };
}

async function resolveTransferBookkeepingPayload({ body, get, isCrossEntity }) {
  const mirrorAsIncomeExpense =
    isCrossEntity &&
    (body?.mirror_as_income_expense === true ||
      body?.mirror_as_income_expense === 1 ||
      String(body?.mirror_as_income_expense || "")
        .trim()
        .toLowerCase() === "true");
  if (!mirrorAsIncomeExpense) {
    return {
      payload: {
        mirrorAsIncomeExpense: false,
        expenseCategoryId: null,
        incomeCategoryId: null,
      },
    };
  }

  const rawExpenseCategoryId = body?.expense_category_id;
  const rawIncomeCategoryId = body?.income_category_id;
  const expenseCategoryId = parseOptionalCategoryId(rawExpenseCategoryId);
  const incomeCategoryId = parseOptionalCategoryId(rawIncomeCategoryId);

  if (
    rawExpenseCategoryId !== null &&
    rawExpenseCategoryId !== undefined &&
    rawExpenseCategoryId !== "" &&
    expenseCategoryId === null
  ) {
    return { error: "Invalid source expense category" };
  }
  if (
    rawIncomeCategoryId !== null &&
    rawIncomeCategoryId !== undefined &&
    rawIncomeCategoryId !== "" &&
    incomeCategoryId === null
  ) {
    return { error: "Invalid destination income category" };
  }

  const [expenseCategory, incomeCategory] = await Promise.all([
    expenseCategoryId ? getExpenseCategoryById(get, expenseCategoryId) : null,
    incomeCategoryId ? getIncomeCategoryById(get, incomeCategoryId) : null,
  ]);

  if (expenseCategoryId && !expenseCategory) {
    return { error: "Source expense category does not exist" };
  }
  if (incomeCategoryId && !incomeCategory) {
    return { error: "Destination income category does not exist" };
  }

  return {
    payload: {
      mirrorAsIncomeExpense: true,
      expenseCategoryId,
      incomeCategoryId,
    },
  };
}

async function createTransferBookkeepingRows({
  run,
  amountCents,
  transferDate,
  notes,
  fromAccount,
  toAccount,
  expenseCategoryId = null,
  incomeCategoryId = null,
}) {
  const amount = centsToAmount(amountCents);
  const transferLabel = normalizeText(notes);
  const expenseLabel = transferLabel || `Transfer to ${toAccount.name || "destination"}`;
  const incomeLabel = transferLabel || `Transfer from ${fromAccount.name || "source"}`;
  let bookkeepingExpenseId = null;
  let bookkeepingIncomeId = null;

  try {
    const expenseResult = await run(
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
        is_transfer_bookkeeping
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        amount,
        expenseLabel,
        notes || null,
        transferDate.slice(0, 10),
        new Date().toISOString(),
        expenseCategoryId,
        "expected",
        fromAccount.entity_id,
      ]
    );
    bookkeepingExpenseId = Number(expenseResult?.lastID) || null;

    const incomeResult = await run(
      `
      INSERT INTO income (
        amount,
        source,
        received_date,
        income_category_id,
        entity_id,
        is_transfer_bookkeeping
      ) VALUES (?, ?, ?, ?, ?, 1)
      `,
      [
        amount,
        incomeLabel,
        transferDate.slice(0, 10),
        incomeCategoryId,
        toAccount.entity_id,
      ]
    );
    bookkeepingIncomeId = Number(incomeResult?.lastID) || null;

    return {
      bookkeepingExpenseId,
      bookkeepingIncomeId,
    };
  } catch (error) {
    if (bookkeepingIncomeId) {
      await run("DELETE FROM income WHERE id = ?", [bookkeepingIncomeId]);
    }
    if (bookkeepingExpenseId) {
      await run("DELETE FROM expenses WHERE id = ?", [bookkeepingExpenseId]);
    }
    throw error;
  }
}

async function getTransferById(get, id) {
  return get(
    `
    ${TRANSFER_SELECT}
    WHERE tr.id = ?
    `,
    [id]
  );
}

async function getLegacyTransferById(get, id) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }
  return get(
    `
    SELECT
      CAST(t.id AS TEXT) AS id,
      'legacy_transaction' AS source_type,
      t.from_account_id,
      t.to_account_id,
      t.amount_cents,
      t.created_at AS transfer_date,
      t.note AS notes,
      t.created_at,
      t.created_at AS updated_at,
      from_account.name AS from_account_name,
      from_account.entity_id AS from_entity_id,
      from_entity.name AS from_entity_name,
      to_account.name AS to_account_name,
      to_account.entity_id AS to_entity_id,
      to_entity.name AS to_entity_name
    FROM transactions t
    INNER JOIN accounts from_account ON from_account.id = t.from_account_id
    INNER JOIN entities from_entity ON from_entity.id = from_account.entity_id
    INNER JOIN accounts to_account ON to_account.id = t.to_account_id
    INNER JOIN entities to_entity ON to_entity.id = to_account.entity_id
    WHERE t.id = ? AND t.type = 'transfer'
    `,
    [parsedId]
  );
}

async function listTransfers(all, { entityId = null, dateFrom = "", dateTo = "" } = {}) {
  const transferConditions = [];
  const transferParams = [];
  const legacyConditions = ["t.type = 'transfer'"];
  const legacyParams = [];

  if (entityId) {
    transferConditions.push("(from_account.entity_id = ? OR to_account.entity_id = ?)");
    transferParams.push(entityId, entityId);
    legacyConditions.push(
      "(from_account.entity_id = ? OR to_account.entity_id = ?)"
    );
    legacyParams.push(entityId, entityId);
  }
  if (dateFrom) {
    transferConditions.push("substr(tr.transfer_date, 1, 10) >= ?");
    transferParams.push(dateFrom);
    legacyConditions.push("substr(t.created_at, 1, 10) >= ?");
    legacyParams.push(dateFrom);
  }
  if (dateTo) {
    transferConditions.push("substr(tr.transfer_date, 1, 10) <= ?");
    transferParams.push(dateTo);
    legacyConditions.push("substr(t.created_at, 1, 10) <= ?");
    legacyParams.push(dateTo);
  }

  const transferWhere = transferConditions.length
    ? `WHERE ${transferConditions.join(" AND ")}`
    : "";
  const legacyWhere = legacyConditions.length
    ? `WHERE ${legacyConditions.join(" AND ")}`
    : "";

  const [transferRows, legacyRows] = await Promise.all([
    all(
      `
      ${TRANSFER_SELECT}
      ${transferWhere}
      `,
      transferParams
    ),
    all(
      `
      SELECT
        CAST(t.id AS TEXT) AS id,
        'legacy_transaction' AS source_type,
        t.from_account_id,
        t.to_account_id,
        t.amount_cents,
        t.created_at AS transfer_date,
        t.note AS notes,
        t.created_at,
        t.created_at AS updated_at,
        from_account.name AS from_account_name,
        from_account.entity_id AS from_entity_id,
        from_entity.name AS from_entity_name,
        to_account.name AS to_account_name,
        to_account.entity_id AS to_entity_id,
        to_entity.name AS to_entity_name
      FROM transactions t
      INNER JOIN accounts from_account ON from_account.id = t.from_account_id
      INNER JOIN entities from_entity ON from_entity.id = from_account.entity_id
      INNER JOIN accounts to_account ON to_account.id = t.to_account_id
      INNER JOIN entities to_entity ON to_entity.id = to_account.entity_id
      ${legacyWhere}
      `,
      legacyParams
    ),
  ]);

  return [...transferRows, ...legacyRows]
    .map(serializeTransferRow)
    .sort((a, b) => {
      const dateCompare = String(b.date).localeCompare(String(a.date));
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return String(b.id).localeCompare(String(a.id));
    });
}

function registerLedgerRoutes(app, { run, get, all }) {
  app.get("/entities", async (req, res) => {
    try {
      const rows = await all(
        `
        SELECT id, name, type, created_at, updated_at
        FROM entities
        ORDER BY
          CASE type
            WHEN 'personal' THEN 1
            WHEN 'family' THEN 2
            WHEN 'business' THEN 3
            ELSE 4
          END,
          created_at ASC,
          id ASC
        `
      );
      res.json(rows.map(serializeEntityRow));
    } catch (err) {
      res.status(500).json({ error: "Failed to load entities" });
    }
  });

  app.post("/entities", async (req, res) => {
    const name = normalizeText(req.body?.name);
    const type = normalizeEntityType(req.body?.type);
    if (!name || !type) {
      return res.status(400).json({ error: "Invalid entity payload" });
    }

    try {
      const duplicate = await get(
        "SELECT id FROM entities WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1",
        [name]
      );
      if (duplicate) {
        return res.status(409).json({ error: "Entity name already exists" });
      }

      const now = new Date().toISOString();
      const entityId = createUuid();
      await run(
        `
        INSERT INTO entities (id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        [entityId, name, type, now, now]
      );
      const row = await get(
        "SELECT id, name, type, created_at, updated_at FROM entities WHERE id = ?",
        [entityId]
      );
      res.status(201).json(serializeEntityRow(row));
    } catch (err) {
      res.status(500).json({ error: "Failed to create entity" });
    }
  });

  app.put("/entities/:id", async (req, res) => {
    const entityId = normalizeEntityId(req.params.id);
    const hasName = hasField(req.body, "name");
    const hasType = hasField(req.body, "type");

    if (!entityId || (!hasName && !hasType)) {
      return res.status(400).json({ error: "Invalid entity payload" });
    }

    try {
      const existing = await get(
        "SELECT id, name, type FROM entities WHERE id = ?",
        [entityId]
      );
      if (!existing) {
        return res.status(404).json({ error: "Entity not found" });
      }

      const name = hasName ? normalizeText(req.body.name) : existing.name;
      const type = hasType ? normalizeEntityType(req.body.type) : existing.type;
      if (!name || !type) {
        return res.status(400).json({ error: "Invalid entity payload" });
      }

      const duplicate = await get(
        `
        SELECT id
        FROM entities
        WHERE LOWER(TRIM(name)) = LOWER(?) AND id <> ?
        LIMIT 1
        `,
        [name, entityId]
      );
      if (duplicate) {
        return res.status(409).json({ error: "Entity name already exists" });
      }

      const now = new Date().toISOString();
      await run(
        `
        UPDATE entities
        SET name = ?, type = ?, updated_at = ?
        WHERE id = ?
        `,
        [name, type, now, entityId]
      );

      const row = await get(
        "SELECT id, name, type, created_at, updated_at FROM entities WHERE id = ?",
        [entityId]
      );
      res.json(serializeEntityRow(row));
    } catch (err) {
      res.status(500).json({ error: "Failed to update entity" });
    }
  });

  app.delete("/entities/:id", async (req, res) => {
    const entityId = normalizeEntityId(req.params.id);
    if (!entityId) {
      return res.status(400).json({ error: "Invalid entity id" });
    }

    try {
      const existing = await get(
        "SELECT id, name, type FROM entities WHERE id = ?",
        [entityId]
      );
      if (!existing) {
        return res.status(404).json({ error: "Entity not found" });
      }

      const accountCount = await get(
        "SELECT COUNT(*) AS count FROM accounts WHERE entity_id = ?",
        [entityId]
      );
      if (Number(accountCount?.count ?? 0) > 0) {
        return res
          .status(400)
          .json({ error: "Move or remove accounts in this entity before deleting it" });
      }

      const entityCount = await get("SELECT COUNT(*) AS count FROM entities");
      if (Number(entityCount?.count ?? 0) <= 1) {
        return res.status(400).json({ error: "At least one entity is required" });
      }

      await run("DELETE FROM entities WHERE id = ?", [entityId]);
      res.json({
        ok: true,
        removed_entity: {
          id: existing.id,
          name: existing.name,
          type: existing.type,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove entity" });
    }
  });

  app.get("/entities/:id/accounts", async (req, res) => {
    const entityId = normalizeEntityId(req.params.id);
    if (!entityId) {
      return res.status(400).json({ error: "Invalid entity id" });
    }

    try {
      const entity = await getEntityById(get, entityId);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      const rows = await listAccountsWithBalances(all, get, { entityId });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load entity accounts" });
    }
  });

  app.get("/transfers", async (req, res) => {
    const hasEntityFilter =
      hasField(req.query, "entity_id") && String(req.query.entity_id || "").trim() !== "";
    const entityId = hasEntityFilter ? normalizeEntityId(req.query.entity_id) : null;
    const dateFrom = normalizeText(req.query?.date_from || "");
    const dateTo = normalizeText(req.query?.date_to || "");

    if (hasEntityFilter && !entityId) {
      return res.status(400).json({ error: "Invalid transfer filters" });
    }
    if ((dateFrom && !ISO_DATE.test(dateFrom)) || (dateTo && !ISO_DATE.test(dateTo))) {
      return res.status(400).json({ error: "Invalid transfer filters" });
    }

    try {
      if (entityId) {
        const entity = await getEntityById(get, entityId);
        if (!entity) {
          return res.status(404).json({ error: "Entity not found" });
        }
      }
      const rows = await listTransfers(all, { entityId, dateFrom, dateTo });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load transfers" });
    }
  });

  app.post("/transfers", async (req, res) => {
    let feeExpenseId = null;
    let bookkeepingExpenseId = null;
    let bookkeepingIncomeId = null;
    try {
      const resolved = await resolveTransferPayload({ body: req.body, get, all });
      if (resolved.error) {
        return res.status(400).json({ error: resolved.error });
      }

      const {
        fromAccountId,
        toAccountId,
        amountCents,
        transferFeeCents,
        transferDate,
        notes,
        fromAccount,
        toAccount,
      } =
        resolved.payload;
      const isCrossEntity =
        String(fromAccount.entity_id || "") !== String(toAccount.entity_id || "");
      const resolvedBookkeeping = await resolveTransferBookkeepingPayload({
        body: req.body,
        get,
        isCrossEntity,
      });
      if (resolvedBookkeeping.error) {
        return res.status(400).json({ error: resolvedBookkeeping.error });
      }
      const now = new Date().toISOString();
      const transferId = createUuid();

      feeExpenseId =
        transferFeeCents > 0
          ? await createTransferFeeExpense({
              get,
              run,
              amountCents: transferFeeCents,
              spentAt: transferDate.slice(0, 10),
              entityId: fromAccount.entity_id,
              fromAccountId,
              transferId,
            })
          : null;
      if (resolvedBookkeeping.payload.mirrorAsIncomeExpense) {
        const bookkeepingRows = await createTransferBookkeepingRows({
          run,
          amountCents,
          transferDate,
          notes,
          fromAccount,
          toAccount,
          expenseCategoryId: resolvedBookkeeping.payload.expenseCategoryId,
          incomeCategoryId: resolvedBookkeeping.payload.incomeCategoryId,
        });
        bookkeepingExpenseId = bookkeepingRows.bookkeepingExpenseId;
        bookkeepingIncomeId = bookkeepingRows.bookkeepingIncomeId;
      }

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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          transferId,
          fromAccountId,
          toAccountId,
          amountCents,
          transferFeeCents,
          feeExpenseId,
          resolvedBookkeeping.payload.mirrorAsIncomeExpense ? 1 : 0,
          resolvedBookkeeping.payload.expenseCategoryId,
          resolvedBookkeeping.payload.incomeCategoryId,
          bookkeepingExpenseId,
          bookkeepingIncomeId,
          transferDate,
          notes,
          now,
          now,
        ]
      );

      const row = await getTransferById(get, transferId);
      res.status(201).json(serializeTransferRow(row));
    } catch (err) {
      if (bookkeepingIncomeId) {
        await run("DELETE FROM income WHERE id = ?", [bookkeepingIncomeId]);
      }
      if (bookkeepingExpenseId) {
        await run("DELETE FROM expenses WHERE id = ?", [bookkeepingExpenseId]);
      }
      if (feeExpenseId) {
        await run("DELETE FROM expenses WHERE id = ?", [feeExpenseId]);
      }
      res.status(500).json({ error: "Failed to create transfer" });
    }
  });

  app.put("/transfers/:id", async (req, res) => {
    const transferId = normalizeText(req.params.id);
    if (!transferId) {
      return res.status(400).json({ error: "Invalid transfer id" });
    }

    let feeExpenseId = null;
    let bookkeepingExpenseId = null;
    let bookkeepingIncomeId = null;
    try {
      const existingTransfer = await getTransferById(get, transferId);
      if (!existingTransfer) {
        return res.status(404).json({ error: "Transfer not found" });
      }

      const resolved = await resolveTransferPayload({
        body: req.body,
        get,
        all,
        existingTransfer,
      });
      if (resolved.error) {
        return res.status(400).json({ error: resolved.error });
      }

      const {
        fromAccountId,
        toAccountId,
        amountCents,
        transferFeeCents,
        transferDate,
        notes,
        fromAccount,
        toAccount,
      } = resolved.payload;
      const isCrossEntity =
        String(fromAccount.entity_id || "") !== String(toAccount.entity_id || "");
      const resolvedBookkeeping = await resolveTransferBookkeepingPayload({
        body: req.body,
        get,
        isCrossEntity,
      });
      if (resolvedBookkeeping.error) {
        return res.status(400).json({ error: resolvedBookkeeping.error });
      }

      feeExpenseId =
        transferFeeCents > 0
          ? await createTransferFeeExpense({
              get,
              run,
              amountCents: transferFeeCents,
              spentAt: transferDate.slice(0, 10),
              entityId: fromAccount.entity_id,
              fromAccountId,
              transferId,
            })
          : null;
      if (resolvedBookkeeping.payload.mirrorAsIncomeExpense) {
        const bookkeepingRows = await createTransferBookkeepingRows({
          run,
          amountCents,
          transferDate,
          notes,
          fromAccount,
          toAccount,
          expenseCategoryId: resolvedBookkeeping.payload.expenseCategoryId,
          incomeCategoryId: resolvedBookkeeping.payload.incomeCategoryId,
        });
        bookkeepingExpenseId = bookkeepingRows.bookkeepingExpenseId;
        bookkeepingIncomeId = bookkeepingRows.bookkeepingIncomeId;
      }

      await run(
        `
        UPDATE transfers
        SET
          from_account_id = ?,
          to_account_id = ?,
          amount_cents = ?,
          transfer_fee_cents = ?,
          fee_expense_id = ?,
          mirror_as_income_expense = ?,
          expense_category_id = ?,
          income_category_id = ?,
          bookkeeping_expense_id = ?,
          bookkeeping_income_id = ?,
          transfer_date = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [
          fromAccountId,
          toAccountId,
          amountCents,
          transferFeeCents,
          feeExpenseId,
          resolvedBookkeeping.payload.mirrorAsIncomeExpense ? 1 : 0,
          resolvedBookkeeping.payload.expenseCategoryId,
          resolvedBookkeeping.payload.incomeCategoryId,
          bookkeepingExpenseId,
          bookkeepingIncomeId,
          transferDate,
          notes,
          new Date().toISOString(),
          transferId,
        ]
      );

      if (existingTransfer.fee_expense_id) {
        await run("DELETE FROM expenses WHERE id = ?", [existingTransfer.fee_expense_id]);
      }
      if (existingTransfer.bookkeeping_expense_id) {
        await run("DELETE FROM expenses WHERE id = ?", [
          existingTransfer.bookkeeping_expense_id,
        ]);
      }
      if (existingTransfer.bookkeeping_income_id) {
        await run("DELETE FROM income WHERE id = ?", [existingTransfer.bookkeeping_income_id]);
      }

      const row = await getTransferById(get, transferId);
      res.json(serializeTransferRow(row));
    } catch (err) {
      if (bookkeepingIncomeId) {
        await run("DELETE FROM income WHERE id = ?", [bookkeepingIncomeId]);
      }
      if (bookkeepingExpenseId) {
        await run("DELETE FROM expenses WHERE id = ?", [bookkeepingExpenseId]);
      }
      if (feeExpenseId) {
        await run("DELETE FROM expenses WHERE id = ?", [feeExpenseId]);
      }
      res.status(500).json({ error: "Failed to update transfer" });
    }
  });

  app.delete("/transfers/:id", async (req, res) => {
    const transferId = normalizeText(req.params.id);
    const sourceType = normalizeText(req.query?.source_type);

    if (!transferId) {
      return res.status(400).json({ error: "Invalid transfer id" });
    }
    if (
      sourceType &&
      sourceType !== "transfer" &&
      sourceType !== "legacy_transaction"
    ) {
      return res.status(400).json({ error: "Invalid transfer source type" });
    }

    try {
      if (sourceType === "legacy_transaction") {
        const existingLegacyTransfer = await getLegacyTransferById(get, transferId);
        if (!existingLegacyTransfer) {
          return res.status(404).json({ error: "Transfer not found" });
        }

        await run("DELETE FROM transactions WHERE id = ? AND type = 'transfer'", [
          Number(transferId),
        ]);
        return res.json({
          ok: true,
          removed_transfer: serializeTransferRow(existingLegacyTransfer),
        });
      }

      if (sourceType === "transfer") {
        const existingTransfer = await getTransferById(get, transferId);
        if (!existingTransfer) {
          return res.status(404).json({ error: "Transfer not found" });
        }

        if (existingTransfer.fee_expense_id) {
          await run("DELETE FROM expenses WHERE id = ?", [existingTransfer.fee_expense_id]);
        }
        if (existingTransfer.bookkeeping_expense_id) {
          await run("DELETE FROM expenses WHERE id = ?", [
            existingTransfer.bookkeeping_expense_id,
          ]);
        }
        if (existingTransfer.bookkeeping_income_id) {
          await run("DELETE FROM income WHERE id = ?", [
            existingTransfer.bookkeeping_income_id,
          ]);
        }
        await run("DELETE FROM transfers WHERE id = ?", [transferId]);
        return res.json({
          ok: true,
          removed_transfer: serializeTransferRow(existingTransfer),
        });
      }

      const existingTransfer = await getTransferById(get, transferId);
      if (existingTransfer) {
        if (existingTransfer.fee_expense_id) {
          await run("DELETE FROM expenses WHERE id = ?", [existingTransfer.fee_expense_id]);
        }
        if (existingTransfer.bookkeeping_expense_id) {
          await run("DELETE FROM expenses WHERE id = ?", [
            existingTransfer.bookkeeping_expense_id,
          ]);
        }
        if (existingTransfer.bookkeeping_income_id) {
          await run("DELETE FROM income WHERE id = ?", [
            existingTransfer.bookkeeping_income_id,
          ]);
        }
        await run("DELETE FROM transfers WHERE id = ?", [transferId]);
        return res.json({
          ok: true,
          removed_transfer: serializeTransferRow(existingTransfer),
        });
      }

      const existingLegacyTransfer = await getLegacyTransferById(get, transferId);
      if (existingLegacyTransfer) {
        await run("DELETE FROM transactions WHERE id = ? AND type = 'transfer'", [
          Number(transferId),
        ]);
        return res.json({
          ok: true,
          removed_transfer: serializeTransferRow(existingLegacyTransfer),
        });
      }

      return res.status(404).json({ error: "Transfer not found" });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove transfer" });
    }
  });

  app.get("/accounts", async (req, res) => {
    const hasEntityFilter =
      hasField(req.query, "entity_id") && String(req.query.entity_id || "").trim() !== "";
    const entityId = hasEntityFilter ? normalizeEntityId(req.query.entity_id) : null;
    if (hasEntityFilter && !entityId) {
      return res.status(400).json({ error: "Invalid account filters" });
    }
    try {
      if (entityId) {
        const entity = await getEntityById(get, entityId);
        if (!entity) {
          return res.status(404).json({ error: "Entity not found" });
        }
      }
      const rows = await listAccountsWithBalances(all, get, { entityId });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to load accounts" });
    }
  });

  app.post("/accounts", async (req, res) => {
    const name = normalizeText(req.body?.name);
    const type = normalizeAccountType(req.body?.type);
    const requestedEntityId = hasField(req.body, "entity_id")
      ? normalizeEntityId(req.body.entity_id)
      : null;
    const hasInstitutionId = hasField(req.body, "institution_id");
    const hasCurrencyCode = hasField(req.body, "currency_code");

    if (!name || !type) {
      return res.status(400).json({ error: "Invalid account payload" });
    }

    try {
      const fallbackEntityId = await getDefaultEntityId(get);
      const entityId = requestedEntityId || fallbackEntityId;
      if (!entityId) {
        return res.status(400).json({ error: "Invalid account payload" });
      }
      const entity = await getEntityById(get, entityId);
      if (!entity) {
        return res.status(400).json({ error: "Invalid account payload" });
      }

      const resolvedInstitution = await resolveAccountInstitution({
        get,
        type,
        rawInstitutionId: req.body?.institution_id,
        hasInstitutionId,
      });
      if (resolvedInstitution.error) {
        return res.status(400).json({ error: resolvedInstitution.error });
      }
      const resolvedCurrency = await resolveAccountCurrency({
        get,
        rawCurrencyCode: req.body?.currency_code,
        hasCurrencyCode,
        institutionId: resolvedInstitution.institutionId,
      });
      if (resolvedCurrency.error) {
        return res.status(400).json({ error: resolvedCurrency.error });
      }

      const existing = await get(
        `
        SELECT id
        FROM accounts
        WHERE entity_id = ? AND LOWER(name) = LOWER(?)
        LIMIT 1
        `,
        [entityId, name]
      );
      if (existing) {
        return res.status(409).json({ error: "Account name already exists for this entity" });
      }

      const result = await run(
        `
        INSERT INTO accounts (name, type, entity_id, institution_id, currency_code, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          name,
          type,
          entityId,
          resolvedInstitution.institutionId,
          resolvedCurrency.currencyCode,
          new Date().toISOString(),
        ]
      );

      const row = await getAccountWithBalance(get, all, result.lastID);
      res.status(201).json(serializeAccountRow(row));
    } catch (err) {
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.put("/accounts/:id", async (req, res) => {
    const id = Number(req.params.id);
    const hasName = hasField(req.body, "name");
    const hasType = hasField(req.body, "type");
    const hasEntityId = hasField(req.body, "entity_id");
    const hasInstitutionId = hasField(req.body, "institution_id");
    const hasCurrencyCode = hasField(req.body, "currency_code");

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      (!hasName && !hasType && !hasEntityId && !hasInstitutionId && !hasCurrencyCode)
    ) {
      return res.status(400).json({ error: "Invalid account payload" });
    }

    try {
      const existing = await get(
        `
        SELECT id, name, type, entity_id, institution_id, currency_code
        FROM accounts
        WHERE id = ?
        `,
        [id]
      );
      if (!existing) {
        return res.status(404).json({ error: "Account not found" });
      }

      const name = hasName ? normalizeText(req.body.name) : existing.name;
      const type = hasType ? normalizeAccountType(req.body.type) : existing.type;
      const entityId = hasEntityId
        ? normalizeEntityId(req.body.entity_id)
        : normalizeEntityId(existing.entity_id);

      if (!name || !type || !entityId) {
        return res.status(400).json({ error: "Invalid account payload" });
      }
      const entity = await getEntityById(get, entityId);
      if (!entity) {
        return res.status(400).json({ error: "Invalid account payload" });
      }

      const resolvedInstitution = await resolveAccountInstitution({
        get,
        type,
        rawInstitutionId: req.body?.institution_id,
        hasInstitutionId,
        existingAccount: existing,
      });
      if (resolvedInstitution.error) {
        return res.status(400).json({ error: resolvedInstitution.error });
      }
      const resolvedCurrency = await resolveAccountCurrency({
        get,
        rawCurrencyCode: req.body?.currency_code,
        hasCurrencyCode,
        institutionId: resolvedInstitution.institutionId,
        existingAccount: existing,
      });
      if (resolvedCurrency.error) {
        return res.status(400).json({ error: resolvedCurrency.error });
      }

      const duplicate = await get(
        `
        SELECT id
        FROM accounts
        WHERE entity_id = ? AND LOWER(name) = LOWER(?) AND id <> ?
        LIMIT 1
        `,
        [entityId, name, id]
      );
      if (duplicate) {
        return res.status(409).json({ error: "Account name already exists for this entity" });
      }

      await run(
        `
        UPDATE accounts
        SET name = ?, type = ?, entity_id = ?, institution_id = ?, currency_code = ?
        WHERE id = ?
        `,
        [name, type, entityId, resolvedInstitution.institutionId, resolvedCurrency.currencyCode, id]
      );

      const row = await getAccountWithBalance(get, all, id);
      res.json(serializeAccountRow(row));
    } catch (err) {
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  app.delete("/accounts/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid account id" });
    }

    try {
      const existing = await get(
        `
        SELECT id, name, type
        FROM accounts
        WHERE id = ?
        `,
        [id]
      );
      if (!existing) {
        return res.status(404).json({ error: "Account not found" });
      }

      if (isProtectedCashOnHandAccount(existing)) {
        return res
          .status(400)
          .json({ error: "Cash on Hand account cannot be removed" });
      }

      const balanceCents = await getAccountBalanceCents(get, all, id);
      await run("DELETE FROM accounts WHERE id = ?", [id]);

      const fallbackExpenseAccountId = await getDefaultCashAccountId(get);
      const fallbackIncomeAccountId = await getDefaultBankAccountId(get);
      await run(
        `
        UPDATE settings
        SET
          default_expense_account_id = CASE
            WHEN default_expense_account_id = ? THEN ?
            ELSE default_expense_account_id
          END,
          default_income_account_id = CASE
            WHEN default_income_account_id = ? THEN ?
            ELSE default_income_account_id
          END
        WHERE id = 1
        `,
        [id, fallbackExpenseAccountId, id, fallbackIncomeAccountId]
      );

      res.json({
        ok: true,
        removed_account: {
          id: existing.id,
          name: existing.name,
          type: existing.type,
        },
        moved_to_distributable_amount: centsToAmount(balanceCents),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove account" });
    }
  });

  app.get("/transactions", async (req, res) => {
    const type =
      req.query?.type === undefined || req.query?.type === ""
        ? null
        : normalizeTransactionType(req.query.type);
    const accountId = parseOptionalAccountId(req.query?.account_id);
    const dateFrom = normalizeText(req.query?.date_from || "");
    const dateTo = normalizeText(req.query?.date_to || "");

    if ((req.query?.type && !type) || (req.query?.account_id && !accountId)) {
      return res.status(400).json({ error: "Invalid transaction filters" });
    }
    if ((dateFrom && !ISO_DATE.test(dateFrom)) || (dateTo && !ISO_DATE.test(dateTo))) {
      return res.status(400).json({ error: "Invalid transaction filters" });
    }

    try {
      const conditions = [];
      const params = [];

      if (type) {
        conditions.push("t.type = ?");
        params.push(type);
      }
      if (accountId) {
        conditions.push("(t.from_account_id = ? OR t.to_account_id = ?)");
        params.push(accountId, accountId);
      }
      if (dateFrom) {
        conditions.push("substr(t.created_at, 1, 10) >= ?");
        params.push(dateFrom);
      }
      if (dateTo) {
        conditions.push("substr(t.created_at, 1, 10) <= ?");
        params.push(dateTo);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const transactionPromise = all(
        `
        ${TRANSACTION_SELECT}
        ${whereClause}
        ORDER BY t.created_at DESC, t.id DESC
        `,
        params
      );

      const shouldIncludeLegacyIncome = !type || type === "income";
      const shouldIncludeLegacyExpense = !type || type === "expense";
      const shouldIncludeTransfers = !type || type === "transfer";
      const legacyPromises = [];
      const supplementalPromises = [];

      if (shouldIncludeLegacyIncome) {
        const incomeConditions = [
          "COALESCE(i.is_transfer_bookkeeping, 0) = 0",
          "i.to_account_id IS NOT NULL",
        ];
        const incomeParams = [];
        if (accountId) {
          incomeConditions.push("i.to_account_id = ?");
          incomeParams.push(accountId);
        }
        if (dateFrom) {
          incomeConditions.push("i.received_date >= ?");
          incomeParams.push(dateFrom);
        }
        if (dateTo) {
          incomeConditions.push("i.received_date <= ?");
          incomeParams.push(dateTo);
        }
        legacyPromises.push(
          all(
            `
            SELECT
              'income:' || CAST(i.id AS TEXT) AS id,
              'legacy_income' AS source_type,
              'income' AS type,
              CAST(ROUND(i.amount * 100) AS INTEGER) AS amount_cents,
              NULL AS from_account_id,
              i.to_account_id,
              c.name AS category,
              i.source AS note,
              i.received_date AS created_at,
              NULL AS from_account_name,
              NULL AS from_entity_id,
              NULL AS from_entity_name,
              to_account.name AS to_account_name,
              to_account.entity_id AS to_entity_id,
              to_entity.name AS to_entity_name,
              to_account.currency_code AS currency_code
            FROM income i
            LEFT JOIN income_categories c ON c.id = i.income_category_id
            INNER JOIN accounts to_account ON to_account.id = i.to_account_id
            LEFT JOIN entities to_entity ON to_entity.id = to_account.entity_id
            WHERE ${incomeConditions.join(" AND ")}
            ORDER BY i.received_date DESC, i.id DESC
            `,
            incomeParams
          )
        );
      }

      if (shouldIncludeLegacyExpense) {
        const expenseConditions = [
          "COALESCE(e.is_transfer_bookkeeping, 0) = 0",
          "e.from_account_id IS NOT NULL",
        ];
        const expenseParams = [];
        if (accountId) {
          expenseConditions.push("e.from_account_id = ?");
          expenseParams.push(accountId);
        }
        if (dateFrom) {
          expenseConditions.push("e.spent_at >= ?");
          expenseParams.push(dateFrom);
        }
        if (dateTo) {
          expenseConditions.push("e.spent_at <= ?");
          expenseParams.push(dateTo);
        }
        legacyPromises.push(
          all(
            `
            SELECT
              'expense:' || CAST(e.id AS TEXT) AS id,
              'legacy_expense' AS source_type,
              'expense' AS type,
              CAST(ROUND(e.amount * 100) AS INTEGER) AS amount_cents,
              e.from_account_id,
              NULL AS to_account_id,
              c.name AS category,
              CASE
                WHEN COALESCE(e.notes, '') <> '' THEN e.category || ' - ' || e.notes
                ELSE e.category
              END AS note,
              e.spent_at AS created_at,
              from_account.name AS from_account_name,
              from_account.entity_id AS from_entity_id,
              from_entity.name AS from_entity_name,
              NULL AS to_account_name,
              NULL AS to_entity_id,
              NULL AS to_entity_name,
              from_account.currency_code AS currency_code
            FROM expenses e
            LEFT JOIN categories c ON c.id = e.expense_category_id
            INNER JOIN accounts from_account ON from_account.id = e.from_account_id
            LEFT JOIN entities from_entity ON from_entity.id = from_account.entity_id
            WHERE ${expenseConditions.join(" AND ")}
            ORDER BY e.spent_at DESC, e.id DESC
            `,
            expenseParams
          )
        );
      }

      if (shouldIncludeTransfers) {
        const transferConditions = [];
        const transferParams = [];

        if (accountId) {
          transferConditions.push("(tr.from_account_id = ? OR tr.to_account_id = ?)");
          transferParams.push(accountId, accountId);
        }
        if (dateFrom) {
          transferConditions.push("substr(tr.transfer_date, 1, 10) >= ?");
          transferParams.push(dateFrom);
        }
        if (dateTo) {
          transferConditions.push("substr(tr.transfer_date, 1, 10) <= ?");
          transferParams.push(dateTo);
        }

        const transferWhereClause = transferConditions.length
          ? `WHERE ${transferConditions.join(" AND ")}`
          : "";

        supplementalPromises.push(
          all(
            `
            SELECT
              tr.id,
              'transfer' AS source_type,
              'transfer' AS type,
              tr.amount_cents,
              tr.from_account_id,
              tr.to_account_id,
              COALESCE(ic.name, ec.name, 'Transfer') AS category,
              COALESCE(
                tr.notes,
                from_account.name || ' -> ' || to_account.name,
                'Transfer'
              ) AS note,
              tr.transfer_date AS created_at,
              from_account.name AS from_account_name,
              from_account.entity_id AS from_entity_id,
              from_entity.name AS from_entity_name,
              to_account.name AS to_account_name,
              to_account.entity_id AS to_entity_id,
              to_entity.name AS to_entity_name,
              from_account.currency_code AS currency_code
            FROM transfers tr
            INNER JOIN accounts from_account ON from_account.id = tr.from_account_id
            INNER JOIN entities from_entity ON from_entity.id = from_account.entity_id
            INNER JOIN accounts to_account ON to_account.id = tr.to_account_id
            INNER JOIN entities to_entity ON to_entity.id = to_account.entity_id
            LEFT JOIN categories ec ON ec.id = tr.expense_category_id
            LEFT JOIN income_categories ic ON ic.id = tr.income_category_id
            ${transferWhereClause}
            ORDER BY tr.transfer_date DESC, tr.id DESC
            `,
            transferParams
          )
        );
      }

      const [transactionRows, ...rowGroups] = await Promise.all([
        transactionPromise,
        ...supplementalPromises,
        ...legacyPromises,
      ]);
      const rows = [
        ...(Array.isArray(transactionRows) ? transactionRows : []),
        ...rowGroups.flatMap((group) => (Array.isArray(group) ? group : [])),
      ].sort((left, right) => {
        const createdAtCompare = String(right?.created_at || "").localeCompare(
          String(left?.created_at || "")
        );
        if (createdAtCompare !== 0) {
          return createdAtCompare;
        }
        return String(right?.id || "").localeCompare(String(left?.id || ""));
      });

      res.json(rows.map(serializeTransactionRow));
    } catch (err) {
      res.status(500).json({ error: "Failed to load transactions" });
    }
  });

  app.post("/transactions", async (req, res) => {
    try {
      const resolved = await resolveTransactionPayload({ body: req.body, get, all });
      if (resolved.error) {
        return res.status(400).json({ error: resolved.error });
      }

      const {
        type,
        amountCents,
        fromAccountId,
        toAccountId,
        category,
        note,
        createdAt,
      } = resolved.payload;

      const result = await run(
        `
        INSERT INTO transactions (
          type,
          amount_cents,
          from_account_id,
          to_account_id,
          category,
          note,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [type, amountCents, fromAccountId, toAccountId, category, note, createdAt]
      );

      const row = await getTransactionById(get, result.lastID);
      res.status(201).json(serializeTransactionRow(row));
    } catch (err) {
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.put("/transactions/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid transaction id" });
    }

    try {
      const existing = await get(
        `
        SELECT
          id,
          type,
          amount_cents,
          from_account_id,
          to_account_id,
          category,
          note,
          created_at
        FROM transactions
        WHERE id = ?
        `,
        [id]
      );
      if (!existing) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const resolved = await resolveTransactionPayload({
        body: req.body,
        get,
        all,
        existingTransaction: existing,
      });
      if (resolved.error) {
        return res.status(400).json({ error: resolved.error });
      }

      const {
        type,
        amountCents,
        fromAccountId,
        toAccountId,
        category,
        note,
        createdAt,
      } = resolved.payload;

      await run(
        `
        UPDATE transactions
        SET
          type = ?,
          amount_cents = ?,
          from_account_id = ?,
          to_account_id = ?,
          category = ?,
          note = ?,
          created_at = ?
        WHERE id = ?
        `,
        [type, amountCents, fromAccountId, toAccountId, category, note, createdAt, id]
      );

      const row = await getTransactionById(get, id);
      res.json(serializeTransactionRow(row));
    } catch (err) {
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  app.delete("/transactions/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid transaction id" });
    }

    try {
      const existing = await getTransactionById(get, id);
      if (!existing) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      await run("DELETE FROM transactions WHERE id = ?", [id]);
      res.json({
        ok: true,
        removed_transaction: serializeTransactionRow(existing),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove transaction" });
    }
  });
}

module.exports = {
  registerLedgerRoutes,
  resolveTransferPayload,
  getTransferById,
  serializeTransferRow,
  getAccountsTotalBalanceWithLegacy,
};
