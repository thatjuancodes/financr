const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const initSqlJs = require("sql.js");
const { resolveEntityDefaultAccountId } = require("./accountPreferences");
const {
  DEFAULT_LOCAL_USER_ID,
  DEFAULT_LOCAL_WORKSPACE_ID,
  DEFAULT_LOCAL_USER_EMAIL,
  DEFAULT_LOCAL_USER_PASSWORD,
  DEFAULT_LOCAL_USER_NAME,
  DEFAULT_LOCAL_WORKSPACE_NAME,
  DEMO_LOCAL_USER_ID,
  DEMO_LOCAL_USER_EMAIL,
  DEMO_LOCAL_USER_PASSWORD,
  DEMO_LOCAL_USER_NAME,
  DEMO_BLANK_USER_ID,
  DEMO_BLANK_USER_EMAIL,
  DEMO_BLANK_USER_PASSWORD,
  DEMO_BLANK_USER_NAME,
  hashPassword,
} = require("./auth");
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
const DEMO_SHOWCASE_WORKSPACE_ID = "00000000-0000-4000-8000-000000000005";
const DEMO_SHOWCASE_WORKSPACE_NAME = "Steward Showcase";
const DEMO_BLANK_WORKSPACE_ID = "00000000-0000-4000-8000-000000000006";
const DEMO_BLANK_WORKSPACE_NAME = "Steward Blank Workspace";
const DEMO_SHOWCASE_ENTITY_SEEDS = [
  {
    id: "44444444-4444-4444-4444-444444444441",
    name: "Marco Alvarez",
    type: "personal",
  },
  {
    id: "44444444-4444-4444-4444-444444444442",
    name: "Alvarez Family",
    type: "family",
  },
  {
    id: "44444444-4444-4444-4444-444444444443",
    name: "Alvarez Creative Studio",
    type: "business",
  },
];
const DEMO_SHOWCASE_MONTHLY_SEEDS = [
  {
    month: "2025-11",
    personalIncome: 85000,
    personalExpenses: { housing: 19000, groceries: 12000, mobility: 12000 },
    familyIncome: 32000,
    familyExpenses: { groceries: 14500, utilities: 6000, education: 8500 },
    businessIncome: 180000,
    businessExpenses: { payroll: 72000, software: 15000, marketing: 18000, operations: 20000 },
    personalDebt: 7800,
  },
  {
    month: "2025-12",
    personalIncome: 86000,
    personalExpenses: { housing: 19000, groceries: 12500, mobility: 12500 },
    familyIncome: 33000,
    familyExpenses: { groceries: 15000, utilities: 6000, education: 9000 },
    businessIncome: 195000,
    businessExpenses: { payroll: 75000, software: 15000, marketing: 19000, operations: 24000 },
    personalDebt: 7800,
  },
  {
    month: "2026-01",
    personalIncome: 88000,
    personalExpenses: { housing: 19500, groceries: 12500, mobility: 13000 },
    familyIncome: 34000,
    familyExpenses: { groceries: 15500, utilities: 6500, education: 9000 },
    businessIncome: 210000,
    businessExpenses: { payroll: 78000, software: 16000, marketing: 20000, operations: 26000 },
    personalDebt: 7800,
  },
  {
    month: "2026-02",
    personalIncome: 90000,
    personalExpenses: { housing: 19500, groceries: 13000, mobility: 13000 },
    familyIncome: 35000,
    familyExpenses: { groceries: 16000, utilities: 6500, education: 9500 },
    businessIncome: 225000,
    businessExpenses: { payroll: 81000, software: 17000, marketing: 21000, operations: 30000 },
    personalDebt: 7800,
  },
  {
    month: "2026-03",
    personalIncome: 93000,
    personalExpenses: { housing: 20000, groceries: 13500, mobility: 13500 },
    familyIncome: 36500,
    familyExpenses: { groceries: 16500, utilities: 7000, education: 9500 },
    businessIncome: 245000,
    businessExpenses: { payroll: 84000, software: 18000, marketing: 23000, operations: 32000 },
    personalDebt: 7800,
  },
  {
    month: "2026-04",
    personalIncome: 96000,
    personalExpenses: { housing: 20000, groceries: 14000, mobility: 14000 },
    familyIncome: 38000,
    familyExpenses: { groceries: 17000, utilities: 7500, education: 10000 },
    businessIncome: 265000,
    businessExpenses: { payroll: 88000, software: 18000, marketing: 24000, operations: 35000 },
    personalDebt: 7800,
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

function monthDate(monthKey, day) {
  return `${String(monthKey)}-${String(day).padStart(2, "0")}`;
}

function monthTimestamp(monthKey, day = 1) {
  return `${monthDate(monthKey, day)}T09:00:00.000Z`;
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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'household',
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS workspace_invites (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      invited_by_user_id TEXT NOT NULL,
      accepted_by_user_id TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('personal', 'family', 'business')),
      workspace_id TEXT,
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

    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_label TEXT,
      status TEXT NOT NULL,
      parser_id TEXT,
      raw_text TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS import_files (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      sha256_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_candidates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      status TEXT NOT NULL,
      candidate_type TEXT NOT NULL,
      transaction_date TEXT,
      posted_date TEXT,
      description TEXT,
      merchant TEXT,
      amount_cents INTEGER,
      currency_code TEXT,
      suggested_entity_id TEXT,
      suggested_account_id INTEGER,
      suggested_to_account_id INTEGER,
      suggested_category_id INTEGER,
      confidence_score REAL,
      duplicate_of_type TEXT,
      duplicate_of_id TEXT,
      raw_line TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL,
      approved_at TEXT,
      approved_by_user_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_import_batches_workspace_id
      ON import_batches(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_import_files_batch_id
      ON import_files(batch_id);
    CREATE INDEX IF NOT EXISTS idx_import_files_sha256_hash
      ON import_files(sha256_hash);
    CREATE INDEX IF NOT EXISTS idx_import_candidates_workspace_id
      ON import_candidates(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_import_candidates_batch_id
      ON import_candidates(batch_id);
    CREATE INDEX IF NOT EXISTS idx_import_candidates_status
      ON import_candidates(status);

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
      workspace_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      report_json TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (workspace_id, month_key, entity_id)
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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
    ON users(email);

    CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
    ON workspace_members(user_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invites_token_unique
    ON workspace_invites(token);

    CREATE INDEX IF NOT EXISTS idx_workspace_invites_email
    ON workspace_invites(email);

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
    ON auth_sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
    ON auth_sessions(expires_at);
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
  const budgetColumns = all("PRAGMA table_info(budgets)");
  const hasBudgetItemsJson = budgetColumns.some(
    (col) => col.name === "budget_items_json"
  );
  const entityColumns = all("PRAGMA table_info(entities)");
  const hasEntityWorkspaceId = entityColumns.some(
    (col) => col.name === "workspace_id"
  );
  db.run(`
    CREATE TABLE IF NOT EXISTS entity_account_preferences (
      entity_id TEXT PRIMARY KEY,
      default_expense_account_id INTEGER,
      default_income_account_id INTEGER
    )
  `);
  if (!hasEntityWorkspaceId) {
    db.run("ALTER TABLE entities ADD COLUMN workspace_id TEXT");
  }
  db.run("CREATE INDEX IF NOT EXISTS idx_entities_workspace_id ON entities(workspace_id)");
  if (!hasCurrency) {
    db.run("ALTER TABLE settings ADD COLUMN currency_code TEXT DEFAULT 'USD'");
  }
  if (!hasDefaultExpenseAccount) {
    db.run("ALTER TABLE settings ADD COLUMN default_expense_account_id INTEGER");
  }
  if (!hasDefaultIncomeAccount) {
    db.run("ALTER TABLE settings ADD COLUMN default_income_account_id INTEGER");
  }
  if (!hasBudgetItemsJson) {
    db.run("ALTER TABLE budgets ADD COLUMN budget_items_json TEXT DEFAULT '[]'");
  }
  db.run("UPDATE budgets SET budget_items_json = '[]' WHERE budget_items_json IS NULL");
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
        INSERT INTO entities (id, name, type, workspace_id, created_at, updated_at)
        VALUES (?, ?, ?, NULL, ?, ?)
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
        INSERT INTO entities (id, name, type, workspace_id, created_at, updated_at)
        VALUES (?, ?, 'family', NULL, ?, ?)
        `,
        [fallbackFamilyId, fallbackFamilyName, nowIso, nowIso]
      );
      familyEntityId = fallbackFamilyId;
    }
  }
  if (!familyEntityId) {
    familyEntityId = defaultEntityId;
  }

  const userCountRow = get("SELECT COUNT(*) AS count FROM users");
  const hasWorkspaceBackfillCandidates = get(
    "SELECT id FROM entities WHERE workspace_id IS NULL OR TRIM(workspace_id) = '' LIMIT 1"
  );
  let defaultLocalUserId = DEFAULT_LOCAL_USER_ID;
  let defaultWorkspaceId = DEFAULT_LOCAL_WORKSPACE_ID;

  if (hasWorkspaceBackfillCandidates) {
    const existingDefaultUserByEmail = get(
      `
      SELECT id
      FROM users
      WHERE lower(email) = lower(?)
      LIMIT 1
      `,
      [DEFAULT_LOCAL_USER_EMAIL]
    );

    if (existingDefaultUserByEmail?.id) {
      defaultLocalUserId = String(existingDefaultUserByEmail.id);
      db.run(
        `
        UPDATE users
        SET name = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
        `,
        [
          DEFAULT_LOCAL_USER_NAME,
          hashPassword(DEFAULT_LOCAL_USER_PASSWORD),
          nowIso,
          defaultLocalUserId,
        ]
      );
    } else if (Number(userCountRow?.count ?? 0) === 0) {
      db.run(
        `
        INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          DEFAULT_LOCAL_USER_ID,
          DEFAULT_LOCAL_USER_EMAIL,
          DEFAULT_LOCAL_USER_NAME,
          hashPassword(DEFAULT_LOCAL_USER_PASSWORD),
          nowIso,
          nowIso,
        ]
      );
      defaultLocalUserId = DEFAULT_LOCAL_USER_ID;
    } else {
      const existingUserWithDefaultId = get(
        `
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [DEFAULT_LOCAL_USER_ID]
      );
      if (existingUserWithDefaultId?.id) {
        db.run(
          `
          UPDATE users
          SET email = ?, name = ?, password_hash = ?, updated_at = ?
          WHERE id = ?
          `,
          [
            DEFAULT_LOCAL_USER_EMAIL,
            DEFAULT_LOCAL_USER_NAME,
            hashPassword(DEFAULT_LOCAL_USER_PASSWORD),
            nowIso,
            DEFAULT_LOCAL_USER_ID,
          ]
        );
        defaultLocalUserId = DEFAULT_LOCAL_USER_ID;
      } else {
        defaultLocalUserId = createUuid();
        db.run(
          `
          INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            defaultLocalUserId,
            DEFAULT_LOCAL_USER_EMAIL,
            DEFAULT_LOCAL_USER_NAME,
            hashPassword(DEFAULT_LOCAL_USER_PASSWORD),
            nowIso,
            nowIso,
          ]
        );
      }
    }

    const existingWorkspaceById = get(
      `
      SELECT id
      FROM workspaces
      WHERE id = ?
      LIMIT 1
      `,
      [DEFAULT_LOCAL_WORKSPACE_ID]
    );
    if (existingWorkspaceById?.id) {
      db.run(
        `
        UPDATE workspaces
        SET name = ?, type = 'household', created_by_user_id = ?, updated_at = ?
        WHERE id = ?
        `,
        [
          DEFAULT_LOCAL_WORKSPACE_NAME,
          defaultLocalUserId,
          nowIso,
          DEFAULT_LOCAL_WORKSPACE_ID,
        ]
      );
      defaultWorkspaceId = DEFAULT_LOCAL_WORKSPACE_ID;
    } else {
      const existingWorkspaceByName = get(
        `
        SELECT id
        FROM workspaces
        WHERE lower(name) = lower(?)
        ORDER BY created_at ASC, id ASC
        LIMIT 1
        `,
        [DEFAULT_LOCAL_WORKSPACE_NAME]
      );
      if (existingWorkspaceByName?.id) {
        defaultWorkspaceId = String(existingWorkspaceByName.id);
      } else {
        db.run(
          `
          INSERT INTO workspaces (
            id,
            name,
            type,
            created_by_user_id,
            created_at,
            updated_at
          )
          VALUES (?, ?, 'household', ?, ?, ?)
          `,
          [
            DEFAULT_LOCAL_WORKSPACE_ID,
            DEFAULT_LOCAL_WORKSPACE_NAME,
            defaultLocalUserId,
            nowIso,
            nowIso,
          ]
        );
        defaultWorkspaceId = DEFAULT_LOCAL_WORKSPACE_ID;
      }
    }

    const ownerMembership = get(
      `
      SELECT workspace_id, user_id
      FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
      LIMIT 1
      `,
      [defaultWorkspaceId, defaultLocalUserId]
    );
    if (!ownerMembership) {
      db.run(
        `
        INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
        VALUES (?, ?, 'owner', ?)
        `,
        [defaultWorkspaceId, defaultLocalUserId, nowIso]
      );
    }

    db.run(
      `
      UPDATE entities
      SET workspace_id = ?
      WHERE workspace_id IS NULL OR TRIM(workspace_id) = ''
      `,
      [defaultWorkspaceId]
    );
  }

  const seededWorkspace = get(
    `
    SELECT id
    FROM workspaces
    WHERE id = ?
    LIMIT 1
    `,
    [DEFAULT_LOCAL_WORKSPACE_ID]
  );
  if (seededWorkspace?.id) {
    let seededOwnerUserId = DEFAULT_LOCAL_USER_ID;
    const seededUserByEmail = get(
      `
      SELECT id
      FROM users
      WHERE lower(email) = lower(?)
      LIMIT 1
      `,
      [DEFAULT_LOCAL_USER_EMAIL]
    );
    if (seededUserByEmail?.id) {
      seededOwnerUserId = String(seededUserByEmail.id);
      db.run(
        `
        UPDATE users
        SET name = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
        `,
        [
          DEFAULT_LOCAL_USER_NAME,
          hashPassword(DEFAULT_LOCAL_USER_PASSWORD),
          nowIso,
          seededOwnerUserId,
        ]
      );
    } else {
      const seededUserById = get(
        `
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [DEFAULT_LOCAL_USER_ID]
      );
      if (seededUserById?.id) {
        db.run(
          `
          UPDATE users
          SET email = ?, name = ?, password_hash = ?, updated_at = ?
          WHERE id = ?
          `,
          [
            DEFAULT_LOCAL_USER_EMAIL,
            DEFAULT_LOCAL_USER_NAME,
            hashPassword(DEFAULT_LOCAL_USER_PASSWORD),
            nowIso,
            DEFAULT_LOCAL_USER_ID,
          ]
        );
      } else {
        db.run(
          `
          INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            DEFAULT_LOCAL_USER_ID,
            DEFAULT_LOCAL_USER_EMAIL,
            DEFAULT_LOCAL_USER_NAME,
            hashPassword(DEFAULT_LOCAL_USER_PASSWORD),
            nowIso,
            nowIso,
          ]
        );
      }
    }

    db.run(
      `
      UPDATE workspaces
      SET name = ?, type = 'household', created_by_user_id = ?, updated_at = ?
      WHERE id = ?
      `,
      [
        DEFAULT_LOCAL_WORKSPACE_NAME,
        seededOwnerUserId,
        nowIso,
        DEFAULT_LOCAL_WORKSPACE_ID,
      ]
    );
    const seededOwnerMembership = get(
      `
      SELECT workspace_id, user_id
      FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
      LIMIT 1
      `,
      [DEFAULT_LOCAL_WORKSPACE_ID, seededOwnerUserId]
    );
    if (!seededOwnerMembership) {
      db.run(
        `
        INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
        VALUES (?, ?, 'owner', ?)
        `,
        [DEFAULT_LOCAL_WORKSPACE_ID, seededOwnerUserId, nowIso]
      );
    }
  }

  const demoWorkspaceId = defaultWorkspaceId || DEFAULT_LOCAL_WORKSPACE_ID;
  const seededDemoWorkspace = get(
    `
    SELECT id
    FROM workspaces
    WHERE id = ?
    LIMIT 1
    `,
    [demoWorkspaceId]
  );
  if (seededDemoWorkspace?.id) {
    let seededDemoUserId = DEMO_LOCAL_USER_ID;
    const seededDemoUserByEmail = get(
      `
      SELECT id
      FROM users
      WHERE lower(email) = lower(?)
      LIMIT 1
      `,
      [DEMO_LOCAL_USER_EMAIL]
    );
    if (seededDemoUserByEmail?.id) {
      seededDemoUserId = String(seededDemoUserByEmail.id);
      db.run(
        `
        UPDATE users
        SET name = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
        `,
        [
          DEMO_LOCAL_USER_NAME,
          hashPassword(DEMO_LOCAL_USER_PASSWORD),
          nowIso,
          seededDemoUserId,
        ]
      );
    } else {
      const seededDemoUserById = get(
        `
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [DEMO_LOCAL_USER_ID]
      );
      if (seededDemoUserById?.id) {
        db.run(
          `
          UPDATE users
          SET email = ?, name = ?, password_hash = ?, updated_at = ?
          WHERE id = ?
          `,
          [
            DEMO_LOCAL_USER_EMAIL,
            DEMO_LOCAL_USER_NAME,
            hashPassword(DEMO_LOCAL_USER_PASSWORD),
            nowIso,
            DEMO_LOCAL_USER_ID,
          ]
        );
      } else {
        db.run(
          `
          INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            DEMO_LOCAL_USER_ID,
            DEMO_LOCAL_USER_EMAIL,
            DEMO_LOCAL_USER_NAME,
            hashPassword(DEMO_LOCAL_USER_PASSWORD),
            nowIso,
            nowIso,
          ]
        );
      }
    }

    const seededDemoMembership = get(
      `
      SELECT workspace_id, user_id
      FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
      LIMIT 1
      `,
      [demoWorkspaceId, seededDemoUserId]
    );
    if (!seededDemoMembership) {
      db.run(
        `
        INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
        VALUES (?, ?, 'owner', ?)
        `,
        [demoWorkspaceId, seededDemoUserId, nowIso]
      );
    }
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
  const hasMonthlyWorkspaceId = monthlyReportColumns.some(
    (col) => col.name === "workspace_id"
  );
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
      cols.length === 3 &&
      cols[0] === "workspace_id" &&
      cols[1] === "month_key" &&
      cols[2] === "entity_id"
    );
  });

  if (!hasMonthlyWorkspaceId || !hasMonthlyEntityId || !hasScopedMonthlyUniqueIndex) {
    const migrationNow = new Date().toISOString();
    const sourceEntityExpr = hasMonthlyEntityId
      ? "COALESCE(NULLIF(TRIM(entity_id), ''), '')"
      : "''";
    const sourceWorkspaceExpr = hasMonthlyWorkspaceId
      ? `
        COALESCE(
          NULLIF(TRIM(workspace_id), ''),
          (
            CASE
              WHEN ${sourceEntityExpr} <> ''
                THEN (SELECT workspace_id FROM entities WHERE id = ${sourceEntityExpr} LIMIT 1)
              ELSE NULL
            END
          ),
          ?
        )
      `
      : `
        COALESCE(
          (
            CASE
              WHEN ${sourceEntityExpr} <> ''
                THEN (SELECT workspace_id FROM entities WHERE id = ${sourceEntityExpr} LIMIT 1)
              ELSE NULL
            END
          ),
          ?
        )
      `;
    db.run("DROP TABLE IF EXISTS monthly_reports_next");
    db.run(`
      CREATE TABLE monthly_reports_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL,
        month_key TEXT NOT NULL,
        entity_id TEXT NOT NULL DEFAULT '',
        report_json TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (workspace_id, month_key, entity_id)
      )
    `);
    db.run(
      `
      INSERT OR REPLACE INTO monthly_reports_next (
        id,
        workspace_id,
        month_key,
        entity_id,
        report_json,
        generated_at,
        updated_at
      )
      SELECT
        id,
        ${sourceWorkspaceExpr},
        month_key,
        ${sourceEntityExpr},
        COALESCE(NULLIF(report_json, ''), '{}'),
        COALESCE(NULLIF(generated_at, ''), ?),
        COALESCE(NULLIF(updated_at, ''), COALESCE(NULLIF(generated_at, ''), ?))
      FROM monthly_reports
      WHERE month_key IS NOT NULL AND TRIM(month_key) <> ''
      `,
      [DEFAULT_LOCAL_WORKSPACE_ID, migrationNow, migrationNow]
    );
    db.run("DROP TABLE monthly_reports");
    db.run("ALTER TABLE monthly_reports_next RENAME TO monthly_reports");
  }

  db.run(
    `
    UPDATE monthly_reports
    SET workspace_id = COALESCE(
      NULLIF(TRIM(workspace_id), ''),
      (
        CASE
          WHEN entity_id IS NOT NULL AND TRIM(entity_id) <> ''
            THEN (SELECT workspace_id FROM entities WHERE id = monthly_reports.entity_id LIMIT 1)
          ELSE NULL
        END
      ),
      ?
    )
    WHERE workspace_id IS NULL OR TRIM(workspace_id) = ''
    `,
    [DEFAULT_LOCAL_WORKSPACE_ID]
  );
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
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_monthly_reports_workspace_id ON monthly_reports(workspace_id)"
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

  function ensureSeedUser({ id, email, name, password }) {
    let userId = id;
    const byEmail = get(
      `
      SELECT id
      FROM users
      WHERE lower(email) = lower(?)
      LIMIT 1
      `,
      [email]
    );
    if (byEmail?.id) {
      userId = String(byEmail.id);
      db.run(
        `
        UPDATE users
        SET name = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
        `,
        [name, hashPassword(password), nowIso, userId]
      );
      return userId;
    }

    const byId = get("SELECT id FROM users WHERE id = ? LIMIT 1", [id]);
    if (byId?.id) {
      db.run(
        `
        UPDATE users
        SET email = ?, name = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
        `,
        [email, name, hashPassword(password), nowIso, id]
      );
      return id;
    }

    db.run(
      `
      INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, email, name, hashPassword(password), nowIso, nowIso]
    );
    return id;
  }

  function ensureWorkspaceSeed({ id, name, createdByUserId }) {
    const byId = get("SELECT id FROM workspaces WHERE id = ? LIMIT 1", [id]);
    if (byId?.id) {
      db.run(
        `
        UPDATE workspaces
        SET name = ?, type = 'household', created_by_user_id = ?, updated_at = ?
        WHERE id = ?
        `,
        [name, createdByUserId, nowIso, id]
      );
      return id;
    }

    const byName = get(
      `
      SELECT id
      FROM workspaces
      WHERE lower(name) = lower(?)
      ORDER BY created_at ASC, id ASC
      LIMIT 1
      `,
      [name]
    );
    if (byName?.id) {
      const workspaceId = String(byName.id);
      db.run(
        `
        UPDATE workspaces
        SET name = ?, type = 'household', created_by_user_id = ?, updated_at = ?
        WHERE id = ?
        `,
        [name, createdByUserId, nowIso, workspaceId]
      );
      return workspaceId;
    }

    db.run(
      `
      INSERT INTO workspaces (
        id,
        name,
        type,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'household', ?, ?, ?)
      `,
      [id, name, createdByUserId, nowIso, nowIso]
    );
    return id;
  }

  function ensureWorkspaceOwner({ userId, workspaceId, exclusive = false }) {
    if (exclusive) {
      db.run(
        "DELETE FROM workspace_members WHERE user_id = ? AND workspace_id <> ?",
        [userId, workspaceId]
      );
    }
    const membership = get(
      `
      SELECT workspace_id, user_id
      FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
      LIMIT 1
      `,
      [workspaceId, userId]
    );
    if (membership) {
      db.run(
        `
        UPDATE workspace_members
        SET role = 'owner', joined_at = COALESCE(joined_at, ?)
        WHERE workspace_id = ? AND user_id = ?
        `,
        [nowIso, workspaceId, userId]
      );
      return;
    }
    db.run(
      `
      INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
      VALUES (?, ?, 'owner', ?)
      `,
      [workspaceId, userId, nowIso]
    );
  }

  function ensureEntitySeed({ id, name, type, workspaceId }) {
    const byId = get("SELECT id FROM entities WHERE id = ? LIMIT 1", [id]);
    if (byId?.id) {
      db.run(
        `
        UPDATE entities
        SET name = ?, type = ?, workspace_id = ?, updated_at = ?
        WHERE id = ?
        `,
        [name, type, workspaceId, nowIso, id]
      );
      return id;
    }

    const byName = get(
      `
      SELECT id
      FROM entities
      WHERE workspace_id = ? AND lower(name) = lower(?)
      LIMIT 1
      `,
      [workspaceId, name]
    );
    if (byName?.id) {
      const entityId = String(byName.id);
      db.run(
        `
        UPDATE entities
        SET name = ?, type = ?, workspace_id = ?, updated_at = ?
        WHERE id = ?
        `,
        [name, type, workspaceId, nowIso, entityId]
      );
      return entityId;
    }

    db.run(
      `
      INSERT INTO entities (id, name, type, workspace_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id, name, type, workspaceId, nowIso, nowIso]
    );
    return id;
  }

  function resolveInstitutionId(name) {
    if (!name) {
      return null;
    }
    const institution = get(
      "SELECT id FROM institutions WHERE lower(name) = lower(?) LIMIT 1",
      [name]
    );
    return institution?.id ? String(institution.id) : null;
  }

  function ensureAccountSeed({ entityId, name, type, currencyCode = "PHP", institutionName = null }) {
    const institutionId = resolveInstitutionId(institutionName);
    const existing = get(
      `
      SELECT id
      FROM accounts
      WHERE entity_id = ? AND lower(name) = lower(?)
      LIMIT 1
      `,
      [entityId, name]
    );
    if (existing?.id) {
      const accountId = Number(existing.id);
      db.run(
        `
        UPDATE accounts
        SET type = ?, institution_id = ?, currency_code = ?
        WHERE id = ?
        `,
        [type, institutionId, currencyCode, accountId]
      );
      return accountId;
    }

    const insert = run(
      `
      INSERT INTO accounts (name, type, entity_id, institution_id, currency_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [name, type, entityId, institutionId, currencyCode, nowIso]
    );
    return Number(insert.lastID);
  }

  function ensureEntityPreference(entityId, accountId) {
    db.run(
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
      [entityId, accountId, accountId]
    );
  }

  function ensureCategorySeed(table, { name, color, icon = null }) {
    const existing = get(`SELECT id FROM ${table} WHERE lower(name) = lower(?) LIMIT 1`, [name]);
    if (existing?.id) {
      db.run(`UPDATE ${table} SET color = ?, icon = ? WHERE id = ?`, [color, icon, existing.id]);
      return Number(existing.id);
    }
    const insert = run(
      `INSERT INTO ${table} (name, color, icon) VALUES (?, ?, ?)`,
      [name, color, icon]
    );
    return Number(insert.lastID);
  }

  function ensureInitialBalance({ accountId, amountCents, createdAt }) {
    const existing = get(
      `
      SELECT id
      FROM transactions
      WHERE type = 'initial_balance' AND to_account_id = ?
      LIMIT 1
      `,
      [accountId]
    );
    if (existing?.id) {
      db.run(
        `
        UPDATE transactions
        SET amount_cents = ?, category = 'Opening Balance', note = 'Opening balance', created_at = ?
        WHERE id = ?
        `,
        [amountCents, createdAt, existing.id]
      );
      return;
    }
    db.run(
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
      VALUES ('initial_balance', ?, NULL, ?, 'Opening Balance', 'Opening balance', ?)
      `,
      [amountCents, accountId, createdAt]
    );
  }

  function ensureIncomeSeed({ entityId, amount, source, receivedDate, categoryId, toAccountId }) {
    const existing = get(
      `
      SELECT id
      FROM income
      WHERE entity_id = ? AND received_date = ? AND source = ?
      LIMIT 1
      `,
      [entityId, receivedDate, source]
    );
    if (existing?.id) {
      db.run(
        `
        UPDATE income
        SET amount = ?, income_category_id = ?, to_account_id = ?, entity_id = ?
        WHERE id = ?
        `,
        [amount, categoryId, toAccountId, entityId, existing.id]
      );
      return;
    }
    db.run(
      `
      INSERT INTO income (amount, source, received_date, income_category_id, entity_id, to_account_id)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [amount, source, receivedDate, categoryId, entityId, toAccountId]
    );
  }

  function ensureExpenseSeed({
    entityId,
    amount,
    category,
    notes,
    spentAt,
    categoryId,
    expectation,
    fromAccountId,
  }) {
    const existing = get(
      `
      SELECT id
      FROM expenses
      WHERE entity_id = ? AND spent_at = ? AND category = ? AND COALESCE(notes, '') = COALESCE(?, '')
      LIMIT 1
      `,
      [entityId, spentAt, category, notes]
    );
    if (existing?.id) {
      db.run(
        `
        UPDATE expenses
        SET amount = ?, expense_category_id = ?, expense_expectation = ?, from_account_id = ?, created_at = ?
        WHERE id = ?
        `,
        [amount, categoryId, expectation, fromAccountId, monthTimestamp(spentAt.slice(0, 7), 1), existing.id]
      );
      return;
    }
    db.run(
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
        amount,
        category,
        notes,
        spentAt,
        monthTimestamp(spentAt.slice(0, 7), 1),
        categoryId,
        expectation,
        entityId,
        fromAccountId,
      ]
    );
  }

  function ensureDebtSeed({
    entityId,
    amount,
    name,
    loanOrigin,
    notes,
    spentAt,
    statementMonth,
    debtCategoryId,
  }) {
    const existing = get(
      `
      SELECT id
      FROM debts
      WHERE entity_id = ? AND spent_at = ? AND name = ?
      LIMIT 1
      `,
      [entityId, spentAt, name]
    );
    if (existing?.id) {
      db.run(
        `
        UPDATE debts
        SET amount = ?, loan_origin = ?, notes = ?, statement_month = ?, created_at = ?, debt_category_id = ?
        WHERE id = ?
        `,
        [amount, loanOrigin, notes, statementMonth, monthTimestamp(statementMonth, 1), debtCategoryId, existing.id]
      );
      return;
    }
    db.run(
      `
      INSERT INTO debts (
        amount,
        name,
        loan_origin,
        notes,
        spent_at,
        statement_month,
        created_at,
        debt_category_id,
        entity_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [amount, name, loanOrigin, notes, spentAt, statementMonth, monthTimestamp(statementMonth, 1), debtCategoryId, entityId]
    );
  }

  function ensureTransferSeed({
    id,
    fromAccountId,
    toAccountId,
    amountCents,
    transferDate,
    notes,
  }) {
    const existing = get("SELECT id FROM transfers WHERE id = ? LIMIT 1", [id]);
    if (existing?.id) {
      db.run(
        `
        UPDATE transfers
        SET
          from_account_id = ?,
          to_account_id = ?,
          amount_cents = ?,
          transfer_fee_cents = 0,
          fee_expense_id = NULL,
          mirror_as_income_expense = 0,
          expense_category_id = NULL,
          income_category_id = NULL,
          bookkeeping_expense_id = NULL,
          bookkeeping_income_id = NULL,
          transfer_date = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [fromAccountId, toAccountId, amountCents, transferDate, notes, nowIso, id]
      );
      return;
    }
    db.run(
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
      [id, fromAccountId, toAccountId, amountCents, transferDate, notes, nowIso, nowIso]
    );
  }

  function ensureRecurringSeed({
    type,
    entityId,
    amount,
    category,
    expenseCategoryId = null,
    incomeCategoryId = null,
    fromAccountId = null,
    toAccountId = null,
    description,
    frequency,
    nextDueDate,
  }) {
    const existing = get(
      `
      SELECT id
      FROM recurring_items
      WHERE entity_id = ? AND type = ? AND description = ?
      LIMIT 1
      `,
      [entityId, type, description]
    );
    if (existing?.id) {
      db.run(
        `
        UPDATE recurring_items
        SET
          amount = ?,
          category = ?,
          expense_category_id = ?,
          income_category_id = ?,
          from_account_id = ?,
          to_account_id = ?,
          frequency = ?,
          next_due_date = ?
        WHERE id = ?
        `,
        [amount, category, expenseCategoryId, incomeCategoryId, fromAccountId, toAccountId, frequency, nextDueDate, existing.id]
      );
      return;
    }
    db.run(
      `
      INSERT INTO recurring_items (
        type,
        entity_id,
        amount,
        category,
        expense_category_id,
        income_category_id,
        from_account_id,
        to_account_id,
        mirror_as_income_expense,
        transfer_fee_amount,
        description,
        frequency,
        next_due_date,
        last_confirmed_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, NULL)
      `,
      [type, entityId, amount, category, expenseCategoryId, incomeCategoryId, fromAccountId, toAccountId, description, frequency, nextDueDate]
    );
  }

  function ensureBudgetSeed({
    entityId,
    name,
    category,
    targetAmount,
    paymentPlan,
    paymentFrequency,
    paymentAmount,
    paymentCount = null,
    startDate,
    targetDate = null,
    notes = null,
  }) {
    const existing = get(
      `
      SELECT id
      FROM budgets
      WHERE entity_id = ? AND name = ?
      LIMIT 1
      `,
      [entityId, name]
    );
    if (existing?.id) {
      db.run(
        `
        UPDATE budgets
        SET
          category = ?,
          target_amount = ?,
          payment_plan = ?,
          payment_frequency = ?,
          payment_amount = ?,
          payment_count = ?,
          start_date = ?,
          target_date = ?,
          notes = ?,
          is_active = 1,
          updated_at = ?
        WHERE id = ?
        `,
        [category, targetAmount, paymentPlan, paymentFrequency, paymentAmount, paymentCount, startDate, targetDate, notes, nowIso, existing.id]
      );
      return;
    }
    db.run(
      `
      INSERT INTO budgets (
        entity_id,
        name,
        category,
        target_amount,
        payment_plan,
        payment_frequency,
        payment_amount,
        payment_count,
        start_date,
        target_date,
        notes,
        is_active,
        created_at,
        updated_at,
        budget_items_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, '[]')
      `,
      [entityId, name, category, targetAmount, paymentPlan, paymentFrequency, paymentAmount, paymentCount, startDate, targetDate, notes, nowIso, nowIso]
    );
  }

  function ensureLifeInsuranceSeed({
    entityId,
    provider,
    policyName,
    insuredPerson,
    coverageAmount,
    cashSurrenderValue,
    premiumAmount,
    paymentFrequency,
    renewalDate,
    notes = null,
  }) {
    const existing = get(
      `
      SELECT id
      FROM life_insurances
      WHERE entity_id = ? AND provider = ? AND policy_name = ?
      LIMIT 1
      `,
      [entityId, provider, policyName]
    );
    if (existing?.id) {
      db.run(
        `
        UPDATE life_insurances
        SET
          insured_person = ?,
          coverage_amount = ?,
          cash_surrender_value = ?,
          premium_amount = ?,
          payment_frequency = ?,
          renewal_date = ?,
          notes = ?,
          is_active = 1,
          updated_at = ?
        WHERE id = ?
        `,
        [insuredPerson, coverageAmount, cashSurrenderValue, premiumAmount, paymentFrequency, renewalDate, notes, nowIso, existing.id]
      );
      return;
    }
    db.run(
      `
      INSERT INTO life_insurances (
        entity_id,
        provider,
        policy_name,
        insured_person,
        coverage_amount,
        cash_surrender_value,
        premium_amount,
        payment_frequency,
        renewal_date,
        notes,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `,
      [entityId, provider, policyName, insuredPerson, coverageAmount, cashSurrenderValue, premiumAmount, paymentFrequency, renewalDate, notes, nowIso, nowIso]
    );
  }

  function ensureProjectionSeed({
    id,
    workspaceId,
    entityId,
    name,
    initialAmount,
    annualInterestRate,
    durationMonths,
    monthlyContribution,
    notes = null,
  }) {
    const existing = get("SELECT id FROM projection_scenarios WHERE id = ? LIMIT 1", [id]);
    if (existing?.id) {
      db.run(
        `
        UPDATE projection_scenarios
        SET
          workspace_id = ?,
          entity_id = ?,
          name = ?,
          type = 'SAVINGS',
          currency = 'PHP',
          initial_amount = ?,
          annual_interest_rate = ?,
          duration_months = ?,
          monthly_contribution = ?,
          compounding_frequency = 'monthly',
          cashflow_assumptions_json = '{}',
          notes = ?,
          updated_at = ?
        WHERE id = ?
        `,
        [workspaceId, entityId, name, initialAmount, annualInterestRate, durationMonths, monthlyContribution, notes, nowIso, id]
      );
      return;
    }
    db.run(
      `
      INSERT INTO projection_scenarios (
        id,
        workspace_id,
        entity_id,
        name,
        type,
        currency,
        initial_amount,
        annual_interest_rate,
        duration_months,
        monthly_contribution,
        compounding_frequency,
        cashflow_assumptions_json,
        notes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 'SAVINGS', 'PHP', ?, ?, ?, ?, 'monthly', '{}', ?, ?, ?)
      `,
      [id, workspaceId, entityId, name, initialAmount, annualInterestRate, durationMonths, monthlyContribution, notes, nowIso, nowIso]
    );
  }

  const showcaseDemoUserId = ensureSeedUser({
    id: DEMO_LOCAL_USER_ID,
    email: DEMO_LOCAL_USER_EMAIL,
    name: DEMO_LOCAL_USER_NAME,
    password: DEMO_LOCAL_USER_PASSWORD,
  });
  const showcaseDemoWorkspaceId = ensureWorkspaceSeed({
    id: DEMO_SHOWCASE_WORKSPACE_ID,
    name: DEMO_SHOWCASE_WORKSPACE_NAME,
    createdByUserId: showcaseDemoUserId,
  });
  ensureWorkspaceOwner({
    userId: showcaseDemoUserId,
    workspaceId: showcaseDemoWorkspaceId,
    exclusive: true,
  });

  const demoBlankUserId = ensureSeedUser({
    id: DEMO_BLANK_USER_ID,
    email: DEMO_BLANK_USER_EMAIL,
    name: DEMO_BLANK_USER_NAME,
    password: DEMO_BLANK_USER_PASSWORD,
  });
  const demoBlankWorkspaceId = ensureWorkspaceSeed({
    id: DEMO_BLANK_WORKSPACE_ID,
    name: DEMO_BLANK_WORKSPACE_NAME,
    createdByUserId: demoBlankUserId,
  });
  ensureWorkspaceOwner({
    userId: demoBlankUserId,
    workspaceId: demoBlankWorkspaceId,
    exclusive: true,
  });

  const showcaseEntities = DEMO_SHOWCASE_ENTITY_SEEDS.map((seed) => ({
    ...seed,
    resolvedId: ensureEntitySeed({
      id: seed.id,
      name: seed.name,
      type: seed.type,
      workspaceId: showcaseDemoWorkspaceId,
    }),
  }));
  const showcasePersonalEntityId = showcaseEntities.find((item) => item.type === "personal")?.resolvedId;
  const showcaseFamilyEntityId = showcaseEntities.find((item) => item.type === "family")?.resolvedId;
  const showcaseBusinessEntityId = showcaseEntities.find((item) => item.type === "business")?.resolvedId;

  const expenseCategoryIds = {
    housing: ensureCategorySeed("categories", {
      name: "Housing",
      color: CATEGORY_COLOR_SWATCHES[0],
      icon: "ri-home-5-line",
    }),
    groceries: ensureCategorySeed("categories", {
      name: "Groceries",
      color: CATEGORY_COLOR_SWATCHES[1],
      icon: "ri-shopping-basket-line",
    }),
    mobility: ensureCategorySeed("categories", {
      name: "Mobility",
      color: CATEGORY_COLOR_SWATCHES[2],
      icon: "ri-taxi-line",
    }),
    utilities: ensureCategorySeed("categories", {
      name: "Home Utilities",
      color: CATEGORY_COLOR_SWATCHES[3],
      icon: "ri-lightbulb-flash-line",
    }),
    education: ensureCategorySeed("categories", {
      name: "Education",
      color: CATEGORY_COLOR_SWATCHES[4],
      icon: "ri-graduation-cap-line",
    }),
    payroll: ensureCategorySeed("categories", {
      name: "Payroll",
      color: CATEGORY_COLOR_SWATCHES[5],
      icon: "ri-briefcase-4-line",
    }),
    software: ensureCategorySeed("categories", {
      name: "Software",
      color: CATEGORY_COLOR_SWATCHES[6],
      icon: "ri-computer-line",
    }),
    marketing: ensureCategorySeed("categories", {
      name: "Marketing",
      color: CATEGORY_COLOR_SWATCHES[7],
      icon: "ri-megaphone-line",
    }),
    operations: ensureCategorySeed("categories", {
      name: "Operations",
      color: CATEGORY_COLOR_SWATCHES[8],
      icon: "ri-settings-3-line",
    }),
    carLoan: ensureCategorySeed("categories", {
      name: "Car Loan",
      color: CATEGORY_COLOR_SWATCHES[9],
      icon: "ri-car-line",
    }),
    insurance: ensureCategorySeed("categories", {
      name: "Insurance",
      color: CATEGORY_COLOR_SWATCHES[10],
      icon: "ri-shield-check-line",
    }),
  };

  const incomeCategoryIds = {
    salary: ensureCategorySeed("income_categories", {
      name: "Consulting Retainer",
      color: CATEGORY_COLOR_SWATCHES[11],
      icon: "ri-money-dollar-circle-line",
    }),
    rental: ensureCategorySeed("income_categories", {
      name: "Rental Income",
      color: CATEGORY_COLOR_SWATCHES[12],
      icon: "ri-building-line",
    }),
    business: ensureCategorySeed("income_categories", {
      name: "Business Revenue",
      color: CATEGORY_COLOR_SWATCHES[13],
      icon: "ri-line-chart-line",
    }),
  };

  const showcaseAccounts = {
    personalBank: ensureAccountSeed({
      entityId: showcasePersonalEntityId,
      name: "BPI Everyday",
      type: "bank",
      institutionName: "Bank of the Philippine Islands",
    }),
    familyBank: ensureAccountSeed({
      entityId: showcaseFamilyEntityId,
      name: "PNB Household Reserve",
      type: "bank",
      institutionName: "Philippine National Bank",
    }),
    businessBank: ensureAccountSeed({
      entityId: showcaseBusinessEntityId,
      name: "BDO Operating",
      type: "bank",
      institutionName: "Banco De Oro",
    }),
  };

  ensureEntityPreference(showcasePersonalEntityId, showcaseAccounts.personalBank);
  ensureEntityPreference(showcaseFamilyEntityId, showcaseAccounts.familyBank);
  ensureEntityPreference(showcaseBusinessEntityId, showcaseAccounts.businessBank);

  ensureInitialBalance({
    accountId: showcaseAccounts.personalBank,
    amountCents: 12000000,
    createdAt: "2025-10-31T09:00:00.000Z",
  });
  ensureInitialBalance({
    accountId: showcaseAccounts.familyBank,
    amountCents: 8000000,
    createdAt: "2025-10-31T09:15:00.000Z",
  });
  ensureInitialBalance({
    accountId: showcaseAccounts.businessBank,
    amountCents: 25000000,
    createdAt: "2025-10-31T09:30:00.000Z",
  });

  DEMO_SHOWCASE_MONTHLY_SEEDS.forEach((seed) => {
    ensureIncomeSeed({
      entityId: showcasePersonalEntityId,
      amount: seed.personalIncome,
      source: "Steward Product Consulting",
      receivedDate: monthDate(seed.month, 28),
      categoryId: incomeCategoryIds.salary,
      toAccountId: showcaseAccounts.personalBank,
    });
    ensureIncomeSeed({
      entityId: showcaseFamilyEntityId,
      amount: seed.familyIncome,
      source: "Rental and dividend income",
      receivedDate: monthDate(seed.month, 5),
      categoryId: incomeCategoryIds.rental,
      toAccountId: showcaseAccounts.familyBank,
    });
    ensureIncomeSeed({
      entityId: showcaseBusinessEntityId,
      amount: seed.businessIncome,
      source: "Client retainers and product sales",
      receivedDate: monthDate(seed.month, 27),
      categoryId: incomeCategoryIds.business,
      toAccountId: showcaseAccounts.businessBank,
    });

    ensureExpenseSeed({
      entityId: showcasePersonalEntityId,
      amount: seed.personalExpenses.housing,
      category: "Housing",
      notes: "Condo rent and association dues",
      spentAt: monthDate(seed.month, 2),
      categoryId: expenseCategoryIds.housing,
      expectation: "expected",
      fromAccountId: showcaseAccounts.personalBank,
    });
    ensureExpenseSeed({
      entityId: showcasePersonalEntityId,
      amount: seed.personalExpenses.groceries,
      category: "Groceries",
      notes: "Groceries, coffee, and home restock",
      spentAt: monthDate(seed.month, 10),
      categoryId: expenseCategoryIds.groceries,
      expectation: "expected",
      fromAccountId: showcaseAccounts.personalBank,
    });
    ensureExpenseSeed({
      entityId: showcasePersonalEntityId,
      amount: seed.personalExpenses.mobility,
      category: "Mobility",
      notes: "Fuel, rides, and wellness memberships",
      spentAt: monthDate(seed.month, 18),
      categoryId: expenseCategoryIds.mobility,
      expectation: "expected",
      fromAccountId: showcaseAccounts.personalBank,
    });

    ensureExpenseSeed({
      entityId: showcaseFamilyEntityId,
      amount: seed.familyExpenses.groceries,
      category: "Groceries",
      notes: "Weekly groceries and home supplies",
      spentAt: monthDate(seed.month, 8),
      categoryId: expenseCategoryIds.groceries,
      expectation: "expected",
      fromAccountId: showcaseAccounts.familyBank,
    });
    ensureExpenseSeed({
      entityId: showcaseFamilyEntityId,
      amount: seed.familyExpenses.utilities,
      category: "Utilities",
      notes: "Electricity, water, and internet",
      spentAt: monthDate(seed.month, 14),
      categoryId: expenseCategoryIds.utilities,
      expectation: "expected",
      fromAccountId: showcaseAccounts.familyBank,
    });
    ensureExpenseSeed({
      entityId: showcaseFamilyEntityId,
      amount: seed.familyExpenses.education,
      category: "Education",
      notes: "School tuition, books, and workshops",
      spentAt: monthDate(seed.month, 22),
      categoryId: expenseCategoryIds.education,
      expectation: "expected",
      fromAccountId: showcaseAccounts.familyBank,
    });

    ensureExpenseSeed({
      entityId: showcaseBusinessEntityId,
      amount: seed.businessExpenses.payroll,
      category: "Payroll",
      notes: "Core team payroll",
      spentAt: monthDate(seed.month, 5),
      categoryId: expenseCategoryIds.payroll,
      expectation: "expected",
      fromAccountId: showcaseAccounts.businessBank,
    });
    ensureExpenseSeed({
      entityId: showcaseBusinessEntityId,
      amount: seed.businessExpenses.software,
      category: "Software",
      notes: "Design, finance, and collaboration tools",
      spentAt: monthDate(seed.month, 9),
      categoryId: expenseCategoryIds.software,
      expectation: "expected",
      fromAccountId: showcaseAccounts.businessBank,
    });
    ensureExpenseSeed({
      entityId: showcaseBusinessEntityId,
      amount: seed.businessExpenses.marketing,
      category: "Marketing",
      notes: "Paid campaigns and content production",
      spentAt: monthDate(seed.month, 16),
      categoryId: expenseCategoryIds.marketing,
      expectation: "expected",
      fromAccountId: showcaseAccounts.businessBank,
    });
    ensureExpenseSeed({
      entityId: showcaseBusinessEntityId,
      amount: seed.businessExpenses.operations,
      category: "Operations",
      notes: "Operations, contractors, and fulfillment",
      spentAt: monthDate(seed.month, 23),
      categoryId: expenseCategoryIds.operations,
      expectation: "expected",
      fromAccountId: showcaseAccounts.businessBank,
    });

    ensureDebtSeed({
      entityId: showcasePersonalEntityId,
      amount: seed.personalDebt,
      name: "BPI Auto Loan",
      loanOrigin: "BPI Auto Loan",
      notes: "Monthly amortization for family car",
      spentAt: monthDate(seed.month, 15),
      statementMonth: seed.month,
      debtCategoryId: expenseCategoryIds.carLoan,
    });
  });

  ensureTransferSeed({
    id: "55555555-5555-4555-8555-555555555501",
    fromAccountId: showcaseAccounts.personalBank,
    toAccountId: showcaseAccounts.businessBank,
    amountCents: 3000000,
    transferDate: "2025-11-12",
    notes: "Owner capital injection",
  });
  ensureTransferSeed({
    id: "55555555-5555-4555-8555-555555555502",
    fromAccountId: showcaseAccounts.personalBank,
    toAccountId: showcaseAccounts.familyBank,
    amountCents: 1000000,
    transferDate: "2025-12-10",
    notes: "Holiday family fund",
  });
  ensureTransferSeed({
    id: "55555555-5555-4555-8555-555555555503",
    fromAccountId: showcaseAccounts.familyBank,
    toAccountId: showcaseAccounts.businessBank,
    amountCents: 500000,
    transferDate: "2026-02-08",
    notes: "Family angel top-up",
  });
  ensureTransferSeed({
    id: "55555555-5555-4555-8555-555555555504",
    fromAccountId: showcaseAccounts.businessBank,
    toAccountId: showcaseAccounts.familyBank,
    amountCents: 2000000,
    transferDate: "2026-04-22",
    notes: "Quarterly family distribution",
  });

  ensureExpenseSeed({
    entityId: showcasePersonalEntityId,
    amount: 1800,
    category: "Insurance",
    notes: "Monthly critical illness premium",
    spentAt: "2026-04-06",
    categoryId: expenseCategoryIds.insurance,
    expectation: "expected",
    fromAccountId: showcaseAccounts.personalBank,
  });

  ensureRecurringSeed({
    type: "income",
    entityId: showcasePersonalEntityId,
    amount: 96000,
    category: "Salary",
    incomeCategoryId: incomeCategoryIds.salary,
    toAccountId: showcaseAccounts.personalBank,
    description: "Monthly consulting retainer",
    frequency: "monthly",
    nextDueDate: "2026-05-28",
  });
  ensureRecurringSeed({
    type: "expense",
    entityId: showcaseFamilyEntityId,
    amount: 7500,
    category: "Utilities",
    expenseCategoryId: expenseCategoryIds.utilities,
    fromAccountId: showcaseAccounts.familyBank,
    description: "Utilities autopay",
    frequency: "monthly",
    nextDueDate: "2026-05-14",
  });
  ensureRecurringSeed({
    type: "expense",
    entityId: showcaseBusinessEntityId,
    amount: 18000,
    category: "Software",
    expenseCategoryId: expenseCategoryIds.software,
    fromAccountId: showcaseAccounts.businessBank,
    description: "Software stack renewal",
    frequency: "monthly",
    nextDueDate: "2026-05-09",
  });

  ensureBudgetSeed({
    entityId: showcaseFamilyEntityId,
    name: "Japan Trip Fund",
    category: "Travel",
    targetAmount: 180000,
    paymentPlan: "installment",
    paymentFrequency: "monthly",
    paymentAmount: 15000,
    paymentCount: 12,
    startDate: "2026-01-01",
    targetDate: "2026-12-01",
    notes: "Family trip target for year-end break",
  });
  ensureBudgetSeed({
    entityId: showcaseBusinessEntityId,
    name: "Studio Camera Upgrade",
    category: "Operations",
    targetAmount: 240000,
    paymentPlan: "installment",
    paymentFrequency: "monthly",
    paymentAmount: 20000,
    paymentCount: 12,
    startDate: "2026-03-01",
    targetDate: "2027-02-01",
    notes: "Capex reserve for the next production rig",
  });

  ensureLifeInsuranceSeed({
    entityId: showcasePersonalEntityId,
    provider: "Sun Life",
    policyName: "Life Secure Plus",
    insuredPerson: "Marco Alvarez",
    coverageAmount: 3000000,
    cashSurrenderValue: 185000,
    premiumAmount: 1800,
    paymentFrequency: "monthly",
    renewalDate: "2026-11-15",
    notes: "Term coverage paired with emergency reserve planning",
  });

  ensureProjectionSeed({
    id: "66666666-6666-4666-8666-666666666601",
    workspaceId: showcaseDemoWorkspaceId,
    entityId: showcaseFamilyEntityId,
    name: "Family Emergency Fund 18M",
    initialAmount: 134000,
    annualInterestRate: 4.25,
    durationMonths: 18,
    monthlyContribution: 12000,
    notes: "Base case forecast using current family surplus.",
  });

  if (hasExpenseCreatedAt) {
    db.run(
      "UPDATE expenses SET created_at = spent_at || 'T00:00:00' WHERE created_at IS NULL OR created_at = ''"
    );
  }

  persist();
}

module.exports = { run, get, all, exec, init };
