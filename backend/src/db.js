const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const initSqlJs = require("sql.js");
const { resolveEntityDefaultAccountId } = require("./accountPreferences");
const {
  CATEGORY_COLOR_SWATCHES,
  normalizeCategoryColor,
  normalizeCategoryIcon,
  pickCategoryColor,
} = require("./categoryColors");

const DB_PATH =
  process.env.FINANCE_DB_PATH || path.join(__dirname, "..", "data", "finance.db");
const LEGACY_CATEGORY_COLOR_SWATCHES = [
  "#FEE2E2",
  "#FFEDD5",
  "#FEF3C7",
  "#ECFCCB",
  "#DCFCE7",
  "#CCFBF1",
  "#CFFAFE",
  "#DBEAFE",
  "#E0E7FF",
  "#EDE9FE",
  "#FCE7F3",
  "#F3E8FF",
];
const LEGACY_TO_CURRENT_SWATCH = new Map(
  LEGACY_CATEGORY_COLOR_SWATCHES.map((legacy, index) => [
    legacy,
    CATEGORY_COLOR_SWATCHES[index] || legacy,
  ])
);
const EXPENSE_EXPECTATIONS = new Set(["expected", "unexpected"]);
const UNCATEGORIZED_SUGGESTION_CATEGORY_ID = 0;
const PRIMARY_FAMILY_ACCOUNT_NAME = "Philippine National Bank";
const FAMILY_PNB_BACKFILL_V1_FLAG = "family_pnb_backfill_v1_done";
const PROJECTION_ENTITY_BACKFILL_V1_FLAG = "projection_entity_backfill_v1_done";
const TRANSFER_BOOKKEEPING_BACKFILL_V1_FLAG =
  "transfer_bookkeeping_backfill_v1_done";
const LEGACY_ACCOUNT_ATTRIBUTION_BACKFILL_V1_FLAG =
  "legacy_account_attribution_backfill_v1_done";
const DEFAULT_ENTITY_SEEDS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Personal",
    type: "personal",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Family",
    type: "family",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Business",
    type: "business",
  },
];
const DEFAULT_INSTITUTION_SEEDS = [
  {
    id: "7c1f53e4-b6d0-4f2f-9538-6b3dc7caa101",
    name: "Banco De Oro",
    type: "bank",
    code: "BDO",
    swift_code: "BNORPHMM",
    currency_code: "PHP",
  },
  {
    id: "7c1f53e4-b6d0-4f2f-9538-6b3dc7caa102",
    name: "Bank of the Philippine Islands",
    type: "bank",
    code: "BPI",
    swift_code: "BOPIPHMM",
    currency_code: "PHP",
  },
  {
    id: "7c1f53e4-b6d0-4f2f-9538-6b3dc7caa103",
    name: "Union Bank of the Philippines",
    type: "bank",
    code: "UBP",
    swift_code: "UBPHPHMM",
    currency_code: "PHP",
  },
  {
    id: "7c1f53e4-b6d0-4f2f-9538-6b3dc7caa104",
    name: "Philippine National Bank",
    type: "bank",
    code: "PNB",
    swift_code: "PNBMPHMM",
    currency_code: "PHP",
  },
  {
    id: "7c1f53e4-b6d0-4f2f-9538-6b3dc7caa105",
    name: "GCash",
    type: "e_wallet",
    code: "GCASH",
    swift_code: null,
    currency_code: "PHP",
  },
  {
    id: "7c1f53e4-b6d0-4f2f-9538-6b3dc7caa106",
    name: "Maya",
    type: "e_wallet",
    code: "MAYA",
    swift_code: null,
    currency_code: "PHP",
  },
];

let db = null;

function createUuid() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function normalizeExpenseExpectation(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!EXPENSE_EXPECTATIONS.has(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeSuggestionCategoryId(value) {
  if (value === null || value === undefined || value === "") {
    return UNCATEGORIZED_SUGGESTION_CATEGORY_ID;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function normalizeSuggestionName(value) {
  return String(value || "").trim();
}

function ensureDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
}

function persist() {
  ensureDb();
  const data = db.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function run(sql, params = []) {
  ensureDb();
  db.run(sql, params);
  const last = get("SELECT last_insert_rowid() AS id");
  const changes = get("SELECT changes() AS changes");
  persist();
  return { lastID: last?.id ?? 0, changes: changes?.changes ?? 0 };
}

function get(sql, params = []) {
  ensureDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function all(sql, params = []) {
  ensureDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function exec(sql) {
  ensureDb();
  db.exec(sql);
  persist();
}

async function init() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const file = fs.readFileSync(DB_PATH);
    db = new SQL.Database(file);
  } else {
    db = new SQL.Database();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      source TEXT NOT NULL,
      received_date TEXT NOT NULL,
      income_category_id INTEGER,
      to_account_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      notes TEXT,
      spent_at TEXT NOT NULL,
      created_at TEXT,
      expense_category_id INTEGER,
      expense_expectation TEXT DEFAULT 'unexpected',
      from_account_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS expense_suggestions (
      expense_category_id INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      last_amount REAL,
      hidden INTEGER DEFAULT 0,
      selected_for_encoding INTEGER DEFAULT 0,
      PRIMARY KEY (expense_category_id, category)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS income_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      name TEXT NOT NULL,
      loan_origin TEXT,
      notes TEXT,
      spent_at TEXT NOT NULL,
      statement_month TEXT,
      created_at TEXT,
      debt_category_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      base_balance REAL DEFAULT 0,
      currency_code TEXT DEFAULT 'USD',
      default_expense_account_id INTEGER,
      default_income_account_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS entity_account_preferences (
      entity_id TEXT PRIMARY KEY,
      default_expense_account_id INTEGER,
      default_income_account_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('personal', 'family', 'business')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'ewallet')),
      entity_id TEXT NOT NULL,
      institution_id TEXT,
      currency_code TEXT NOT NULL DEFAULT 'PHP',
      created_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(id),
      FOREIGN KEY (institution_id) REFERENCES institutions(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'initial_balance')),
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      from_account_id INTEGER,
      to_account_id INTEGER,
      category TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      CHECK (
        ((type = 'income' OR type = 'initial_balance') AND to_account_id IS NOT NULL AND from_account_id IS NULL) OR
        (type = 'expense' AND from_account_id IS NOT NULL AND to_account_id IS NULL) OR
        (type = 'transfer' AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL)
      )
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_from_account_id ON transactions(from_account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_to_account_id ON transactions(to_account_id);

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      from_account_id INTEGER NOT NULL,
      to_account_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      transfer_fee_cents INTEGER NOT NULL DEFAULT 0,
      fee_expense_id INTEGER,
      mirror_as_income_expense INTEGER NOT NULL DEFAULT 0,
      expense_category_id INTEGER,
      income_category_id INTEGER,
      bookkeeping_expense_id INTEGER,
      bookkeeping_income_id INTEGER,
      transfer_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (from_account_id <> to_account_id)
    );

    CREATE INDEX IF NOT EXISTS idx_transfers_from_account_id ON transfers(from_account_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_to_account_id ON transfers(to_account_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_transfer_date ON transfers(transfer_date);

    CREATE TABLE IF NOT EXISTS recurring_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      entity_id TEXT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      expense_category_id INTEGER,
      income_category_id INTEGER,
      from_account_id INTEGER,
      to_account_id INTEGER,
      mirror_as_income_expense INTEGER NOT NULL DEFAULT 0,
      transfer_fee_amount REAL NOT NULL DEFAULT 0,
      description TEXT,
      frequency TEXT NOT NULL,
      semi_monthly_day_1 INTEGER,
      semi_monthly_day_2 INTEGER,
      next_due_date TEXT NOT NULL,
      last_confirmed_date TEXT
    );

    CREATE TABLE IF NOT EXISTS loan_origin_configs (
      loan_origin TEXT PRIMARY KEY,
      statement_day INTEGER,
      due_day INTEGER,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bank_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      short_name TEXT NOT NULL UNIQUE,
      swiss_number TEXT NOT NULL UNIQUE,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('bank', 'e_wallet')),
      code TEXT,
      swift_code TEXT,
      currency_code TEXT NOT NULL DEFAULT 'PHP',
      country TEXT NOT NULL DEFAULT 'PH',
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (type = 'bank' OR swift_code IS NULL)
    );

    CREATE TABLE IF NOT EXISTS life_insurances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      policy_name TEXT NOT NULL,
      insured_person TEXT NOT NULL,
      coverage_amount REAL NOT NULL DEFAULT 0,
      cash_surrender_value REAL NOT NULL DEFAULT 0,
      premium_amount REAL NOT NULL DEFAULT 0,
      payment_frequency TEXT NOT NULL DEFAULT 'monthly',
      renewal_date TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      target_amount REAL NOT NULL,
      payment_plan TEXT NOT NULL DEFAULT 'one_time',
      payment_frequency TEXT NOT NULL DEFAULT 'once',
      payment_amount REAL NOT NULL,
      payment_count INTEGER,
      start_date TEXT NOT NULL,
      target_date TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    );

    CREATE TABLE IF NOT EXISTS monthly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month_key TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      report_json TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (month_key, entity_id)
    );

    CREATE TABLE IF NOT EXISTS projection_scenarios (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'SAVINGS',
      currency TEXT NOT NULL DEFAULT 'PHP',
      initial_amount REAL NOT NULL,
      annual_interest_rate REAL NOT NULL,
      duration_months INTEGER NOT NULL,
      monthly_contribution REAL NOT NULL DEFAULT 0,
      compounding_frequency TEXT NOT NULL DEFAULT 'monthly',
      cashflow_assumptions_json TEXT NOT NULL DEFAULT '{}',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_name_lower_unique
    ON institutions(lower(name));

    CREATE INDEX IF NOT EXISTS idx_institutions_active_type_name
    ON institutions(is_active, type, name);

    CREATE INDEX IF NOT EXISTS idx_life_insurances_entity_id
    ON life_insurances(entity_id);

    CREATE INDEX IF NOT EXISTS idx_life_insurances_renewal_date
    ON life_insurances(renewal_date);

    CREATE INDEX IF NOT EXISTS idx_budgets_entity_id
    ON budgets(entity_id);

    CREATE INDEX IF NOT EXISTS idx_budgets_start_date
    ON budgets(start_date);
  `);

  const settingsColumns = all("PRAGMA table_info(settings)");
  const hasCurrency = settingsColumns.some((col) => col.name === "currency_code");
  const hasDefaultExpenseAccount = settingsColumns.some(
    (col) => col.name === "default_expense_account_id"
  );
  const hasDefaultIncomeAccount = settingsColumns.some(
    (col) => col.name === "default_income_account_id"
  );
  const hasFamilyPnbBackfillFlag = settingsColumns.some(
    (col) => col.name === FAMILY_PNB_BACKFILL_V1_FLAG
  );
  const hasProjectionEntityBackfillFlag = settingsColumns.some(
    (col) => col.name === PROJECTION_ENTITY_BACKFILL_V1_FLAG
  );
  const hasTransferBookkeepingBackfillFlag = settingsColumns.some(
    (col) => col.name === TRANSFER_BOOKKEEPING_BACKFILL_V1_FLAG
  );
  const hasLegacyAccountAttributionBackfillFlag = settingsColumns.some(
    (col) => col.name === LEGACY_ACCOUNT_ATTRIBUTION_BACKFILL_V1_FLAG
  );
  db.run(`
    CREATE TABLE IF NOT EXISTS entity_account_preferences (
      entity_id TEXT PRIMARY KEY,
      default_expense_account_id INTEGER,
      default_income_account_id INTEGER
    )
  `);
  if (!hasCurrency) {
    db.run("ALTER TABLE settings ADD COLUMN currency_code TEXT DEFAULT 'USD'");
  }
  if (!hasDefaultExpenseAccount) {
    db.run("ALTER TABLE settings ADD COLUMN default_expense_account_id INTEGER");
  }
  if (!hasDefaultIncomeAccount) {
    db.run("ALTER TABLE settings ADD COLUMN default_income_account_id INTEGER");
  }
  if (!hasTransferBookkeepingBackfillFlag) {
    db.run(
      `ALTER TABLE settings ADD COLUMN ${TRANSFER_BOOKKEEPING_BACKFILL_V1_FLAG} INTEGER DEFAULT 0`
    );
  }
  if (!hasLegacyAccountAttributionBackfillFlag) {
    db.run(
      `ALTER TABLE settings ADD COLUMN ${LEGACY_ACCOUNT_ATTRIBUTION_BACKFILL_V1_FLAG} INTEGER DEFAULT 0`
    );
  }
  if (!hasFamilyPnbBackfillFlag) {
    db.run(
      `ALTER TABLE settings ADD COLUMN ${FAMILY_PNB_BACKFILL_V1_FLAG} INTEGER DEFAULT 0`
    );
  }
  if (!hasProjectionEntityBackfillFlag) {
    db.run(
      `ALTER TABLE settings ADD COLUMN ${PROJECTION_ENTITY_BACKFILL_V1_FLAG} INTEGER DEFAULT 0`
    );
  }
  const institutionColumns = all("PRAGMA table_info(institutions)");
  const hasInstitutionCurrencyCode = institutionColumns.some(
    (col) => col.name === "currency_code"
  );
  if (!hasInstitutionCurrencyCode) {
    db.run("ALTER TABLE institutions ADD COLUMN currency_code TEXT DEFAULT 'PHP'");
  }
  const lifeInsuranceColumns = all("PRAGMA table_info(life_insurances)");
  const hasLifeInsuranceCashSurrenderValue = lifeInsuranceColumns.some(
    (col) => col.name === "cash_surrender_value"
  );
  if (!hasLifeInsuranceCashSurrenderValue) {
    db.run(
      "ALTER TABLE life_insurances ADD COLUMN cash_surrender_value REAL NOT NULL DEFAULT 0"
    );
  }

  const hasSettings = get("SELECT 1 FROM settings WHERE id = 1");
  if (!hasSettings) {
    db.run(
      `
      INSERT INTO settings (
        id,
        base_balance,
        currency_code,
        default_expense_account_id,
        default_income_account_id
      )
      VALUES (1, 0, 'USD', NULL, NULL)
      `
    );
  } else {
    db.run(
      "UPDATE settings SET currency_code = 'USD' WHERE id = 1 AND (currency_code IS NULL OR currency_code = '')"
    );
  }
  db.run(
    "UPDATE institutions SET currency_code = 'PHP' WHERE currency_code IS NULL OR TRIM(currency_code) = ''"
  );
  db.run(
    "UPDATE life_insurances SET cash_surrender_value = 0 WHERE cash_surrender_value IS NULL"
  );

  const nowIso = new Date().toISOString();
  const legacyBankConfigTable = get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'bank_configs'"
  );
  if (legacyBankConfigTable) {
    const legacyRows = all(
      `
      SELECT name, short_name, swiss_number, updated_at
      FROM bank_configs
      ORDER BY id ASC
      `
    );
    legacyRows.forEach((row) => {
      const name = String(row?.name || "").trim();
      if (!name) {
        return;
      }
      const existing = get(
        "SELECT id FROM institutions WHERE lower(name) = lower(?) LIMIT 1",
        [name]
      );
      if (existing) {
        return;
      }
      const updatedAt = String(row?.updated_at || nowIso);
      db.run(
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
        VALUES (?, ?, 'bank', ?, ?, 'PHP', 'PH', 1, ?, ?)
        `,
        [
          createUuid(),
          name,
          String(row?.short_name || "").trim() || null,
          String(row?.swiss_number || "").trim() || null,
          updatedAt,
          updatedAt,
        ]
      );
    });
  }

  DEFAULT_INSTITUTION_SEEDS.forEach((seed) => {
    const existing = get(
      "SELECT id FROM institutions WHERE lower(name) = lower(?) LIMIT 1",
      [seed.name]
    );
    if (existing) {
      return;
    }
    db.run(
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
      [
        seed.id,
        seed.name,
        seed.type,
        seed.code,
        seed.swift_code,
        seed.currency_code || "PHP",
        nowIso,
        nowIso,
      ]
    );
  });

  const entityCountRow = get("SELECT COUNT(*) AS count FROM entities");
  if (Number(entityCountRow?.count ?? 0) === 0) {
    DEFAULT_ENTITY_SEEDS.forEach((seed) => {
      db.run(
        `
        INSERT INTO entities (id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        [seed.id, seed.name, seed.type, nowIso, nowIso]
      );
    });
  }

  const preferredEntityRow = get(
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
  const defaultEntityId =
    typeof preferredEntityRow?.id === "string" && preferredEntityRow.id.trim()
      ? preferredEntityRow.id.trim()
      : DEFAULT_ENTITY_SEEDS[0].id;
  let familyEntityId = null;
  const existingFamilyEntityRow = get(
    `
    SELECT id
    FROM entities
    WHERE type = 'family'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    `
  );
  if (
    typeof existingFamilyEntityRow?.id === "string" &&
    existingFamilyEntityRow.id.trim()
  ) {
    familyEntityId = existingFamilyEntityRow.id.trim();
  } else {
    const fallbackFamilySeed = DEFAULT_ENTITY_SEEDS.find(
      (item) => item.type === "family"
    );
    const fallbackFamilyId =
      typeof fallbackFamilySeed?.id === "string" && fallbackFamilySeed.id.trim()
        ? fallbackFamilySeed.id.trim()
        : defaultEntityId;
    const fallbackFamilyName =
      typeof fallbackFamilySeed?.name === "string" && fallbackFamilySeed.name.trim()
        ? fallbackFamilySeed.name.trim()
        : "Family";

    const existingByFallbackId = get(
      "SELECT id FROM entities WHERE id = ? LIMIT 1",
      [fallbackFamilyId]
    );
    if (
      typeof existingByFallbackId?.id === "string" &&
      existingByFallbackId.id.trim()
    ) {
      familyEntityId = existingByFallbackId.id.trim();
    } else {
      db.run(
        `
        INSERT INTO entities (id, name, type, created_at, updated_at)
        VALUES (?, ?, 'family', ?, ?)
        `,
        [fallbackFamilyId, fallbackFamilyName, nowIso, nowIso]
      );
      familyEntityId = fallbackFamilyId;
    }
  }
  if (!familyEntityId) {
    familyEntityId = defaultEntityId;
  }

  const transactionsTableSqlRow = get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'transactions'"
  );
  const transactionsTableSql = String(transactionsTableSqlRow?.sql || "");
  const transactionsNeedRebuild =
    !transactionsTableSql.includes("'initial_balance'") ||
    !/type\s*=\s*'initial_balance'/i.test(transactionsTableSql);

  if (transactionsNeedRebuild) {
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'initial_balance')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        from_account_id INTEGER,
        to_account_id INTEGER,
        category TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        CHECK (
          ((type = 'income' OR type = 'initial_balance') AND to_account_id IS NOT NULL AND from_account_id IS NULL) OR
          (type = 'expense' AND from_account_id IS NOT NULL AND to_account_id IS NULL) OR
          (type = 'transfer' AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL)
        )
      )
    `);
    db.run(`
      INSERT INTO transactions_next (
        id,
        type,
        amount_cents,
        from_account_id,
        to_account_id,
        category,
        note,
        created_at
      )
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
    `);
    db.run("DROP TABLE transactions");
    db.run("ALTER TABLE transactions_next RENAME TO transactions");
    db.run("CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)");
    db.run("CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)");
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_transactions_from_account_id ON transactions(from_account_id)"
    );
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_transactions_to_account_id ON transactions(to_account_id)"
    );
  }

  const transferColumns = all("PRAGMA table_info(transfers)");
  const hasTransferFeeCents = transferColumns.some(
    (col) => col.name === "transfer_fee_cents"
  );
  if (!hasTransferFeeCents) {
    db.run("ALTER TABLE transfers ADD COLUMN transfer_fee_cents INTEGER NOT NULL DEFAULT 0");
  }
  const hasTransferFeeExpenseId = transferColumns.some(
    (col) => col.name === "fee_expense_id"
  );
  if (!hasTransferFeeExpenseId) {
    db.run("ALTER TABLE transfers ADD COLUMN fee_expense_id INTEGER");
  }
  const hasTransferMirrorAsIncomeExpense = transferColumns.some(
    (col) => col.name === "mirror_as_income_expense"
  );
  if (!hasTransferMirrorAsIncomeExpense) {
    db.run(
      "ALTER TABLE transfers ADD COLUMN mirror_as_income_expense INTEGER NOT NULL DEFAULT 0"
    );
  }
  const hasTransferExpenseCategoryId = transferColumns.some(
    (col) => col.name === "expense_category_id"
  );
  if (!hasTransferExpenseCategoryId) {
    db.run("ALTER TABLE transfers ADD COLUMN expense_category_id INTEGER");
  }
  const hasTransferIncomeCategoryId = transferColumns.some(
    (col) => col.name === "income_category_id"
  );
  if (!hasTransferIncomeCategoryId) {
    db.run("ALTER TABLE transfers ADD COLUMN income_category_id INTEGER");
  }
  const hasTransferBookkeepingExpenseId = transferColumns.some(
    (col) => col.name === "bookkeeping_expense_id"
  );
  if (!hasTransferBookkeepingExpenseId) {
    db.run("ALTER TABLE transfers ADD COLUMN bookkeeping_expense_id INTEGER");
  }
  const hasTransferBookkeepingIncomeId = transferColumns.some(
    (col) => col.name === "bookkeeping_income_id"
  );
  if (!hasTransferBookkeepingIncomeId) {
    db.run("ALTER TABLE transfers ADD COLUMN bookkeeping_income_id INTEGER");
  }

  const accountColumnsBeforeEntityMigration = all("PRAGMA table_info(accounts)");
  const hasAccountEntityId = accountColumnsBeforeEntityMigration.some(
    (col) => col.name === "entity_id"
  );
  if (!hasAccountEntityId) {
    db.run("ALTER TABLE accounts ADD COLUMN entity_id TEXT");
  }
  db.run(
    "UPDATE accounts SET entity_id = ? WHERE entity_id IS NULL OR TRIM(entity_id) = ''",
    [defaultEntityId]
  );

  const accountColumnsAfterEntityMigration = all("PRAGMA table_info(accounts)");
  const accountEntityColumn = accountColumnsAfterEntityMigration.find(
    (col) => col.name === "entity_id"
  );
  const accountInstitutionColumn = accountColumnsAfterEntityMigration.find(
    (col) => col.name === "institution_id"
  );
  const accountCurrencyColumn = accountColumnsAfterEntityMigration.find(
    (col) => col.name === "currency_code"
  );
  const accountForeignKeys = all("PRAGMA foreign_key_list(accounts)");
  const hasEntityForeignKey = accountForeignKeys.some(
    (fk) => fk.from === "entity_id" && fk.table === "entities"
  );
  const hasInstitutionForeignKey = accountForeignKeys.some(
    (fk) => fk.from === "institution_id" && fk.table === "institutions"
  );
  const accountIndexes = all("PRAGMA index_list(accounts)");
  const hasEntityNameUniqueIndex = accountIndexes.some(
    (index) => String(index?.name || "") === "idx_accounts_entity_name_lower_unique"
  );
  const accountTableSqlRow = get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'accounts'"
  );
  const hasLegacyGlobalNameUnique = /\bname\s+TEXT\s+NOT\s+NULL\s+UNIQUE\b/i.test(
    String(accountTableSqlRow?.sql || "")
  );
  const accountNeedsRebuild =
    !accountEntityColumn ||
    !accountInstitutionColumn ||
    !accountCurrencyColumn ||
    Number(accountEntityColumn.notnull || 0) !== 1 ||
    !hasEntityForeignKey ||
    !hasInstitutionForeignKey ||
    !hasEntityNameUniqueIndex ||
    hasLegacyGlobalNameUnique;

  if (accountNeedsRebuild) {
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'ewallet')),
        entity_id TEXT NOT NULL,
        institution_id TEXT,
        currency_code TEXT NOT NULL DEFAULT 'PHP',
        created_at TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id),
        FOREIGN KEY (institution_id) REFERENCES institutions(id)
      )
    `);
    db.run(
      `
      INSERT INTO accounts_next (
        id,
        name,
        type,
        entity_id,
        institution_id,
        currency_code,
        created_at
      )
      SELECT
        id,
        name,
        type,
        CASE
          WHEN entity_id IS NULL
            OR TRIM(entity_id) = ''
            OR NOT EXISTS (SELECT 1 FROM entities e WHERE e.id = accounts.entity_id)
            THEN ?
          ELSE entity_id
        END,
        ${
          accountInstitutionColumn
            ? `
        CASE
          WHEN institution_id IS NULL
            OR TRIM(institution_id) = ''
            OR NOT EXISTS (SELECT 1 FROM institutions i WHERE i.id = accounts.institution_id)
            THEN NULL
          ELSE institution_id
        END,
        `
            : "NULL,\n"
        }
        ${
          accountCurrencyColumn
            ? `
        CASE
          WHEN currency_code IS NULL OR TRIM(currency_code) = ''
            THEN COALESCE(
              (
                SELECT i.currency_code
                FROM institutions i
                WHERE i.id = accounts.institution_id
                LIMIT 1
              ),
              'PHP'
            )
          ELSE UPPER(TRIM(currency_code))
        END,
        `
            : `
        COALESCE(
          (
            SELECT i.currency_code
            FROM institutions i
            WHERE i.id = accounts.institution_id
            LIMIT 1
          ),
          'PHP'
        ),
        `
        }
        COALESCE(created_at, ?)
      FROM accounts
      `,
      [defaultEntityId, nowIso]
    );
    db.run("DROP TABLE accounts");
    db.run("ALTER TABLE accounts_next RENAME TO accounts");
  }
  db.run("CREATE INDEX IF NOT EXISTS idx_accounts_entity_id ON accounts(entity_id)");
  db.run(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_entity_name_lower_unique ON accounts(entity_id, lower(name))"
  );
  db.run("CREATE INDEX IF NOT EXISTS idx_accounts_institution_id ON accounts(institution_id)");
  db.run(
    "UPDATE accounts SET currency_code = 'PHP' WHERE currency_code IS NULL OR TRIM(currency_code) = ''"
  );

  const hasCashAccount = get(
    "SELECT id FROM accounts WHERE LOWER(name) = LOWER('Cash on Hand') LIMIT 1"
  );
  if (!hasCashAccount) {
    db.run(
      "INSERT INTO accounts (name, type, entity_id, currency_code, created_at) VALUES (?, ?, ?, ?, ?)",
      ["Cash on Hand", "cash", defaultEntityId, "PHP", new Date().toISOString()]
    );
  }

  let primaryFamilyAccountId = null;
  const existingPrimaryFamilyAccount = get(
    `
    SELECT id, type, entity_id
    FROM accounts
    WHERE LOWER(TRIM(name)) = LOWER(?)
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    `,
    [PRIMARY_FAMILY_ACCOUNT_NAME]
  );
  const existingPrimaryFamilyAccountId = Number(existingPrimaryFamilyAccount?.id);
  if (
    Number.isInteger(existingPrimaryFamilyAccountId) &&
    existingPrimaryFamilyAccountId > 0
  ) {
    primaryFamilyAccountId = existingPrimaryFamilyAccountId;
    if (
      String(existingPrimaryFamilyAccount?.entity_id || "") !== String(familyEntityId) ||
      String(existingPrimaryFamilyAccount?.type || "").toLowerCase() !== "bank"
    ) {
      db.run(
        `
        UPDATE accounts
        SET entity_id = ?, type = 'bank'
        WHERE id = ?
        `,
        [familyEntityId, primaryFamilyAccountId]
      );
    }
  } else {
    const insertPrimaryFamilyAccount = run(
      `
      INSERT INTO accounts (name, type, entity_id, currency_code, created_at)
      VALUES (?, 'bank', ?, 'PHP', ?)
      `,
      [PRIMARY_FAMILY_ACCOUNT_NAME, familyEntityId, new Date().toISOString()]
    );
    const insertedPrimaryFamilyAccountId = Number(insertPrimaryFamilyAccount?.lastID);
    if (Number.isInteger(insertedPrimaryFamilyAccountId) && insertedPrimaryFamilyAccountId > 0) {
      primaryFamilyAccountId = insertedPrimaryFamilyAccountId;
    }
  }

  const removableGenericBankAccounts = all(
    `
    SELECT a.id
    FROM accounts a
    WHERE LOWER(TRIM(a.name)) = LOWER('Bank')
      AND a.type = 'bank'
      AND (a.institution_id IS NULL OR TRIM(a.institution_id) = '')
      AND NOT EXISTS (
        SELECT 1
        FROM transactions t
        WHERE t.from_account_id = a.id OR t.to_account_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM transfers tr
        WHERE tr.from_account_id = a.id OR tr.to_account_id = a.id
      )
    `
  );
  removableGenericBankAccounts.forEach((row) => {
    db.run("DELETE FROM accounts WHERE id = ?", [row.id]);
  });

  function pickFirstAccountId(query, params = []) {
    const row = get(query, params);
    const parsed = Number(row?.id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  function accountIdExists(accountId) {
    if (!Number.isInteger(accountId) || accountId <= 0) {
      return false;
    }
    const row = get("SELECT id FROM accounts WHERE id = ? LIMIT 1", [accountId]);
    return !!row;
  }

  const defaultCashAccountId = pickFirstAccountId(
    `
    SELECT id
    FROM accounts
    WHERE type = 'cash'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    `
  );
  const defaultBankAccountId = pickFirstAccountId(
    `
    SELECT id
    FROM accounts
    WHERE type = 'bank'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    `
  );
  const fallbackAccountId = pickFirstAccountId(
    `
    SELECT id
    FROM accounts
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    `
  );
  const safeExpenseAccountId = defaultCashAccountId ?? fallbackAccountId;
  const safeIncomeAccountId =
    defaultBankAccountId ?? defaultCashAccountId ?? fallbackAccountId;

  const existingSettings = get(
    `
    SELECT default_expense_account_id, default_income_account_id
    FROM settings
    WHERE id = 1
    `
  );
  const existingExpenseDefault = Number(existingSettings?.default_expense_account_id);
  const existingIncomeDefault = Number(existingSettings?.default_income_account_id);

  if (
    safeExpenseAccountId &&
    !accountIdExists(existingExpenseDefault)
  ) {
    db.run(
      "UPDATE settings SET default_expense_account_id = ? WHERE id = 1",
      [safeExpenseAccountId]
    );
  }
  if (
    safeIncomeAccountId &&
    !accountIdExists(existingIncomeDefault)
  ) {
    db.run("UPDATE settings SET default_income_account_id = ? WHERE id = 1", [
      safeIncomeAccountId,
    ]);
  }

  const incomeCount = get("SELECT COUNT(*) AS count FROM income");
  const expensesCount = get("SELECT COUNT(*) AS count FROM expenses");
  const incomeColumns = all("PRAGMA table_info(income)");
  const hasIncomeCategoryId = incomeColumns.some(
    (col) => col.name === "income_category_id"
  );
  if (!hasIncomeCategoryId) {
    db.run("ALTER TABLE income ADD COLUMN income_category_id INTEGER");
  }
  const hasIncomeEntityId = incomeColumns.some((col) => col.name === "entity_id");
  if (!hasIncomeEntityId) {
    db.run("ALTER TABLE income ADD COLUMN entity_id TEXT");
  }
  const hasIncomeToAccountId = incomeColumns.some((col) => col.name === "to_account_id");
  if (!hasIncomeToAccountId) {
    db.run("ALTER TABLE income ADD COLUMN to_account_id INTEGER");
  }
  const hasIncomeTransferBookkeeping = incomeColumns.some(
    (col) => col.name === "is_transfer_bookkeeping"
  );
  if (!hasIncomeTransferBookkeeping) {
    db.run(
      "ALTER TABLE income ADD COLUMN is_transfer_bookkeeping INTEGER NOT NULL DEFAULT 0"
    );
  }

  const expenseColumns = all("PRAGMA table_info(expenses)");
  const hasExpenseCreatedAt = expenseColumns.some(
    (col) => col.name === "created_at"
  );
  if (!hasExpenseCreatedAt) {
    db.run("ALTER TABLE expenses ADD COLUMN created_at TEXT");
  }
  const hasExpenseCategoryId = expenseColumns.some(
    (col) => col.name === "expense_category_id"
  );
  if (!hasExpenseCategoryId) {
    db.run("ALTER TABLE expenses ADD COLUMN expense_category_id INTEGER");
  }
  const hasExpenseExpectation = expenseColumns.some(
    (col) => col.name === "expense_expectation"
  );
  if (!hasExpenseExpectation) {
    db.run(
      "ALTER TABLE expenses ADD COLUMN expense_expectation TEXT DEFAULT 'unexpected'"
    );
  }
  const hasExpenseEntityId = expenseColumns.some((col) => col.name === "entity_id");
  if (!hasExpenseEntityId) {
    db.run("ALTER TABLE expenses ADD COLUMN entity_id TEXT");
  }
  const hasExpenseFromAccountId = expenseColumns.some(
    (col) => col.name === "from_account_id"
  );
  if (!hasExpenseFromAccountId) {
    db.run("ALTER TABLE expenses ADD COLUMN from_account_id INTEGER");
  }
  const hasExpenseTransferBookkeeping = expenseColumns.some(
    (col) => col.name === "is_transfer_bookkeeping"
  );
  if (!hasExpenseTransferBookkeeping) {
    db.run(
      "ALTER TABLE expenses ADD COLUMN is_transfer_bookkeeping INTEGER NOT NULL DEFAULT 0"
    );
  }
  const expenseRows = all("SELECT id, expense_expectation FROM expenses");
  expenseRows.forEach((row) => {
    const nextExpectation =
      normalizeExpenseExpectation(row.expense_expectation) || "unexpected";
    if (nextExpectation !== row.expense_expectation) {
      db.run("UPDATE expenses SET expense_expectation = ? WHERE id = ?", [
        nextExpectation,
        row.id,
      ]);
    }
  });

  const suggestionColumns = all("PRAGMA table_info(expense_suggestions)");
  const suggestionPkByColumn = new Map(
    suggestionColumns.map((col) => [col.name, Number(col.pk || 0)])
  );
  const hasSuggestionExpenseCategoryId = suggestionColumns.some(
    (col) => col.name === "expense_category_id"
  );
  const hasSuggestionHidden = suggestionColumns.some(
    (col) => col.name === "hidden"
  );
  const hasSuggestionSelectedForEncoding = suggestionColumns.some(
    (col) => col.name === "selected_for_encoding"
  );
  const hasSuggestionCompositePrimaryKey =
    suggestionPkByColumn.get("expense_category_id") === 1 &&
    suggestionPkByColumn.get("category") === 2;

  if (!hasSuggestionExpenseCategoryId || !hasSuggestionCompositePrimaryKey) {
    const sourceCategoryId = hasSuggestionExpenseCategoryId
      ? "COALESCE(expense_category_id, 0)"
      : "0";
    const sourceHidden = hasSuggestionHidden ? "COALESCE(hidden, 0)" : "0";
    const sourceSelectedForEncoding = hasSuggestionSelectedForEncoding
      ? "COALESCE(selected_for_encoding, 0)"
      : "0";
    db.run(`
      CREATE TABLE IF NOT EXISTS expense_suggestions_next (
        expense_category_id INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL,
        last_amount REAL,
        hidden INTEGER DEFAULT 0,
        selected_for_encoding INTEGER DEFAULT 0,
        PRIMARY KEY (expense_category_id, category)
      )
    `);
    db.run(
      `
      INSERT OR REPLACE INTO expense_suggestions_next (
        expense_category_id,
        category,
        last_amount,
        hidden,
        selected_for_encoding
      )
      SELECT
        ${sourceCategoryId},
        category,
        last_amount,
        ${sourceHidden},
        ${sourceSelectedForEncoding}
      FROM expense_suggestions
      WHERE category IS NOT NULL AND TRIM(category) <> ''
      `
    );
    db.run("DROP TABLE expense_suggestions");
    db.run("ALTER TABLE expense_suggestions_next RENAME TO expense_suggestions");
  } else {
    if (!hasSuggestionHidden) {
      db.run("ALTER TABLE expense_suggestions ADD COLUMN hidden INTEGER DEFAULT 0");
    }
    if (!hasSuggestionSelectedForEncoding) {
      db.run(
        "ALTER TABLE expense_suggestions ADD COLUMN selected_for_encoding INTEGER DEFAULT 0"
      );
    }
  }
  db.run(
    "UPDATE expense_suggestions SET expense_category_id = 0 WHERE expense_category_id IS NULL"
  );
  const rawSuggestionRows = all(
    `
    SELECT
      rowid,
      expense_category_id,
      category,
      last_amount,
      hidden,
      selected_for_encoding
    FROM expense_suggestions
    ORDER BY rowid DESC
    `
  );
  const dedupedSuggestionRows = new Map();
  rawSuggestionRows.forEach((row) => {
    const categoryId = normalizeSuggestionCategoryId(row.expense_category_id);
    const categoryName = normalizeSuggestionName(row.category);
    if (categoryId === null || !categoryName) {
      return;
    }
    const normalizedKey = `${categoryId}::${categoryName.toLowerCase()}`;
    if (dedupedSuggestionRows.has(normalizedKey)) {
      return;
    }
    dedupedSuggestionRows.set(normalizedKey, {
      expense_category_id: categoryId,
      category: categoryName,
      last_amount: Number(row.last_amount ?? 0),
      hidden: Number(row.hidden ?? 0) === 1 ? 1 : 0,
      selected_for_encoding:
        Number(row.selected_for_encoding ?? 0) === 1 ? 1 : 0,
    });
  });
  db.run("DELETE FROM expense_suggestions");
  Array.from(dedupedSuggestionRows.values()).forEach((row) => {
    db.run(
      `
      INSERT INTO expense_suggestions (
        expense_category_id,
        category,
        last_amount,
        hidden,
        selected_for_encoding
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        row.expense_category_id,
        row.category,
        row.last_amount,
        row.hidden,
        row.selected_for_encoding,
      ]
    );
  });

  const categoryColumns = all("PRAGMA table_info(categories)");
  const hasCategoryColor = categoryColumns.some((col) => col.name === "color");
  if (!hasCategoryColor) {
    db.run("ALTER TABLE categories ADD COLUMN color TEXT");
  }
  const hasCategoryIcon = categoryColumns.some((col) => col.name === "icon");
  if (!hasCategoryIcon) {
    db.run("ALTER TABLE categories ADD COLUMN icon TEXT");
  }

  const categoryRows = all("SELECT id, name, color, icon FROM categories");
  categoryRows.forEach((row) => {
    const normalizedColor = normalizeCategoryColor(row.color);
    const normalizedIcon = normalizeCategoryIcon(row.icon);
    const fallbackColor = pickCategoryColor(`${row.id}:${row.name}`);
    const nextColor =
      LEGACY_TO_CURRENT_SWATCH.get(normalizedColor) ||
      normalizedColor ||
      fallbackColor;
    if (nextColor !== row.color) {
      db.run("UPDATE categories SET color = ? WHERE id = ?", [nextColor, row.id]);
    }
    if (normalizedIcon !== row.icon) {
      db.run("UPDATE categories SET icon = ? WHERE id = ?", [normalizedIcon, row.id]);
    }
  });

  const incomeCategoryColumns = all("PRAGMA table_info(income_categories)");
  const hasIncomeCategoryColor = incomeCategoryColumns.some(
    (col) => col.name === "color"
  );
  if (!hasIncomeCategoryColor) {
    db.run("ALTER TABLE income_categories ADD COLUMN color TEXT");
  }
  const hasIncomeCategoryIcon = incomeCategoryColumns.some(
    (col) => col.name === "icon"
  );
  if (!hasIncomeCategoryIcon) {
    db.run("ALTER TABLE income_categories ADD COLUMN icon TEXT");
  }

  const incomeCategoryRows = all("SELECT id, name, color, icon FROM income_categories");
  incomeCategoryRows.forEach((row) => {
    const normalizedColor = normalizeCategoryColor(row.color);
    const normalizedIcon = normalizeCategoryIcon(row.icon);
    const fallbackColor = pickCategoryColor(`income:${row.id}:${row.name}`);
    const nextColor =
      LEGACY_TO_CURRENT_SWATCH.get(normalizedColor) ||
      normalizedColor ||
      fallbackColor;
    if (nextColor !== row.color) {
      db.run("UPDATE income_categories SET color = ? WHERE id = ?", [
        nextColor,
        row.id,
      ]);
    }
    if (normalizedIcon !== row.icon) {
      db.run("UPDATE income_categories SET icon = ? WHERE id = ?", [
        normalizedIcon,
        row.id,
      ]);
    }
  });

  const debtColumns = all("PRAGMA table_info(debts)");
  const hasDebtCreatedAt = debtColumns.some((col) => col.name === "created_at");
  if (!hasDebtCreatedAt) {
    db.run("ALTER TABLE debts ADD COLUMN created_at TEXT");
  }
  const hasDebtCategoryId = debtColumns.some(
    (col) => col.name === "debt_category_id"
  );
  if (!hasDebtCategoryId) {
    db.run("ALTER TABLE debts ADD COLUMN debt_category_id INTEGER");
  }
  const hasDebtStatementMonth = debtColumns.some(
    (col) => col.name === "statement_month"
  );
  if (!hasDebtStatementMonth) {
    db.run("ALTER TABLE debts ADD COLUMN statement_month TEXT");
  }
  const hasDebtEntityId = debtColumns.some((col) => col.name === "entity_id");
  if (!hasDebtEntityId) {
    db.run("ALTER TABLE debts ADD COLUMN entity_id TEXT");
  }

  const recurringColumns = all("PRAGMA table_info(recurring_items)");
  const hasRecurringExpenseCategoryId = recurringColumns.some(
    (col) => col.name === "expense_category_id"
  );
  if (!hasRecurringExpenseCategoryId) {
    db.run("ALTER TABLE recurring_items ADD COLUMN expense_category_id INTEGER");
  }
  const hasRecurringIncomeCategoryId = recurringColumns.some(
    (col) => col.name === "income_category_id"
  );
  if (!hasRecurringIncomeCategoryId) {
    db.run("ALTER TABLE recurring_items ADD COLUMN income_category_id INTEGER");
  }
  const hasRecurringSemiMonthlyDay1 = recurringColumns.some(
    (col) => col.name === "semi_monthly_day_1"
  );
  if (!hasRecurringSemiMonthlyDay1) {
    db.run("ALTER TABLE recurring_items ADD COLUMN semi_monthly_day_1 INTEGER");
  }
  const hasRecurringSemiMonthlyDay2 = recurringColumns.some(
    (col) => col.name === "semi_monthly_day_2"
  );
  if (!hasRecurringSemiMonthlyDay2) {
    db.run("ALTER TABLE recurring_items ADD COLUMN semi_monthly_day_2 INTEGER");
  }
  const hasRecurringEntityId = recurringColumns.some((col) => col.name === "entity_id");
  if (!hasRecurringEntityId) {
    db.run("ALTER TABLE recurring_items ADD COLUMN entity_id TEXT");
  }
  const hasRecurringFromAccountId = recurringColumns.some(
    (col) => col.name === "from_account_id"
  );
  if (!hasRecurringFromAccountId) {
    db.run("ALTER TABLE recurring_items ADD COLUMN from_account_id INTEGER");
  }
  const hasRecurringToAccountId = recurringColumns.some(
    (col) => col.name === "to_account_id"
  );
  if (!hasRecurringToAccountId) {
    db.run("ALTER TABLE recurring_items ADD COLUMN to_account_id INTEGER");
  }
  const hasRecurringMirrorAsIncomeExpense = recurringColumns.some(
    (col) => col.name === "mirror_as_income_expense"
  );
  if (!hasRecurringMirrorAsIncomeExpense) {
    db.run(
      "ALTER TABLE recurring_items ADD COLUMN mirror_as_income_expense INTEGER NOT NULL DEFAULT 0"
    );
  }
  const hasRecurringTransferFeeAmount = recurringColumns.some(
    (col) => col.name === "transfer_fee_amount"
  );
  if (!hasRecurringTransferFeeAmount) {
    db.run(
      "ALTER TABLE recurring_items ADD COLUMN transfer_fee_amount REAL NOT NULL DEFAULT 0"
    );
  }
  db.run("CREATE INDEX IF NOT EXISTS idx_recurring_items_entity_id ON recurring_items(entity_id)");
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_recurring_items_from_account_id ON recurring_items(from_account_id)"
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_recurring_items_to_account_id ON recurring_items(to_account_id)"
  );

  const transferBookkeepingBackfillDone =
    Number(
      get(
        `SELECT ${TRANSFER_BOOKKEEPING_BACKFILL_V1_FLAG} AS done FROM settings WHERE id = 1`
      )?.done ?? 0
    ) === 1;
  if (!transferBookkeepingBackfillDone) {
    const mirroredRecurringTransfers = all(
      `
      SELECT
        r.id,
        r.category,
        r.description,
        r.amount,
        r.expense_category_id,
        r.income_category_id,
        r.from_account_id,
        r.to_account_id,
        from_account.entity_id AS from_entity_id,
        to_account.entity_id AS to_entity_id
      FROM recurring_items r
      INNER JOIN accounts from_account ON from_account.id = r.from_account_id
      INNER JOIN accounts to_account ON to_account.id = r.to_account_id
      WHERE r.type = 'transfer'
        AND COALESCE(r.mirror_as_income_expense, 0) = 1
        AND r.from_account_id IS NOT NULL
        AND r.to_account_id IS NOT NULL
      `
    );

    mirroredRecurringTransfers.forEach((item) => {
      const amount = Number(item.amount ?? 0);
      const amountCents = Math.round(amount * 100);
      const fromEntityId = String(item.from_entity_id || "").trim();
      const toEntityId = String(item.to_entity_id || "").trim();
      const category = String(item.category || "").trim();
      const description = String(item.description || "");
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amountCents <= 0 ||
        !fromEntityId ||
        !toEntityId ||
        !category
      ) {
        return;
      }

      const matchingTransfers = all(
        `
        SELECT transfer_date
        FROM transfers
        WHERE from_account_id = ?
          AND to_account_id = ?
          AND amount_cents = ?
        ORDER BY created_at DESC, id DESC
        `,
        [item.from_account_id, item.to_account_id, amountCents]
      );

      matchingTransfers.forEach((transferRow) => {
        const transferDate = String(transferRow.transfer_date || "").slice(0, 10);
        if (!transferDate) {
          return;
        }

        const mirroredExpense = get(
          `
          SELECT id
          FROM expenses
          WHERE COALESCE(is_transfer_bookkeeping, 0) = 0
            AND entity_id = ?
            AND ABS(amount - ?) < 0.000001
            AND spent_at = ?
            AND category = ?
            AND COALESCE(expense_category_id, -1) = COALESCE(?, -1)
            AND COALESCE(notes, '') = ?
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT 1
          `,
          [
            fromEntityId,
            amount,
            transferDate,
            category,
            item.expense_category_id,
            description,
          ]
        );
        const mirroredIncome = get(
          `
          SELECT id
          FROM income
          WHERE COALESCE(is_transfer_bookkeeping, 0) = 0
            AND entity_id = ?
            AND ABS(amount - ?) < 0.000001
            AND received_date = ?
            AND source = ?
            AND COALESCE(income_category_id, -1) = COALESCE(?, -1)
          ORDER BY id DESC
          LIMIT 1
          `,
          [toEntityId, amount, transferDate, category, item.income_category_id]
        );

        if (mirroredExpense?.id && mirroredIncome?.id) {
          db.run(
            "UPDATE expenses SET is_transfer_bookkeeping = 1 WHERE id = ?",
            [mirroredExpense.id]
          );
          db.run(
            "UPDATE income SET is_transfer_bookkeeping = 1 WHERE id = ?",
            [mirroredIncome.id]
          );
        }
      });
    });

    db.run(
      `UPDATE settings SET ${TRANSFER_BOOKKEEPING_BACKFILL_V1_FLAG} = 1 WHERE id = 1`
    );
  }

  const legacyAccountAttributionBackfillDone =
    Number(
      get(
        `SELECT ${LEGACY_ACCOUNT_ATTRIBUTION_BACKFILL_V1_FLAG} AS done FROM settings WHERE id = 1`
      )?.done ?? 0
    ) === 1;
  if (!legacyAccountAttributionBackfillDone) {
    const incomeRowsMissingAccount = all(
      `
      SELECT id, entity_id
      FROM income
      WHERE to_account_id IS NULL
        AND COALESCE(is_transfer_bookkeeping, 0) = 0
      ORDER BY id ASC
      `
    );
    for (const row of incomeRowsMissingAccount) {
      const entityId = String(row?.entity_id || "").trim();
      if (!entityId) {
        continue;
      }
      const accountId = await resolveEntityDefaultAccountId({
        get,
        all,
        entityId,
        kind: "income",
      });
      if (accountId) {
        db.run("UPDATE income SET to_account_id = ? WHERE id = ?", [
          accountId,
          row.id,
        ]);
      }
    }

    const expenseRowsMissingAccount = all(
      `
      SELECT id, entity_id
      FROM expenses
      WHERE from_account_id IS NULL
        AND COALESCE(is_transfer_bookkeeping, 0) = 0
      ORDER BY id ASC
      `
    );
    for (const row of expenseRowsMissingAccount) {
      const entityId = String(row?.entity_id || "").trim();
      if (!entityId) {
        continue;
      }
      const accountId = await resolveEntityDefaultAccountId({
        get,
        all,
        entityId,
        kind: "expense",
      });
      if (accountId) {
        db.run("UPDATE expenses SET from_account_id = ? WHERE id = ?", [
          accountId,
          row.id,
        ]);
      }
    }

    db.run(
      `UPDATE settings SET ${LEGACY_ACCOUNT_ATTRIBUTION_BACKFILL_V1_FLAG} = 1 WHERE id = 1`
    );
  }

  let monthlyReportColumns = all("PRAGMA table_info(monthly_reports)");
  const hasMonthlyReportJson = monthlyReportColumns.some(
    (col) => col.name === "report_json"
  );
  if (!hasMonthlyReportJson) {
    db.run("ALTER TABLE monthly_reports ADD COLUMN report_json TEXT");
  }
  const hasMonthlyGeneratedAt = monthlyReportColumns.some(
    (col) => col.name === "generated_at"
  );
  if (!hasMonthlyGeneratedAt) {
    db.run("ALTER TABLE monthly_reports ADD COLUMN generated_at TEXT");
  }
  const hasMonthlyUpdatedAt = monthlyReportColumns.some(
    (col) => col.name === "updated_at"
  );
  if (!hasMonthlyUpdatedAt) {
    db.run("ALTER TABLE monthly_reports ADD COLUMN updated_at TEXT");
  }
  monthlyReportColumns = all("PRAGMA table_info(monthly_reports)");
  const hasMonthlyEntityId = monthlyReportColumns.some(
    (col) => col.name === "entity_id"
  );
  const monthlyReportIndexes = all("PRAGMA index_list(monthly_reports)");
  const hasScopedMonthlyUniqueIndex = monthlyReportIndexes.some((idx) => {
    if (Number(idx?.unique || 0) !== 1) {
      return false;
    }
    const cols = all(`PRAGMA index_info(${idx.name})`).map((col) => col.name);
    return (
      cols.length === 2 &&
      cols[0] === "month_key" &&
      cols[1] === "entity_id"
    );
  });

  if (!hasMonthlyEntityId || !hasScopedMonthlyUniqueIndex) {
    const migrationNow = new Date().toISOString();
    const sourceEntityExpr = hasMonthlyEntityId
      ? "COALESCE(NULLIF(TRIM(entity_id), ''), '')"
      : "''";
    db.run(`
      CREATE TABLE IF NOT EXISTS monthly_reports_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_key TEXT NOT NULL,
        entity_id TEXT NOT NULL DEFAULT '',
        report_json TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (month_key, entity_id)
      )
    `);
    db.run(
      `
      INSERT OR REPLACE INTO monthly_reports_next (
        id,
        month_key,
        entity_id,
        report_json,
        generated_at,
        updated_at
      )
      SELECT
        id,
        month_key,
        ${sourceEntityExpr},
        COALESCE(NULLIF(report_json, ''), '{}'),
        COALESCE(NULLIF(generated_at, ''), ?),
        COALESCE(NULLIF(updated_at, ''), COALESCE(NULLIF(generated_at, ''), ?))
      FROM monthly_reports
      WHERE month_key IS NOT NULL AND TRIM(month_key) <> ''
      `,
      [migrationNow, migrationNow]
    );
    db.run("DROP TABLE monthly_reports");
    db.run("ALTER TABLE monthly_reports_next RENAME TO monthly_reports");
  }

  db.run(
    "UPDATE monthly_reports SET entity_id = '' WHERE entity_id IS NULL OR TRIM(entity_id) = ''"
  );
  const monthlyReportNow = new Date().toISOString();
  db.run(
    "UPDATE monthly_reports SET report_json = '{}' WHERE report_json IS NULL OR report_json = ''"
  );
  db.run(
    "UPDATE monthly_reports SET generated_at = ? WHERE generated_at IS NULL OR generated_at = ''",
    [monthlyReportNow]
  );
  db.run(
    "UPDATE monthly_reports SET updated_at = generated_at WHERE updated_at IS NULL OR updated_at = ''"
  );

  const projectionScenarioColumns = all("PRAGMA table_info(projection_scenarios)");
  const hasProjectionWorkspaceId = projectionScenarioColumns.some(
    (col) => col.name === "workspace_id"
  );
  const hasProjectionType = projectionScenarioColumns.some((col) => col.name === "type");
  const hasProjectionEntityId = projectionScenarioColumns.some(
    (col) => col.name === "entity_id"
  );
  const hasProjectionCurrency = projectionScenarioColumns.some(
    (col) => col.name === "currency"
  );
  const hasProjectionInitialAmount = projectionScenarioColumns.some(
    (col) => col.name === "initial_amount"
  );
  const hasProjectionAnnualInterestRate = projectionScenarioColumns.some(
    (col) => col.name === "annual_interest_rate"
  );
  const hasProjectionDurationMonths = projectionScenarioColumns.some(
    (col) => col.name === "duration_months"
  );
  const hasProjectionMonthlyContribution = projectionScenarioColumns.some(
    (col) => col.name === "monthly_contribution"
  );
  const hasProjectionCompoundingFrequency = projectionScenarioColumns.some(
    (col) => col.name === "compounding_frequency"
  );
  const hasProjectionCashflowAssumptionsJson = projectionScenarioColumns.some(
    (col) => col.name === "cashflow_assumptions_json"
  );
  const hasProjectionNotes = projectionScenarioColumns.some((col) => col.name === "notes");
  const hasProjectionCreatedAt = projectionScenarioColumns.some(
    (col) => col.name === "created_at"
  );
  const hasProjectionUpdatedAt = projectionScenarioColumns.some(
    (col) => col.name === "updated_at"
  );

  if (!hasProjectionWorkspaceId) {
    db.run(
      "ALTER TABLE projection_scenarios ADD COLUMN workspace_id TEXT DEFAULT 'default'"
    );
  }
  if (!hasProjectionEntityId) {
    db.run("ALTER TABLE projection_scenarios ADD COLUMN entity_id TEXT");
  }
  if (!hasProjectionType) {
    db.run(
      "ALTER TABLE projection_scenarios ADD COLUMN type TEXT DEFAULT 'SAVINGS'"
    );
  }
  if (!hasProjectionCurrency) {
    db.run("ALTER TABLE projection_scenarios ADD COLUMN currency TEXT DEFAULT 'PHP'");
  }
  if (!hasProjectionInitialAmount) {
    db.run(
      "ALTER TABLE projection_scenarios ADD COLUMN initial_amount REAL DEFAULT 0"
    );
  }
  if (!hasProjectionAnnualInterestRate) {
    db.run(
      "ALTER TABLE projection_scenarios ADD COLUMN annual_interest_rate REAL DEFAULT 0"
    );
  }
  if (!hasProjectionDurationMonths) {
    db.run(
      "ALTER TABLE projection_scenarios ADD COLUMN duration_months INTEGER DEFAULT 12"
    );
  }
  if (!hasProjectionMonthlyContribution) {
    db.run(
      "ALTER TABLE projection_scenarios ADD COLUMN monthly_contribution REAL DEFAULT 0"
    );
  }
  if (!hasProjectionCompoundingFrequency) {
    db.run(
      "ALTER TABLE projection_scenarios ADD COLUMN compounding_frequency TEXT DEFAULT 'monthly'"
    );
  }
  if (!hasProjectionCashflowAssumptionsJson) {
    db.run(
      "ALTER TABLE projection_scenarios ADD COLUMN cashflow_assumptions_json TEXT DEFAULT '{}'"
    );
  }
  if (!hasProjectionNotes) {
    db.run("ALTER TABLE projection_scenarios ADD COLUMN notes TEXT");
  }
  if (!hasProjectionCreatedAt) {
    db.run("ALTER TABLE projection_scenarios ADD COLUMN created_at TEXT");
  }
  if (!hasProjectionUpdatedAt) {
    db.run("ALTER TABLE projection_scenarios ADD COLUMN updated_at TEXT");
  }
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_projection_scenarios_workspace_id ON projection_scenarios(workspace_id)"
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_projection_scenarios_entity_id ON projection_scenarios(entity_id)"
  );
  const projectionNow = new Date().toISOString();
  db.run(
    "UPDATE projection_scenarios SET entity_id = ? WHERE entity_id IS NULL OR TRIM(entity_id) = ''",
    [defaultEntityId]
  );
  db.run(
    "UPDATE projection_scenarios SET workspace_id = 'default' WHERE workspace_id IS NULL OR TRIM(workspace_id) = ''"
  );
  db.run(
    "UPDATE projection_scenarios SET type = 'SAVINGS' WHERE type IS NULL OR TRIM(type) = ''"
  );
  db.run(
    "UPDATE projection_scenarios SET currency = 'PHP' WHERE currency IS NULL OR TRIM(currency) = ''"
  );
  db.run(
    "UPDATE projection_scenarios SET cashflow_assumptions_json = '{}' WHERE cashflow_assumptions_json IS NULL OR TRIM(cashflow_assumptions_json) = ''"
  );
  db.run(
    "UPDATE projection_scenarios SET monthly_contribution = 0 WHERE monthly_contribution IS NULL"
  );
  db.run(
    "UPDATE projection_scenarios SET compounding_frequency = 'monthly' WHERE compounding_frequency IS NULL OR TRIM(compounding_frequency) = ''"
  );
  db.run(
    "UPDATE projection_scenarios SET created_at = ? WHERE created_at IS NULL OR created_at = ''",
    [projectionNow]
  );
  db.run(
    "UPDATE projection_scenarios SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''"
  );
  const projectionEntityBackfillState = get(
    `
    SELECT COALESCE(${PROJECTION_ENTITY_BACKFILL_V1_FLAG}, 0) AS completed
    FROM settings
    WHERE id = 1
    `
  );
  const shouldRunProjectionEntityBackfill =
    Number(projectionEntityBackfillState?.completed ?? 0) !== 1;
  if (shouldRunProjectionEntityBackfill && familyEntityId) {
    db.run(
      `
      UPDATE projection_scenarios
      SET entity_id = ?
      WHERE entity_id IS NULL
        OR TRIM(entity_id) = ''
        OR entity_id = ?
      `,
      [familyEntityId, defaultEntityId]
    );
    db.run(
      `UPDATE settings SET ${PROJECTION_ENTITY_BACKFILL_V1_FLAG} = 1 WHERE id = 1`
    );
  }

  if ((incomeCount?.count ?? 0) === 0 && (expensesCount?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO income (amount, source, received_date, entity_id) VALUES (?, ?, ?, ?)",
      [2500, "Primary Job", "2026-03-01", familyEntityId]
    );
    db.run(
      "INSERT INTO income (amount, source, received_date, entity_id) VALUES (?, ?, ?, ?)",
      [200, "Freelance", "2026-03-15", familyEntityId]
    );
    db.run(
      "INSERT INTO income (amount, source, received_date, entity_id) VALUES (?, ?, ?, ?)",
      [300, "Bonus", "2026-04-05", familyEntityId]
    );

    db.run(
      "INSERT INTO expenses (amount, category, notes, spent_at, created_at, entity_id) VALUES (?, ?, ?, ?, ?, ?)",
      [120, "Groceries", "Weekly run", "2026-03-03", now, familyEntityId]
    );
    db.run(
      "INSERT INTO expenses (amount, category, notes, spent_at, created_at, entity_id) VALUES (?, ?, ?, ?, ?, ?)",
      [60, "Transport", "Gas", "2026-03-06", now, familyEntityId]
    );
    db.run(
      "INSERT INTO expenses (amount, category, notes, spent_at, created_at, entity_id) VALUES (?, ?, ?, ?, ?, ?)",
      [90, "Dining", "Family dinner", "2026-03-10", now, familyEntityId]
    );
    db.run(
      "INSERT INTO expenses (amount, category, notes, spent_at, created_at, entity_id) VALUES (?, ?, ?, ?, ?, ?)",
      [45, "Utilities", "Electricity", "2026-03-12", now, familyEntityId]
    );
  }

  const familyPnbBackfillState = get(
    `
    SELECT ${FAMILY_PNB_BACKFILL_V1_FLAG} AS completed
    FROM settings
    WHERE id = 1
    `
  );
  const shouldRunFamilyPnbBackfill =
    Number(familyPnbBackfillState?.completed ?? 0) !== 1;
  if (shouldRunFamilyPnbBackfill) {
    db.run(
      `
      UPDATE income
      SET entity_id = ?
      `,
      [familyEntityId]
    );
    db.run(
      `
      UPDATE expenses
      SET entity_id = ?
      `,
      [familyEntityId]
    );
    db.run(
      `
      UPDATE debts
      SET entity_id = ?
      `,
      [familyEntityId]
    );
    db.run(
      `
      UPDATE recurring_items
      SET entity_id = ?
      `,
      [familyEntityId]
    );

    if (Number.isInteger(primaryFamilyAccountId) && primaryFamilyAccountId > 0) {
      db.run(
        `
        UPDATE transactions
        SET to_account_id = ?
        WHERE type IN ('income', 'initial_balance')
        `,
        [primaryFamilyAccountId]
      );
      db.run(
        `
        UPDATE transactions
        SET from_account_id = ?
        WHERE type = 'expense'
        `,
        [primaryFamilyAccountId]
      );
      db.run(
        `
        UPDATE settings
        SET
          default_expense_account_id = ?,
          default_income_account_id = ?,
          ${FAMILY_PNB_BACKFILL_V1_FLAG} = 1
        WHERE id = 1
        `,
        [primaryFamilyAccountId, primaryFamilyAccountId]
      );
    } else {
      db.run(
        `UPDATE settings SET ${FAMILY_PNB_BACKFILL_V1_FLAG} = 1 WHERE id = 1`
      );
    }
  }

  if (hasExpenseCreatedAt) {
    db.run(
      "UPDATE expenses SET created_at = spent_at || 'T00:00:00' WHERE created_at IS NULL OR created_at = ''"
    );
  }

  persist();
}

module.exports = { run, get, all, exec, init };
