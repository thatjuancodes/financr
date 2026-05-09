const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { init, run, get, all } = require("./db");
const {
  normalizeCategoryColor,
  normalizeCategoryIcon,
  pickCategoryColor,
} = require("./categoryColors");
const { generateMonthlyReport } = require("./generateMonthlyReport");
const {
  calculateProjection,
  buildProjectionResultSummary,
  buildProjectionScenarioResult,
  normalizeProjectionCashflowAssumptions,
} = require("./projections");
const {
  registerLedgerRoutes,
  resolveTransferPayload,
  getTransferById,
  serializeTransferRow,
  getAccountsTotalBalanceWithLegacy,
} = require("./ledger");
const {
  registerProjectionScenarioRoutes,
} = require("./projectionScenarioRoutes");
const {
  registerReferenceDataRoutes,
} = require("./referenceDataRoutes");
const {
  registerReportRoutes,
} = require("./reportRoutes");
const {
  registerIncomeRoutes,
} = require("./incomeRoutes");
const {
  registerInstitutionRoutes,
} = require("./institutionRoutes");
const {
  registerInsuranceRoutes,
} = require("./insuranceRoutes");
const {
  registerSettingsBalanceRoutes,
} = require("./settingsBalanceRoutes");
const {
  registerDebtRoutes,
} = require("./debtRoutes");
const {
  registerBudgetRoutes,
} = require("./budgetRoutes");
const {
  resolveEntityDefaultAccountId,
} = require("./accountPreferences");
const { createTransferFeeExpense } = require("./transferFees");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
registerLedgerRoutes(app, { run, get, all });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY = /^\d{4}-\d{2}$/;
const RECURRING_SELECT = `
  SELECT
    r.id,
    r.type,
    r.entity_id,
    ent.name AS entity_name,
    ent.type AS entity_type,
    r.amount,
    r.category,
    r.expense_category_id,
    ec.name AS expense_category_name,
    r.income_category_id,
    ic.name AS income_category_name,
    r.from_account_id,
    from_account.name AS from_account_name,
    from_account.entity_id AS from_account_entity_id,
    from_entity.name AS from_account_entity_name,
    from_account.currency_code AS from_account_currency_code,
    r.to_account_id,
    to_account.name AS to_account_name,
    to_account.entity_id AS to_account_entity_id,
    to_entity.name AS to_account_entity_name,
    to_account.currency_code AS to_account_currency_code,
    r.mirror_as_income_expense,
    r.transfer_fee_amount,
    r.description,
    r.frequency,
    r.semi_monthly_day_1,
    r.semi_monthly_day_2,
    r.next_due_date,
    r.last_confirmed_date
  FROM recurring_items r
  LEFT JOIN entities ent ON r.entity_id = ent.id
  LEFT JOIN categories ec ON r.expense_category_id = ec.id
  LEFT JOIN income_categories ic ON r.income_category_id = ic.id
  LEFT JOIN accounts from_account ON from_account.id = r.from_account_id
  LEFT JOIN entities from_entity ON from_entity.id = from_account.entity_id
  LEFT JOIN accounts to_account ON to_account.id = r.to_account_id
  LEFT JOIN entities to_entity ON to_entity.id = to_account.entity_id
`;
const RECURRING_TYPES = new Set(["expense", "income", "transfer"]);
const RECURRING_FREQUENCIES = new Set([
  "weekly",
  "monthly",
  "yearly",
  "semi_monthly",
]);
const PROJECTION_TYPES = new Set(["SAVINGS"]);
const PROJECTION_COMPOUNDING_FREQUENCIES = new Set(["monthly"]);
const DEFAULT_PROJECTION_WORKSPACE_ID = "default";
const EXPENSE_EXPECTATIONS = new Set(["expected", "unexpected"]);
const UNCATEGORIZED_SUGGESTION_CATEGORY_ID = 0;

function isValidDate(value) {
  return typeof value === "string" && ISO_DATE.test(value);
}

function normalizeOptionalAccountId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizeBooleanFlag(value, defaultValue = false) {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeRequiredText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeOptionalText(value) {
  const normalized = normalizeRequiredText(value);
  return normalized || null;
}

function normalizeWorkspaceId(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeCurrencyCode(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

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

function normalizeProjectionType(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const normalized = String(value ?? "SAVINGS")
    .trim()
    .toUpperCase();
  return PROJECTION_TYPES.has(normalized) ? normalized : null;
}

function normalizeProjectionCompoundingFrequency(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const normalized = String(value ?? "monthly")
    .trim()
    .toLowerCase();
  return PROJECTION_COMPOUNDING_FREQUENCIES.has(normalized) ? normalized : null;
}

function normalizeProjectionAmount(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function normalizeProjectionRate(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
}

function normalizeProjectionDuration(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return null;
  }
  return numeric;
}

function normalizeProjectionCashflowAssumptionsInput(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  try {
    return normalizeProjectionCashflowAssumptions(value);
  } catch (error) {
    return null;
  }
}

function mapProjectionScenarioRow(row) {
  if (!row) {
    return null;
  }
  let parsedCashflowAssumptions = {};
  if (
    row.cashflow_assumptions_json !== null &&
    row.cashflow_assumptions_json !== undefined &&
    String(row.cashflow_assumptions_json).trim()
  ) {
    try {
      parsedCashflowAssumptions = JSON.parse(String(row.cashflow_assumptions_json));
    } catch (error) {
      parsedCashflowAssumptions = {};
    }
  }
  let normalizedCashflowAssumptions;
  try {
    normalizedCashflowAssumptions = normalizeProjectionCashflowAssumptions(
      parsedCashflowAssumptions
    );
  } catch (error) {
    normalizedCashflowAssumptions = normalizeProjectionCashflowAssumptions({});
  }
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id || DEFAULT_PROJECTION_WORKSPACE_ID),
    entity_id: String(row.entity_id || ""),
    entity_name: row.entity_name === null || row.entity_name === undefined
      ? null
      : String(row.entity_name),
    entity_type: row.entity_type === null || row.entity_type === undefined
      ? null
      : String(row.entity_type),
    name: String(row.name || ""),
    type: String(row.type || "SAVINGS"),
    currency: String(row.currency || "PHP"),
    initial_amount: Number(row.initial_amount ?? 0),
    annual_interest_rate: Number(row.annual_interest_rate ?? 0),
    duration_months: Number(row.duration_months ?? 0),
    monthly_contribution: Number(row.monthly_contribution ?? 0),
    compounding_frequency: String(row.compounding_frequency || "monthly"),
    cashflow_assumptions: normalizedCashflowAssumptions,
    notes: row.notes === null || row.notes === undefined ? null : String(row.notes),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

async function validateProjectionCashflowAssumptionsReferences(assumptions) {
  const normalized = normalizeProjectionCashflowAssumptions(assumptions);

  for (const item of normalized.added_recurring_incomes) {
    if (item.income_category_id === null) {
      continue;
    }
    const category = await get(
      "SELECT id FROM income_categories WHERE id = ? LIMIT 1",
      [item.income_category_id]
    );
    if (!category) {
      return false;
    }
  }

  for (const item of normalized.added_recurring_expenses) {
    if (item.expense_category_id === null || item.expense_category_id === 0) {
      continue;
    }
    const category = await get("SELECT id FROM categories WHERE id = ? LIMIT 1", [
      item.expense_category_id,
    ]);
    if (!category) {
      return false;
    }
  }

  for (const item of normalized.expense_category_percent_changes) {
    if (item.expense_category_id === 0) {
      continue;
    }
    const category = await get("SELECT id FROM categories WHERE id = ? LIMIT 1", [
      item.expense_category_id,
    ]);
    if (!category) {
      return false;
    }
  }

  return true;
}

async function getProjectionCashflowHistory(entityId, cache = null) {
  const cacheKey = String(entityId || "");
  if (cache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const [monthlyIncomeHistory, monthlyExpenseHistory, expenseCategoryMonthlyHistory] =
    await Promise.all([
      all(
        `
        SELECT
          substr(received_date, 1, 7) AS month_key,
          COALESCE(SUM(amount), 0) AS total
        FROM income
        WHERE entity_id = ?
        GROUP BY substr(received_date, 1, 7)
        ORDER BY month_key DESC
        `,
        [entityId]
      ),
      all(
        `
        SELECT
          substr(spent_at, 1, 7) AS month_key,
          COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE entity_id = ?
        GROUP BY substr(spent_at, 1, 7)
        ORDER BY month_key DESC
        `,
        [entityId]
      ),
      all(
        `
        SELECT
          substr(e.spent_at, 1, 7) AS month_key,
          COALESCE(e.expense_category_id, 0) AS expense_category_id,
          COALESCE(c.name, 'Uncategorized') AS expense_category_name,
          COALESCE(SUM(e.amount), 0) AS total
        FROM expenses e
        LEFT JOIN categories c ON c.id = e.expense_category_id
        WHERE e.entity_id = ?
        GROUP BY
          substr(e.spent_at, 1, 7),
          COALESCE(e.expense_category_id, 0),
          COALESCE(c.name, 'Uncategorized')
        ORDER BY month_key DESC, expense_category_name ASC
        `,
        [entityId]
      ),
    ]);

  const payload = {
    monthly_income_history: monthlyIncomeHistory.map((item) => ({
      month_key: String(item.month_key || ""),
      total: Number(item.total ?? 0),
    })),
    monthly_expense_history: monthlyExpenseHistory.map((item) => ({
      month_key: String(item.month_key || ""),
      total: Number(item.total ?? 0),
    })),
    expense_category_monthly_history: expenseCategoryMonthlyHistory.map((item) => ({
      month_key: String(item.month_key || ""),
      expense_category_id: Number(item.expense_category_id ?? 0),
      expense_category_name: String(item.expense_category_name || "Uncategorized"),
      total: Number(item.total ?? 0),
    })),
  };

  if (cache) {
    cache.set(cacheKey, payload);
  }
  return payload;
}

async function buildProjectionResultForScenario(scenario, cache = null) {
  const history = await getProjectionCashflowHistory(scenario.entity_id, cache);
  return buildProjectionScenarioResult({
    initial_amount: scenario.initial_amount,
    annual_interest_rate: scenario.annual_interest_rate,
    duration_months: scenario.duration_months,
    monthly_contribution: scenario.monthly_contribution,
    cashflow_assumptions: scenario.cashflow_assumptions,
    ...history,
  });
}

async function buildProjectionResponsePayload(row, cache = null) {
  const scenario = mapProjectionScenarioRow(row);
  if (!scenario) {
    return null;
  }
  const result = await buildProjectionResultForScenario(scenario, cache);
  return {
    scenario,
    result,
  };
}

function normalizeInstitutionType(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "bank" || normalized === "e_wallet") {
    return normalized;
  }
  return null;
}

function normalizeInstitutionActive(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return value === 1 || value === 0 ? value : null;
  }
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return 1;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return 0;
  }
  return null;
}

function normalizeInstitutionSwiftCode(value, type, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  const normalized = normalizeOptionalText(value);
  if (type === "e_wallet") {
    return normalized === null ? null : "__INVALID_E_WALLET_SWIFT__";
  }
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeEntityId(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  return normalized;
}

function hasEntityFilter(query) {
  return (
    Object.prototype.hasOwnProperty.call(query ?? {}, "entity_id") &&
    String(query?.entity_id ?? "").trim() !== ""
  );
}

async function getEntityById(entityId) {
  if (!entityId) {
    return null;
  }
  return get("SELECT id, name, type FROM entities WHERE id = ? LIMIT 1", [
    entityId,
  ]);
}

async function getDefaultEntityId() {
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
  const normalized = normalizeEntityId(row?.id);
  return normalized;
}

async function resolveWriteEntityId(rawEntityId) {
  const normalized = normalizeEntityId(rawEntityId);
  if (normalized) {
    const entity = await getEntityById(normalized);
    return entity ? entity.id : null;
  }
  return getDefaultEntityId();
}

async function resolvePostingAccountId({
  rawAccountId,
  entityId,
  kind,
  keepNull = false,
}) {
  if (rawAccountId !== undefined) {
    if (rawAccountId === null || rawAccountId === "") {
      if (keepNull) {
        return { accountId: null };
      }
      const fallbackAccountId = await resolveEntityDefaultAccountId({
        get,
        all,
        entityId,
        kind,
      });
      return { accountId: fallbackAccountId };
    }
    const parsedAccountId = Number(rawAccountId);
    if (!Number.isInteger(parsedAccountId) || parsedAccountId <= 0) {
      return { error: "Invalid account selection" };
    }
    const account = await get(
      "SELECT id, entity_id FROM accounts WHERE id = ? LIMIT 1",
      [parsedAccountId]
    );
    if (!account || String(account.entity_id || "") !== String(entityId || "")) {
      return { error: "Selected account does not belong to the entity" };
    }
    return { accountId: parsedAccountId };
  }

  const fallbackAccountId = await resolveEntityDefaultAccountId({
    get,
    all,
    entityId,
    kind,
  });
  return { accountId: fallbackAccountId };
}

async function getAccountsTotalBalance(entityId = null) {
  return getAccountsTotalBalanceWithLegacy(all, get, entityId);
}

function isValidMonthKey(value) {
  if (typeof value !== "string" || !MONTH_KEY.test(value)) {
    return false;
  }
  const [year, month] = value.split("-").map(Number);
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

function normalizeExpenseExpectation(value) {
  if (value === null || value === undefined || value === "") {
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

function serializeSuggestionCategoryId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizeSuggestionSelectedForEncoding(value, allowUndefined = false) {
  if (value === undefined && allowUndefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    if (!Number.isInteger(value) || (value !== 0 && value !== 1)) {
      return null;
    }
    return value;
  }
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return 1;
  }
  if (
    normalized === "0" ||
    normalized === "false" ||
    normalized === "no" ||
    normalized === ""
  ) {
    return 0;
  }
  return null;
}

function normalizeSuggestionName(value) {
  return String(value || "").trim();
}

function expenseSuggestionPairKey(categoryId, name) {
  return `${normalizeSuggestionCategoryId(categoryId)}::${normalizeSuggestionName(
    name
  ).toLowerCase()}`;
}

function normalizeSuggestionRow(row, count = 0) {
  const category = normalizeSuggestionName(row?.category);
  return {
    expense_category_id: serializeSuggestionCategoryId(row?.expense_category_id),
    expense_category_name:
      typeof row?.expense_category_name === "string" &&
      row.expense_category_name.trim()
        ? row.expense_category_name
        : null,
    category,
    count: Number(row?.count ?? count),
    last_amount: Number(row?.last_amount ?? 0),
    selected_for_encoding:
      normalizeSuggestionSelectedForEncoding(row?.selected_for_encoding) === 1,
  };
}

async function upsertExpenseSuggestion({
  category,
  amount,
  expense_category_id,
  selected_for_encoding,
}) {
  const name = normalizeSuggestionName(category);
  const normalizedCategoryId = normalizeSuggestionCategoryId(expense_category_id);
  const parsedAmount = Number(amount);
  const normalizedSelectedForEncoding =
    selected_for_encoding === undefined
      ? undefined
      : normalizeSuggestionSelectedForEncoding(selected_for_encoding);
  if (
    !name ||
    normalizedCategoryId === null ||
    Number.isNaN(parsedAmount) ||
    normalizedSelectedForEncoding === null
  ) {
    return;
  }
  const existing = await get(
    `
    SELECT expense_category_id, category
    FROM expense_suggestions
    WHERE
      expense_category_id = ?
      AND LOWER(TRIM(category)) = LOWER(?)
    LIMIT 1
    `,
    [normalizedCategoryId, name]
  );
  if (normalizedSelectedForEncoding === undefined) {
    if (existing) {
      await run(
        `
        UPDATE expense_suggestions
        SET
          category = ?,
          last_amount = ?,
          hidden = 0
        WHERE expense_category_id = ? AND category = ?
        `,
        [name, parsedAmount, normalizedCategoryId, existing.category]
      );
      return;
    }
    await run(
      `
      INSERT INTO expense_suggestions (
        expense_category_id,
        category,
        last_amount,
        hidden,
        selected_for_encoding
      )
      VALUES (?, ?, ?, 0, 0)
      ON CONFLICT(expense_category_id, category)
      DO UPDATE SET
        last_amount = excluded.last_amount,
        hidden = 0
      `,
      [normalizedCategoryId, name, parsedAmount]
    );
    return;
  }
  if (existing) {
    await run(
      `
      UPDATE expense_suggestions
      SET
        category = ?,
        last_amount = ?,
        hidden = 0,
        selected_for_encoding = ?
      WHERE expense_category_id = ? AND category = ?
      `,
      [
        name,
        parsedAmount,
        normalizedSelectedForEncoding,
        normalizedCategoryId,
        existing.category,
      ]
    );
    return;
  }
  await run(
    `
    INSERT INTO expense_suggestions (
      expense_category_id,
      category,
      last_amount,
      hidden,
      selected_for_encoding
    )
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT(expense_category_id, category)
    DO UPDATE SET
      last_amount = excluded.last_amount,
      hidden = 0,
      selected_for_encoding = excluded.selected_for_encoding
    `,
    [normalizedCategoryId, name, parsedAmount, normalizedSelectedForEncoding]
  );
}

function normalizeCsvHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseCsvRows(csvText) {
  if (typeof csvText !== "string") {
    return [];
  }

  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push({ line: rowLine, cells: row });
      row = [];
      cell = "";
      line += 1;
      rowLine = line;
      continue;
    }
    cell += char;
  }

  if (inQuotes) {
    throw new Error("Unclosed quoted field in CSV");
  }

  if (row.length > 0 || cell !== "" || rows.length === 0) {
    row.push(cell);
    rows.push({ line: rowLine, cells: row });
  }

  return rows;
}

function isCsvRowEmpty(cells) {
  return !cells.some((cell) => String(cell || "").trim() !== "");
}

function normalizeOptionalString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function pickCsvValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

function parseCsvAmount(value) {
  if (value === null || value === undefined) {
    return NaN;
  }
  const raw = String(value).trim();
  if (!raw) {
    return NaN;
  }

  const isNegativeByParens = raw.startsWith("(") && raw.endsWith(")");
  const cleaned = raw
    .replace(/[(),]/g, "")
    .replace(/[^\d.-]/g, "");
  const amount = Number(cleaned);
  if (Number.isNaN(amount)) {
    return NaN;
  }
  return isNegativeByParens ? -Math.abs(amount) : amount;
}

function parseDayOfMonth(value) {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { valid: false, value: null };
  }
  return { valid: true, value: day };
}

function normalizeSemiMonthlyDays(rawDay1, rawDay2) {
  const parsedDay1 = parseDayOfMonth(rawDay1);
  const parsedDay2 = parseDayOfMonth(rawDay2);
  if (!parsedDay1.valid || !parsedDay2.valid) {
    return null;
  }

  let day1 = parsedDay1.value;
  let day2 = parsedDay2.value;

  if (day1 === null && day2 === null) {
    day1 = 15;
    day2 = 30;
  } else if (day1 === null || day2 === null) {
    return null;
  }

  if (day1 === day2) {
    return null;
  }

  if (day1 > day2) {
    const temp = day1;
    day1 = day2;
    day2 = temp;
  }

  return { day1, day2 };
}

function todayISO() {
  const now = new Date();
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function isValidRecurringType(value) {
  return RECURRING_TYPES.has(value);
}

function isValidRecurringFrequency(value) {
  return RECURRING_FREQUENCIES.has(value);
}

function parseIsoDate(value) {
  if (!isValidDate(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function formatIsoDate(year, month, day) {
  const monthValue = String(month).padStart(2, "0");
  const dayValue = String(day).padStart(2, "0");
  return `${year}-${monthValue}-${dayValue}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(dateString, monthCount) {
  const parsed = parseIsoDate(dateString);
  if (!parsed) {
    throw new Error("Invalid date");
  }
  const totalMonths = parsed.year * 12 + (parsed.month - 1) + monthCount;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  const nextDay = Math.min(parsed.day, daysInMonth(nextYear, nextMonth));
  return formatIsoDate(nextYear, nextMonth, nextDay);
}

function addDays(dateString, dayCount) {
  const parsed = parseIsoDate(dateString);
  if (!parsed) {
    throw new Error("Invalid date");
  }
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + dayCount);
  return date.toISOString().slice(0, 10);
}

function getMonthKeyFromDate(dateString) {
  if (!isValidDate(dateString)) {
    return null;
  }
  return dateString.slice(0, 7);
}

function getPreviousMonthKey(monthKey) {
  if (!isValidMonthKey(monthKey)) {
    return null;
  }
  return addMonths(`${monthKey}-01`, -1).slice(0, 7);
}

function getLastClosedMonthKey(referenceDate = todayISO()) {
  const monthKey = getMonthKeyFromDate(referenceDate);
  if (!monthKey) {
    return null;
  }
  return getPreviousMonthKey(monthKey);
}

function getMonthDateRange(monthKey) {
  if (!isValidMonthKey(monthKey)) {
    return null;
  }
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = daysInMonth(year, month);
  return {
    startDate: `${monthKey}-01`,
    endDate: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

function shiftMonthKey(monthKey, monthOffset) {
  if (!isValidMonthKey(monthKey)) {
    return null;
  }
  return addMonths(`${monthKey}-01`, monthOffset).slice(0, 7);
}

function getDebtFallbackStatementMonth(item, statementDayByOrigin) {
  const spentAt = typeof item?.spent_at === "string" ? item.spent_at.trim() : "";
  if (!isValidDate(spentAt)) {
    return null;
  }
  const monthKey = spentAt.slice(0, 7);
  const loanOrigin =
    typeof item?.loan_origin === "string" ? item.loan_origin.trim() : "";
  const statementDayRaw = loanOrigin ? statementDayByOrigin.get(loanOrigin) : null;
  const statementDay = Number(statementDayRaw);
  if (!Number.isInteger(statementDay) || statementDay < 1 || statementDay > 31) {
    return monthKey;
  }
  const day = Number(spentAt.slice(8, 10));
  if (!Number.isInteger(day)) {
    return monthKey;
  }
  return day >= statementDay ? shiftMonthKey(monthKey, 1) : monthKey;
}

function getDebtStatementMonth(item, statementDayByOrigin) {
  const statementMonth =
    typeof item?.statement_month === "string" ? item.statement_month.trim() : "";
  if (isValidMonthKey(statementMonth)) {
    return statementMonth;
  }
  return getDebtFallbackStatementMonth(item, statementDayByOrigin);
}

function advanceRecurringDate(dateString, frequency, item = null) {
  if (frequency === "weekly") {
    const parsed = parseIsoDate(dateString);
    if (!parsed) {
      throw new Error("Invalid date");
    }
    const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
    date.setUTCDate(date.getUTCDate() + 7);
    return date.toISOString().slice(0, 10);
  }
  if (frequency === "monthly") {
    return addMonths(dateString, 1);
  }
  if (frequency === "yearly") {
    return addMonths(dateString, 12);
  }
  if (frequency === "semi_monthly") {
    const parsed = parseIsoDate(dateString);
    if (!parsed) {
      throw new Error("Invalid date");
    }
    const normalizedDays = normalizeSemiMonthlyDays(
      item?.semi_monthly_day_1,
      item?.semi_monthly_day_2
    );
    if (!normalizedDays) {
      throw new Error("Invalid semi-monthly days");
    }
    const { day1, day2 } = normalizedDays;
    const monthDays = daysInMonth(parsed.year, parsed.month);
    const currentMonthCandidates = [
      formatIsoDate(parsed.year, parsed.month, Math.min(day1, monthDays)),
      formatIsoDate(parsed.year, parsed.month, Math.min(day2, monthDays)),
    ]
      .filter((candidate) => candidate > dateString)
      .sort();
    if (currentMonthCandidates.length > 0) {
      return currentMonthCandidates[0];
    }

    const nextMonthStart = addMonths(
      formatIsoDate(parsed.year, parsed.month, 1),
      1
    );
    const nextParsed = parseIsoDate(nextMonthStart);
    if (!nextParsed) {
      throw new Error("Invalid date");
    }
    const nextMonthDays = daysInMonth(nextParsed.year, nextParsed.month);
    return formatIsoDate(
      nextParsed.year,
      nextParsed.month,
      Math.min(day1, nextMonthDays)
    );
  }
  throw new Error("Invalid recurring frequency");
}

function getRecurringOccurrencesWithinWindow(item, startDate, endDate) {
  if (
    item.type !== "expense" ||
    Number.isNaN(Number(item.amount)) ||
    !isValidDate(item.next_due_date)
  ) {
    return [];
  }

  const occurrences = [];
  let dueDate = item.next_due_date;

  while (dueDate < startDate) {
    dueDate = advanceRecurringDate(dueDate, item.frequency, item);
  }

  while (dueDate <= endDate) {
    occurrences.push(dueDate);
    dueDate = advanceRecurringDate(dueDate, item.frequency, item);
  }

  return occurrences;
}

function getUpcomingRecurringExpenseTotal(items, startDate, endDate) {
  return items.reduce((total, item) => {
    const occurrences = getRecurringOccurrencesWithinWindow(
      item,
      startDate,
      endDate
    );
    return total + occurrences.length * Number(item.amount || 0);
  }, 0);
}

function calculateRecurringExpectedTotals(items, type) {
  return items.reduce(
    (totals, item) => {
      if (item?.type !== type) {
        return totals;
      }
      const amount = Math.abs(Number(item?.amount ?? 0));
      if (!Number.isFinite(amount) || amount <= 0) {
        return totals;
      }
      if (item.frequency === "weekly") {
        totals.weekly += amount;
        totals.monthly += amount * (52 / 12);
      } else if (item.frequency === "monthly") {
        totals.weekly += amount * (12 / 52);
        totals.monthly += amount;
      } else if (item.frequency === "yearly") {
        totals.weekly += amount / 52;
        totals.monthly += amount / 12;
      } else if (item.frequency === "semi_monthly") {
        totals.weekly += amount * (24 / 52);
        totals.monthly += amount * 2;
      }
      return totals;
    },
    { weekly: 0, monthly: 0 }
  );
}

function roundMoney(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function buildRecurringReportSnapshot(recurringItems = [], summary = null) {
  const incomeTotals = calculateRecurringExpectedTotals(recurringItems, "income");
  const expenseTotals = calculateRecurringExpectedTotals(recurringItems, "expense");
  const spendingPowerMonthly = incomeTotals.monthly - expenseTotals.monthly;
  const spendingPowerWeekly = incomeTotals.weekly - expenseTotals.weekly;

  return {
    income: roundMoney(summary?.income ?? 0),
    expenses: roundMoney(summary?.expenses ?? 0),
    expected_income_monthly: roundMoney(incomeTotals.monthly),
    expected_income_weekly: roundMoney(incomeTotals.weekly),
    expected_expense_monthly: roundMoney(expenseTotals.monthly),
    expected_expense_weekly: roundMoney(expenseTotals.weekly),
    spending_power_monthly: roundMoney(spendingPowerMonthly),
    spending_power_weekly: roundMoney(spendingPowerWeekly),
  };
}

const RECURRING_SNAPSHOT_FIELDS = [
  "income",
  "expenses",
  "expected_income_monthly",
  "expected_income_weekly",
  "expected_expense_monthly",
  "expected_expense_weekly",
  "spending_power_monthly",
  "spending_power_weekly",
];

function hasRecurringSnapshotStructure(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }
  return RECURRING_SNAPSHOT_FIELDS.every((field) =>
    Number.isFinite(Number(snapshot[field]))
  );
}

function hasAnyNonZeroRecurringSnapshotValue(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }
  return RECURRING_SNAPSHOT_FIELDS.some(
    (field) => Math.abs(Number(snapshot[field] ?? 0)) >= 0.01
  );
}

function shouldBackfillRecurringSnapshot(existingSnapshot, computedSnapshot) {
  if (!hasRecurringSnapshotStructure(existingSnapshot)) {
    return true;
  }
  const existingHasData = hasAnyNonZeroRecurringSnapshotValue(existingSnapshot);
  if (existingHasData) {
    return false;
  }
  return hasAnyNonZeroRecurringSnapshotValue(computedSnapshot);
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildCsv(columns, rows) {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((column) => csvEscape(row[column])).join(",")
  );
  return [header, ...lines].join("\n");
}

function normalizeRecurringPayload(body) {
  const type =
    typeof body.type === "string" ? body.type.trim().toLowerCase() : "";
  const amount = Number(body.amount);
  const category =
    typeof body.category === "string" ? body.category.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const frequency =
    typeof body.frequency === "string"
      ? body.frequency.trim().toLowerCase()
      : "";
  const nextDueDate =
    typeof body.next_due_date === "string" ? body.next_due_date.trim() : "";
  const rawSemiMonthlyDay1 = body.semi_monthly_day_1;
  const rawSemiMonthlyDay2 = body.semi_monthly_day_2;
  const entityId = normalizeEntityId(body.entity_id);
  const fromAccountId = normalizeOptionalAccountId(body.from_account_id);
  const toAccountId = normalizeOptionalAccountId(body.to_account_id);
  const mirrorAsIncomeExpense = normalizeBooleanFlag(
    body.mirror_as_income_expense,
    false
  );
  const rawTransferFeeAmount = body.transfer_fee_amount;
  const rawExpenseCategoryId = body.expense_category_id;
  const rawIncomeCategoryId = body.income_category_id;
  let transferFeeAmount = 0;
  if (
    rawTransferFeeAmount !== null &&
    rawTransferFeeAmount !== undefined &&
    rawTransferFeeAmount !== ""
  ) {
    transferFeeAmount = Number(rawTransferFeeAmount);
    if (!Number.isFinite(transferFeeAmount) || transferFeeAmount < 0) {
      return null;
    }
  }
  let expenseCategoryId = null;
  if (
    rawExpenseCategoryId !== null &&
    rawExpenseCategoryId !== undefined &&
    rawExpenseCategoryId !== ""
  ) {
    expenseCategoryId = Number(rawExpenseCategoryId);
    if (Number.isNaN(expenseCategoryId)) {
      return null;
    }
  }
  let incomeCategoryId = null;
  if (
    rawIncomeCategoryId !== null &&
    rawIncomeCategoryId !== undefined &&
    rawIncomeCategoryId !== ""
  ) {
    incomeCategoryId = Number(rawIncomeCategoryId);
    if (Number.isNaN(incomeCategoryId)) {
      return null;
    }
  }

  if (
    Number.isNaN(amount) ||
    !category ||
    !isValidRecurringType(type) ||
    !isValidRecurringFrequency(frequency) ||
    !isValidDate(nextDueDate)
  ) {
    return null;
  }

  if (type === "transfer" && (!fromAccountId || !toAccountId || fromAccountId === toAccountId)) {
    return null;
  }

  let semiMonthlyDays = null;
  if (frequency === "semi_monthly") {
    if (type !== "income") {
      return null;
    }
    semiMonthlyDays = normalizeSemiMonthlyDays(
      rawSemiMonthlyDay1,
      rawSemiMonthlyDay2
    );
    if (!semiMonthlyDays) {
      return null;
    }
  }

  return {
    type,
    entity_id: entityId,
    amount,
    category,
    expense_category_id:
      type === "expense" || type === "transfer" ? expenseCategoryId : null,
    income_category_id:
      type === "income" || type === "transfer" ? incomeCategoryId : null,
    from_account_id: type === "transfer" ? fromAccountId : null,
    to_account_id: type === "transfer" ? toAccountId : null,
    mirror_as_income_expense: type === "transfer" ? mirrorAsIncomeExpense : false,
    transfer_fee_amount: type === "transfer" ? transferFeeAmount : 0,
    description,
    frequency,
    semi_monthly_day_1: semiMonthlyDays?.day1 ?? null,
    semi_monthly_day_2: semiMonthlyDays?.day2 ?? null,
    next_due_date: nextDueDate,
  };
}

async function getRecurringItemById(id) {
  return get(`${RECURRING_SELECT} WHERE r.id = ?`, [id]);
}

function buildRecurringEntityFilter(entityId) {
  if (!entityId) {
    return { clause: "", params: [] };
  }
  return {
    clause: `
      (
        (r.type = 'transfer' AND (from_account.entity_id = ? OR to_account.entity_id = ?))
        OR
        (r.type <> 'transfer' AND r.entity_id = ?)
      )
    `,
    params: [entityId, entityId, entityId],
  };
}

async function recurringExpenseCategoryExists(expenseCategoryId) {
  if (expenseCategoryId === null || expenseCategoryId === undefined) {
    return true;
  }
  const row = await get("SELECT id FROM categories WHERE id = ?", [expenseCategoryId]);
  return Boolean(row);
}

async function recurringIncomeCategoryExists(incomeCategoryId) {
  if (incomeCategoryId === null || incomeCategoryId === undefined) {
    return true;
  }
  const row = await get("SELECT id FROM income_categories WHERE id = ?", [
    incomeCategoryId,
  ]);
  return Boolean(row);
}

async function getRecurringTransferAccountById(accountId) {
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return null;
  }
  return get(
    `
    SELECT
      a.id,
      a.name,
      a.entity_id,
      a.currency_code,
      e.name AS entity_name,
      e.type AS entity_type
    FROM accounts a
    LEFT JOIN entities e ON e.id = a.entity_id
    WHERE a.id = ?
    LIMIT 1
    `,
    [accountId]
  );
}

async function validateRecurringTransferPayload(payload) {
  if (payload.type !== "transfer") {
    return {
      ok: true,
      entityId: payload.entity_id,
      sourceAccount: null,
      destinationAccount: null,
      isCrossEntity: false,
      mirrorAsIncomeExpense: false,
    };
  }

  const [sourceAccount, destinationAccount] = await Promise.all([
    getRecurringTransferAccountById(payload.from_account_id),
    getRecurringTransferAccountById(payload.to_account_id),
  ]);

  if (!sourceAccount) {
    return { ok: false, error: "Source account does not exist" };
  }
  if (!destinationAccount) {
    return { ok: false, error: "Destination account does not exist" };
  }
  if (Number(sourceAccount.id) === Number(destinationAccount.id)) {
    return { ok: false, error: "Transfer must use two different accounts" };
  }
  if (
    String(sourceAccount.currency_code || "").trim().toUpperCase() !==
    String(destinationAccount.currency_code || "").trim().toUpperCase()
  ) {
    return { ok: false, error: "Transfer requires accounts with the same currency" };
  }

  const isCrossEntity =
    String(sourceAccount.entity_id || "") !== String(destinationAccount.entity_id || "");

  return {
    ok: true,
    entityId: String(sourceAccount.entity_id || ""),
    sourceAccount,
    destinationAccount,
    isCrossEntity,
    mirrorAsIncomeExpense: isCrossEntity && normalizeBooleanFlag(payload.mirror_as_income_expense),
  };
}

async function createRecurringItem(payload) {
  const result = await run(
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
      semi_monthly_day_1,
      semi_monthly_day_2,
      next_due_date,
      last_confirmed_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.type,
      payload.entity_id,
      payload.amount,
      payload.category,
      payload.expense_category_id ?? null,
      payload.income_category_id ?? null,
      payload.from_account_id ?? null,
      payload.to_account_id ?? null,
      payload.mirror_as_income_expense ? 1 : 0,
      payload.transfer_fee_amount ?? 0,
      payload.description ?? null,
      payload.frequency,
      payload.semi_monthly_day_1 ?? null,
      payload.semi_monthly_day_2 ?? null,
      payload.next_due_date,
      payload.last_confirmed_date ?? null,
    ]
  );

  return getRecurringItemById(result.lastID);
}

function sumTransactionsByType(transactions, type) {
  if (!Array.isArray(transactions)) {
    return 0;
  }
  return transactions.reduce((sum, tx) => {
    if (tx?.type !== type) {
      return sum;
    }
    const amount = Number(tx?.amount ?? 0);
    if (!Number.isFinite(amount)) {
      return sum;
    }
    return sum + (type === "expense" ? Math.abs(amount) : Math.abs(amount));
  }, 0);
}

function paginateItems(items, page, pageSize) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 50;
  const offset = (safePage - 1) * safePageSize;
  return {
    items: items.slice(offset, offset + safePageSize),
    page: safePage,
    page_size: safePageSize,
    total: items.length,
  };
}

async function getMonthTransactions(monthKey, entityId = null) {
  const range = getMonthDateRange(monthKey);
  if (!range) {
    throw new Error("Invalid month key");
  }

  const incomeEntityClause = entityId ? "AND i.entity_id = ?" : "";
  const expenseEntityClause = entityId ? "AND e.entity_id = ?" : "";
  const incomeParams = entityId
    ? [range.startDate, range.endDate, entityId]
    : [range.startDate, range.endDate];
  const expenseParams = entityId
    ? [range.startDate, range.endDate, entityId]
    : [range.startDate, range.endDate];

  const [incomeRows, expenseRows] = await Promise.all([
    all(
      `
      SELECT
        i.id,
        i.received_date AS date,
        i.amount,
        COALESCE(ic.name, i.source, 'Uncategorized') AS category
      FROM income i
      LEFT JOIN income_categories ic ON i.income_category_id = ic.id
      WHERE i.received_date >= ? AND i.received_date <= ?
      ${incomeEntityClause}
      `,
      incomeParams
    ),
    all(
      `
      SELECT
        e.id,
        e.spent_at AS date,
        e.amount,
        COALESCE(c.name, e.category, 'Uncategorized') AS category,
        e.expense_expectation
      FROM expenses e
      LEFT JOIN categories c ON e.expense_category_id = c.id
      WHERE e.spent_at >= ? AND e.spent_at <= ?
      ${expenseEntityClause}
      `,
      expenseParams
    ),
  ]);

  const incomeTransactions = incomeRows.map((row) => ({
    id: `income:${row.id}`,
    date: row.date,
    amount: Math.abs(Number(row.amount ?? 0)),
    category: row.category || "Uncategorized",
    type: "income",
  }));
  const expenseTransactions = expenseRows.map((row) => ({
    id: `expense:${row.id}`,
    date: row.date,
    amount: -Math.abs(Number(row.amount ?? 0)),
    category: row.category || "Uncategorized",
    type: "expense",
    expected: row.expense_expectation === "unexpected" ? false : true,
  }));

  return [...incomeTransactions, ...expenseTransactions];
}

async function getMonthAccounts(monthKey, entityId = null) {
  const range = getMonthDateRange(monthKey);
  if (!range) {
    throw new Error("Invalid month key");
  }
  const incomeEntityClause = entityId ? "AND entity_id = ?" : "";
  const expenseEntityClause = entityId ? "AND entity_id = ?" : "";
  const incomeParams = entityId ? [range.endDate, entityId] : [range.endDate];
  const expenseParams = entityId ? [range.endDate, entityId] : [range.endDate];
  const [settings, incomeTotal, expenseTotal] = await Promise.all([
    get("SELECT base_balance FROM settings WHERE id = 1"),
    get(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM income WHERE COALESCE(is_transfer_bookkeeping, 0) = 0 AND received_date <= ? ${incomeEntityClause}`,
      incomeParams
    ),
    get(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE COALESCE(is_transfer_bookkeeping, 0) = 0 AND spent_at <= ? ${expenseEntityClause}`,
      expenseParams
    ),
  ]);

  const effectiveBaseBalance = entityId ? 0 : Number(settings?.base_balance ?? 0);
  const cashBalance =
    effectiveBaseBalance +
    Number(incomeTotal?.total ?? 0) -
    Number(expenseTotal?.total ?? 0);

  return [{ id: "cash", balance: cashBalance }];
}

async function getMonthDebtSnapshot(monthKey, entityId = null) {
  const range = getMonthDateRange(monthKey);
  if (!range) {
    throw new Error("Invalid month key");
  }
  const keyExpr =
    "COALESCE(NULLIF(TRIM(d.loan_origin), ''), NULLIF(TRIM(d.name), ''), 'Unassigned Debt')";
  const rows = await all(
    `
    SELECT
      ${keyExpr} AS debt_key,
      SUM(CASE WHEN d.spent_at <= ? THEN d.amount ELSE 0 END) AS balance,
      SUM(
        CASE
          WHEN d.spent_at >= ? AND d.spent_at <= ? AND d.amount < 0
            THEN ABS(d.amount)
          ELSE 0
        END
      ) AS monthly_payment
    FROM debts d
    ${entityId ? "WHERE d.entity_id = ?" : ""}
    GROUP BY ${keyExpr}
    `,
    entityId
      ? [range.endDate, range.startDate, range.endDate, entityId]
      : [range.endDate, range.startDate, range.endDate]
  );

  return rows
    .map((row) => ({
      id: row.debt_key,
      balance: Number(row.balance ?? 0),
      monthlyPayment: Number(row.monthly_payment ?? 0),
    }))
    .filter((row) => row.balance !== 0 || row.monthlyPayment !== 0);
}

async function getMonthDebtTransactions(monthKey, entityId = null) {
  if (!isValidMonthKey(monthKey)) {
    throw new Error("Invalid month key");
  }

  const [configRows, debtRows] = await Promise.all([
    all(
      `
      SELECT loan_origin, statement_day
      FROM loan_origin_configs
      WHERE loan_origin IS NOT NULL AND TRIM(loan_origin) <> ''
      `
    ),
    all(
      `
      SELECT
        d.id,
        d.spent_at,
        d.statement_month,
        d.amount,
        d.name,
        d.loan_origin,
        c.name AS category_name
      FROM debts d
      LEFT JOIN categories c ON d.debt_category_id = c.id
      ${entityId ? "WHERE d.entity_id = ?" : ""}
      ORDER BY d.spent_at DESC, d.id DESC
      `
      ,
      entityId ? [entityId] : []
    ),
  ]);

  const statementDayByOrigin = new Map();
  configRows.forEach((row) => {
    const loanOrigin =
      typeof row?.loan_origin === "string" ? row.loan_origin.trim() : "";
    if (!loanOrigin) {
      return;
    }
    statementDayByOrigin.set(loanOrigin, row.statement_day);
  });

  return debtRows
    .filter((row) => getDebtStatementMonth(row, statementDayByOrigin) === monthKey)
    .map((row) => ({
      id: `debt:${row.id}`,
      date: row.spent_at,
      amount: Number(row.amount ?? 0),
      category:
        String(row.category_name || "").trim() ||
        String(row.loan_origin || "").trim() ||
        String(row.name || "").trim() ||
        "Uncategorized",
      name:
        String(row.name || "").trim() ||
        String(row.loan_origin || "").trim() ||
        "Debt",
      type: "debt",
    }));
}

async function buildMonthlyReportForMonth(monthKey, entityId = null) {
  if (!isValidMonthKey(monthKey)) {
    throw new Error("Invalid month key");
  }

  const previousMonthKey = getPreviousMonthKey(monthKey);
  const prePreviousMonthKey = previousMonthKey
    ? getPreviousMonthKey(previousMonthKey)
    : null;

  const [
    transactions,
    previousMonthTransactions,
    prePreviousMonthTransactions,
    accounts,
    previousAccounts,
    debts,
    debtTransactions,
    recurringItems,
  ] = await Promise.all([
    getMonthTransactions(monthKey, entityId),
    previousMonthKey ? getMonthTransactions(previousMonthKey, entityId) : [],
    prePreviousMonthKey ? getMonthTransactions(prePreviousMonthKey, entityId) : [],
    getMonthAccounts(monthKey, entityId),
    previousMonthKey ? getMonthAccounts(previousMonthKey, entityId) : [],
    getMonthDebtSnapshot(monthKey, entityId),
    getMonthDebtTransactions(monthKey, entityId),
    all(
      `${RECURRING_SELECT}${entityId ? " WHERE r.entity_id = ?" : ""}`,
      entityId ? [entityId] : []
    ),
  ]);

  const trendIncomeSeries = [
    sumTransactionsByType(prePreviousMonthTransactions, "income"),
    sumTransactionsByType(previousMonthTransactions, "income"),
    sumTransactionsByType(transactions, "income"),
  ];
  const trendExpenseSeries = [
    sumTransactionsByType(prePreviousMonthTransactions, "expense"),
    sumTransactionsByType(previousMonthTransactions, "expense"),
    sumTransactionsByType(transactions, "expense"),
  ];
  const trendNetSeries = trendIncomeSeries.map(
    (income, index) => income - (trendExpenseSeries[index] ?? 0)
  );

  const report = generateMonthlyReport({
    transactions,
    previousMonthTransactions,
    accounts,
    debts,
    previousAccounts,
    trendSeries: {
      income: trendIncomeSeries,
      expenses: trendExpenseSeries,
      net: trendNetSeries,
    },
    options: {
      expectedDefault: true,
    },
  });
  const recurringSnapshot = buildRecurringReportSnapshot(
    recurringItems,
    report.summary
  );

  return {
    ...report,
    recurring: recurringSnapshot,
    transactionsList: {
      ...(report.transactionsList || {}),
      debts: debtTransactions,
    },
  };
}

function normalizeMonthlyReportEntityScope(entityId) {
  const normalized = normalizeEntityId(entityId);
  return normalized || "";
}

async function saveMonthlyReport(monthKey, report, entityId = null) {
  const now = new Date().toISOString();
  const entityScope = normalizeMonthlyReportEntityScope(entityId);
  await run(
    `
    INSERT INTO monthly_reports (month_key, entity_id, report_json, generated_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(month_key, entity_id)
    DO UPDATE SET
      report_json = excluded.report_json,
      updated_at = excluded.updated_at
    `,
    [monthKey, entityScope, JSON.stringify(report), now, now]
  );
  return getMonthlyReportRecord(monthKey, entityId);
}

async function getMonthlyReportRecord(monthKey, entityId = null) {
  const entityScope = normalizeMonthlyReportEntityScope(entityId);
  const row = await get(
    `
    SELECT month_key, entity_id, report_json, generated_at, updated_at
    FROM monthly_reports
    WHERE month_key = ? AND entity_id = ?
    `,
    [monthKey, entityScope]
  );
  if (!row) {
    return null;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(String(row.report_json || "{}"));
  } catch (err) {
    parsed = null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return {
    month_key: row.month_key,
    entity_id: row.entity_id || null,
    generated_at: row.generated_at,
    updated_at: row.updated_at,
    report: parsed,
  };
}

async function ensureMonthlyReportsForClosedMonths(entityId = null) {
  const lastClosedMonth = getLastClosedMonthKey();
  if (!lastClosedMonth) {
    return { generated: [] };
  }
  const entityScope = normalizeMonthlyReportEntityScope(entityId);
  const hasEntityFilter = entityScope !== "";

  const [existingRows, candidateRows] = await Promise.all([
    all("SELECT month_key FROM monthly_reports WHERE entity_id = ?", [entityScope]),
    all(
      `
      SELECT DISTINCT substr(date_value, 1, 7) AS month_key
      FROM (
        SELECT received_date AS date_value
        FROM income
        ${hasEntityFilter ? "WHERE entity_id = ?" : ""}
        UNION ALL
        SELECT spent_at AS date_value
        FROM expenses
        ${hasEntityFilter ? "WHERE entity_id = ?" : ""}
        UNION ALL
        SELECT spent_at AS date_value
        FROM debts
        ${hasEntityFilter ? "WHERE entity_id = ?" : ""}
      )
      WHERE date_value IS NOT NULL AND date_value <> ''
      ORDER BY month_key ASC
      `,
      hasEntityFilter ? [entityScope, entityScope, entityScope] : []
    ),
  ]);

  const existingMonths = new Set(
    existingRows
      .map((row) => row.month_key)
      .filter((monthKey) => isValidMonthKey(monthKey))
  );

  const candidateMonths = new Set([lastClosedMonth]);
  candidateRows.forEach((row) => {
    const monthKey = String(row?.month_key || "");
    if (!isValidMonthKey(monthKey)) {
      return;
    }
    if (monthKey > lastClosedMonth) {
      return;
    }
    candidateMonths.add(monthKey);
  });

  const generated = [];
  const orderedCandidates = Array.from(candidateMonths).sort();
  for (const monthKey of orderedCandidates) {
    if (existingMonths.has(monthKey)) {
      continue;
    }
    const report = await buildMonthlyReportForMonth(monthKey, entityId);
    await saveMonthlyReport(monthKey, report, entityId);
    generated.push(monthKey);
  }

  return { generated };
}

registerSettingsBalanceRoutes(app, {
  all,
  get,
  run,
  hasEntityFilter,
  normalizeEntityId,
  getEntityById,
  normalizeOptionalAccountId,
  getAccountsTotalBalance,
  RECURRING_SELECT,
  todayISO,
  addDays,
  getUpcomingRecurringExpenseTotal,
});

registerDebtRoutes(app, {
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
});

registerIncomeRoutes(app, {
  all,
  get,
  run,
  hasEntityFilter,
  normalizeEntityId,
  getEntityById,
  isValidDate,
  resolveWriteEntityId,
});

registerInstitutionRoutes(app, {
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
});

registerInsuranceRoutes(app, {
  all,
  get,
  run,
});

registerBudgetRoutes(app, {
  all,
  get,
  run,
  hasEntityFilter,
  normalizeEntityId,
  getEntityById,
  resolveWriteEntityId,
  isValidDate,
  todayISO,
});

app.get("/expenses", async (req, res) => {
  const filterActive = hasEntityFilter(req.query);
  const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
  if (filterActive && !entityId) {
    return res.status(400).json({ error: "Invalid expense filters" });
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
      LEFT JOIN entities ent ON e.entity_id = ent.id
      LEFT JOIN accounts a ON e.from_account_id = a.id
      LEFT JOIN categories c ON e.expense_category_id = c.id
      ${entityId ? "WHERE e.entity_id = ?" : ""}
      ORDER BY e.spent_at DESC, e.id DESC
      `,
      entityId ? [entityId] : []
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load expenses" });
  }
});


app.post("/expenses", async (req, res) => {
  const {
    amount,
    name,
    category,
    notes,
    spent_at,
    expense_category_id,
    expense_expectation,
    entity_id,
    from_account_id,
  } = req.body;
  const parsedAmount = Number(amount);
  const expenseName =
    typeof name === "string" && name.trim()
      ? name.trim()
      : typeof category === "string"
      ? category.trim()
      : "";
  const expectation =
    normalizeExpenseExpectation(expense_expectation) || "unexpected";
  const categoryId =
    expense_category_id === null || expense_category_id === undefined
      ? null
      : Number(expense_category_id);
  if (
    Number.isNaN(parsedAmount) ||
    !expenseName ||
    !isValidDate(spent_at) ||
    (expense_expectation !== undefined &&
      normalizeExpenseExpectation(expense_expectation) === null) ||
    (categoryId !== null && Number.isNaN(categoryId))
  ) {
    return res.status(400).json({ error: "Invalid expense payload" });
  }

  try {
    const resolvedEntityId = await resolveWriteEntityId(entity_id);
    if (!resolvedEntityId) {
      return res.status(400).json({ error: "Invalid expense payload" });
    }
    const postingAccount = await resolvePostingAccountId({
      rawAccountId: from_account_id,
      entityId: resolvedEntityId,
      kind: "expense",
    });
    if (postingAccount.error) {
      return res.status(400).json({ error: postingAccount.error });
    }
    const createdAt = new Date().toISOString();
    const result = await run(
      "INSERT INTO expenses (amount, category, notes, spent_at, created_at, expense_category_id, expense_expectation, entity_id, from_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        parsedAmount,
        expenseName,
        notes || null,
        spent_at,
        createdAt,
        categoryId,
        expectation,
        resolvedEntityId,
        postingAccount.accountId,
      ]
    );
    await upsertExpenseSuggestion({
      category: expenseName,
      amount: parsedAmount,
      expense_category_id: categoryId,
    });

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
      LEFT JOIN entities ent ON e.entity_id = ent.id
      LEFT JOIN accounts a ON e.from_account_id = a.id
      LEFT JOIN categories c ON e.expense_category_id = c.id
      WHERE e.id = ?
      `,
      [result.lastID]
    );

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to add expense" });
  }
});


app.get("/recurring-items", async (req, res) => {
  const filterActive = hasEntityFilter(req.query);
  const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
  if (filterActive && !entityId) {
    return res.status(400).json({ error: "Invalid recurring filters" });
  }
  try {
    if (entityId) {
      const entity = await getEntityById(entityId);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
    }
    const recurringFilter = buildRecurringEntityFilter(entityId);
    const rows = await all(
      `${RECURRING_SELECT}${recurringFilter.clause ? ` WHERE ${recurringFilter.clause}` : ""} ORDER BY r.next_due_date ASC, r.id ASC`,
      recurringFilter.params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load recurring items" });
  }
});

app.get("/recurring-items/pending", async (req, res) => {
  const filterActive = hasEntityFilter(req.query);
  const entityId = filterActive ? normalizeEntityId(req.query.entity_id) : null;
  if (filterActive && !entityId) {
    return res.status(400).json({ error: "Invalid recurring filters" });
  }
  try {
    if (entityId) {
      const entity = await getEntityById(entityId);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
    }
    const recurringFilter = buildRecurringEntityFilter(entityId);
    const rows = await all(
      `${RECURRING_SELECT} WHERE r.next_due_date <= ?${
        recurringFilter.clause ? ` AND ${recurringFilter.clause}` : ""
      } ORDER BY r.next_due_date ASC, r.id ASC`,
      [todayISO(), ...recurringFilter.params]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load pending recurring items" });
  }
});

app.post("/recurring-items", async (req, res) => {
  const payload = normalizeRecurringPayload(req.body);
  if (!payload) {
    return res.status(400).json({ error: "Invalid recurring item payload" });
  }

  try {
    if (!(await recurringExpenseCategoryExists(payload.expense_category_id))) {
      return res.status(400).json({ error: "Invalid recurring item payload" });
    }
    if (!(await recurringIncomeCategoryExists(payload.income_category_id))) {
      return res.status(400).json({ error: "Invalid recurring item payload" });
    }
    const transferValidation = await validateRecurringTransferPayload(payload);
    if (!transferValidation.ok) {
      return res.status(400).json({ error: transferValidation.error });
    }
    const resolvedEntityId =
      payload.type === "transfer"
        ? transferValidation.entityId
        : await resolveWriteEntityId(payload.entity_id);
    if (!resolvedEntityId) {
      return res.status(400).json({ error: "Invalid recurring item payload" });
    }
    const row = await createRecurringItem({
      ...payload,
      entity_id: resolvedEntityId,
      mirror_as_income_expense: transferValidation.mirrorAsIncomeExpense,
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to create recurring item" });
  }
});

app.put("/recurring-items/:id", async (req, res) => {
  const id = Number(req.params.id);
  const payload = normalizeRecurringPayload(req.body);
  if (Number.isNaN(id) || !payload) {
    return res.status(400).json({ error: "Invalid recurring item update" });
  }

  try {
    if (!(await recurringExpenseCategoryExists(payload.expense_category_id))) {
      return res.status(400).json({ error: "Invalid recurring item update" });
    }
    if (!(await recurringIncomeCategoryExists(payload.income_category_id))) {
      return res.status(400).json({ error: "Invalid recurring item update" });
    }
    const transferValidation = await validateRecurringTransferPayload(payload);
    if (!transferValidation.ok) {
      return res.status(400).json({ error: transferValidation.error });
    }
    const resolvedEntityId =
      payload.type === "transfer"
        ? transferValidation.entityId
        : await resolveWriteEntityId(payload.entity_id);
    if (!resolvedEntityId) {
      return res.status(400).json({ error: "Invalid recurring item update" });
    }
    const result = await run(
      `
      UPDATE recurring_items
      SET
        type = ?,
        entity_id = ?,
        amount = ?,
        category = ?,
        expense_category_id = ?,
        income_category_id = ?,
        from_account_id = ?,
        to_account_id = ?,
        mirror_as_income_expense = ?,
        transfer_fee_amount = ?,
        description = ?,
        frequency = ?,
        semi_monthly_day_1 = ?,
        semi_monthly_day_2 = ?,
        next_due_date = ?
      WHERE id = ?
      `,
      [
        payload.type,
        resolvedEntityId,
        payload.amount,
        payload.category,
        payload.expense_category_id ?? null,
        payload.income_category_id ?? null,
        payload.from_account_id ?? null,
        payload.to_account_id ?? null,
        transferValidation.mirrorAsIncomeExpense ? 1 : 0,
        payload.transfer_fee_amount ?? 0,
        payload.description,
        payload.frequency,
        payload.semi_monthly_day_1 ?? null,
        payload.semi_monthly_day_2 ?? null,
        payload.next_due_date,
        id,
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Recurring item not found" });
    }

    res.json(await getRecurringItemById(id));
  } catch (err) {
    res.status(500).json({ error: "Failed to update recurring item" });
  }
});

app.post("/expenses/:id/mark-recurring", async (req, res) => {
  const id = Number(req.params.id);
  const frequency =
    typeof req.body?.frequency === "string" && req.body.frequency.trim()
      ? req.body.frequency.trim().toLowerCase()
      : "monthly";
  if (
    Number.isNaN(id) ||
    !isValidRecurringFrequency(frequency) ||
    frequency === "semi_monthly"
  ) {
    return res.status(400).json({ error: "Invalid recurring expense request" });
  }

  try {
    const expense = await get(
      "SELECT id, amount, category AS name, notes, spent_at, expense_category_id, entity_id FROM expenses WHERE id = ?",
      [id]
    );
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const row = await createRecurringItem({
      type: "expense",
      amount: expense.amount,
      entity_id: expense.entity_id,
      category: expense.name,
      expense_category_id: expense.expense_category_id,
      description: expense.notes || null,
      frequency,
      next_due_date: advanceRecurringDate(expense.spent_at, frequency),
      last_confirmed_date: expense.spent_at,
    });

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to create recurring item from expense" });
  }
});

app.put("/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {
    amount,
    name,
    category,
    notes,
    spent_at,
    expense_category_id,
    expense_expectation,
    from_account_id,
  } = req.body;
  const parsedAmount = Number(amount);
  const expenseName =
    typeof name === "string" && name.trim()
      ? name.trim()
      : typeof category === "string"
      ? category.trim()
      : "";
  const categoryId =
    expense_category_id === null || expense_category_id === undefined
      ? null
      : Number(expense_category_id);

  if (
    Number.isNaN(id) ||
    Number.isNaN(parsedAmount) ||
    !expenseName ||
    !isValidDate(spent_at) ||
    (expense_expectation !== undefined &&
      normalizeExpenseExpectation(expense_expectation) === null) ||
    (categoryId !== null && Number.isNaN(categoryId))
  ) {
    return res.status(400).json({ error: "Invalid expense update payload" });
  }

  try {
    const existing = await get(
      "SELECT id, entity_id, expense_expectation, from_account_id FROM expenses WHERE id = ?",
      [id]
    );
    if (!existing) {
      return res.status(404).json({ error: "Expense not found" });
    }
    const nextExpectation =
      expense_expectation === undefined
        ? normalizeExpenseExpectation(existing.expense_expectation) ||
          "unexpected"
        : normalizeExpenseExpectation(expense_expectation) || "unexpected";
    const postingAccount = await resolvePostingAccountId({
      rawAccountId: Object.prototype.hasOwnProperty.call(req.body ?? {}, "from_account_id")
        ? from_account_id
        : existing.from_account_id,
      entityId: existing.entity_id,
      kind: "expense",
      keepNull: !Object.prototype.hasOwnProperty.call(req.body ?? {}, "from_account_id"),
    });
    if (postingAccount.error) {
      return res.status(400).json({ error: postingAccount.error });
    }
    const result = await run(
      `
      UPDATE expenses
      SET
        amount = ?,
        category = ?,
        notes = ?,
        spent_at = ?,
        expense_category_id = ?,
        expense_expectation = ?,
        from_account_id = ?
      WHERE id = ?
      `,
      [
        parsedAmount,
        expenseName,
        notes || null,
        spent_at,
        categoryId,
        nextExpectation,
        postingAccount.accountId,
        id,
      ]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    await upsertExpenseSuggestion({
      category: expenseName,
      amount: parsedAmount,
      expense_category_id: categoryId,
    });

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
      LEFT JOIN entities ent ON e.entity_id = ent.id
      LEFT JOIN accounts a ON e.from_account_id = a.id
      LEFT JOIN categories c ON e.expense_category_id = c.id
      WHERE e.id = ?
      `,
      [id]
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to update expense" });
  }
});

app.delete("/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid expense id" });
  }
  try {
    const result = await run("DELETE FROM expenses WHERE id = ?", [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

app.delete("/recurring-items/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid recurring item id" });
  }
  try {
    const result = await run("DELETE FROM recurring_items WHERE id = ?", [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Recurring item not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete recurring item" });
  }
});

app.put("/expenses/:id/category", async (req, res) => {
  const id = Number(req.params.id);
  const { expense_category_id } = req.body;
  const categoryId =
    expense_category_id === null || expense_category_id === undefined
      ? null
      : Number(expense_category_id);
  if (Number.isNaN(id) || (categoryId !== null && Number.isNaN(categoryId))) {
    return res.status(400).json({ error: "Invalid expense category update" });
  }
  try {
    const result = await run(
      "UPDATE expenses SET expense_category_id = ? WHERE id = ?",
      [categoryId, id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    const row = await get(
      `
      SELECT
        e.id,
        e.amount,
        e.category AS name,
        e.notes,
        e.spent_at,
        e.created_at,
        e.expense_category_id,
        e.expense_expectation,
        c.name AS expense_category_name
      FROM expenses e
      LEFT JOIN categories c ON e.expense_category_id = c.id
      WHERE e.id = ?
      `,
      [id]
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to update expense category" });
  }
});

app.put("/expenses/:id/expectation", async (req, res) => {
  const id = Number(req.params.id);
  const { expense_expectation } = req.body;
  const expectation = normalizeExpenseExpectation(expense_expectation);
  if (Number.isNaN(id) || !expectation) {
    return res.status(400).json({ error: "Invalid expense expectation update" });
  }
  try {
    const result = await run(
      "UPDATE expenses SET expense_expectation = ? WHERE id = ?",
      [expectation, id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    const row = await get(
      `
      SELECT
        e.id,
        e.amount,
        e.category AS name,
        e.notes,
        e.spent_at,
        e.created_at,
        e.expense_category_id,
        e.expense_expectation,
        c.name AS expense_category_name
      FROM expenses e
      LEFT JOIN categories c ON e.expense_category_id = c.id
      WHERE e.id = ?
      `,
      [id]
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to update expense expectation" });
  }
});

app.post("/recurring-items/:id/confirm", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid recurring item id" });
  }

  try {
    const recurringItem = await getRecurringItemById(id);
    if (!recurringItem) {
      return res.status(404).json({ error: "Recurring item not found" });
    }

    let createdRecord = null;
    let bookkeepingRecords = [];
    if (recurringItem.type === "income") {
      const result = await run(
        "INSERT INTO income (amount, source, received_date, income_category_id, entity_id) VALUES (?, ?, ?, ?, ?)",
        [
          recurringItem.amount,
          recurringItem.category,
          recurringItem.next_due_date,
          recurringItem.income_category_id ?? null,
          recurringItem.entity_id ?? null,
        ]
      );
      createdRecord = await get(
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
        [result.lastID]
      );
    } else if (recurringItem.type === "expense") {
      const createdAt = new Date().toISOString();
      const result = await run(
        "INSERT INTO expenses (amount, category, notes, spent_at, created_at, expense_category_id, expense_expectation, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          recurringItem.amount,
          recurringItem.category,
          recurringItem.description || null,
          recurringItem.next_due_date,
          createdAt,
          recurringItem.expense_category_id ?? null,
          "expected",
          recurringItem.entity_id ?? null,
        ]
      );
      await upsertExpenseSuggestion({
        category: recurringItem.category,
        amount: recurringItem.amount,
        expense_category_id: recurringItem.expense_category_id ?? null,
      });
      createdRecord = await get(
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
        [result.lastID]
      );
    } else {
      const transferValidation = await validateRecurringTransferPayload(recurringItem);
      if (!transferValidation.ok) {
        return res.status(400).json({ error: transferValidation.error });
      }

      const resolvedTransfer = await resolveTransferPayload({
        body: {
          from_account_id: recurringItem.from_account_id,
          to_account_id: recurringItem.to_account_id,
          amount: recurringItem.amount,
          transfer_fee_amount: recurringItem.transfer_fee_amount ?? 0,
          date: recurringItem.next_due_date,
          notes: recurringItem.description || recurringItem.category || null,
        },
        get,
        all,
      });
      if (resolvedTransfer.error) {
        return res.status(400).json({ error: resolvedTransfer.error });
      }

      const transferId = createUuid();
      const nowIso = new Date().toISOString();
      const transferFeeExpenseId =
        Number(resolvedTransfer.payload.transferFeeCents ?? 0) > 0
          ? await createTransferFeeExpense({
              get,
              run,
              amountCents: resolvedTransfer.payload.transferFeeCents,
              spentAt: resolvedTransfer.payload.transferDate.slice(0, 10),
              entityId: transferValidation.sourceAccount.entity_id,
              fromAccountId: resolvedTransfer.payload.fromAccountId,
              transferId,
            })
          : null;
      await run(
        `
        INSERT INTO transfers (
          id,
          from_account_id,
          to_account_id,
          amount_cents,
          transfer_fee_cents,
          fee_expense_id,
          transfer_date,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          transferId,
          resolvedTransfer.payload.fromAccountId,
          resolvedTransfer.payload.toAccountId,
          resolvedTransfer.payload.amountCents,
          resolvedTransfer.payload.transferFeeCents,
          transferFeeExpenseId,
          resolvedTransfer.payload.transferDate,
          resolvedTransfer.payload.notes,
          nowIso,
          nowIso,
        ]
      );
      const transferRow = await getTransferById(get, transferId);
      createdRecord = serializeTransferRow(transferRow);

      if (transferValidation.mirrorAsIncomeExpense) {
        const expenseCreatedAt = new Date().toISOString();
        const expenseResult = await run(
          "INSERT INTO expenses (amount, category, notes, spent_at, created_at, expense_category_id, expense_expectation, entity_id, is_transfer_bookkeeping) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
          [
            recurringItem.amount,
            recurringItem.category,
            recurringItem.description || null,
            recurringItem.next_due_date,
            expenseCreatedAt,
            recurringItem.expense_category_id ?? null,
            "expected",
            transferValidation.sourceAccount.entity_id,
          ]
        );
        await upsertExpenseSuggestion({
          category: recurringItem.category,
          amount: recurringItem.amount,
          expense_category_id: recurringItem.expense_category_id ?? null,
        });
        const mirroredExpense = await get(
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

        const incomeResult = await run(
          "INSERT INTO income (amount, source, received_date, income_category_id, entity_id, is_transfer_bookkeeping) VALUES (?, ?, ?, ?, ?, 1)",
          [
            recurringItem.amount,
            recurringItem.category,
            recurringItem.next_due_date,
            recurringItem.income_category_id ?? null,
            transferValidation.destinationAccount.entity_id,
          ]
        );
        const mirroredIncome = await get(
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
          [incomeResult.lastID]
        );

        bookkeepingRecords = [
          { type: "expense", record: mirroredExpense },
          { type: "income", record: mirroredIncome },
        ];
      }
    }

    await run(
      "UPDATE recurring_items SET last_confirmed_date = ?, next_due_date = ? WHERE id = ?",
      [
        recurringItem.next_due_date,
        advanceRecurringDate(
          recurringItem.next_due_date,
          recurringItem.frequency,
          recurringItem
        ),
        id,
      ]
    );

    res.json({
      recurring_item: await getRecurringItemById(id),
      created_record: createdRecord,
      bookkeeping_records: bookkeepingRecords,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to confirm recurring item" });
  }
});

app.post("/recurring-items/:id/skip", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid recurring item id" });
  }

  try {
    const recurringItem = await getRecurringItemById(id);
    if (!recurringItem) {
      return res.status(404).json({ error: "Recurring item not found" });
    }

    await run("UPDATE recurring_items SET next_due_date = ? WHERE id = ?", [
      advanceRecurringDate(
        recurringItem.next_due_date,
        recurringItem.frequency,
        recurringItem
      ),
      id,
    ]);

    res.json(await getRecurringItemById(id));
  } catch (err) {
    res.status(500).json({ error: "Failed to skip recurring item" });
  }
});

registerReportRoutes(app, {
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
});

registerReferenceDataRoutes(app, {
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
});

registerProjectionScenarioRoutes(app, {
  all,
  get,
  run,
  DEFAULT_PROJECTION_WORKSPACE_ID,
  getEntityById,
  mapProjectionScenarioRow,
  buildProjectionResultForScenario,
  buildProjectionResultSummary,
  resolveWriteEntityId,
  validateProjectionCashflowAssumptionsReferences,
  createUuid,
  buildProjectionResponsePayload,
});

app.use((err, req, res, next) => {
  const status = err?.status || 500;
  console.error("[ERROR]", err);
  res.status(status).json({
    error: err?.message || "Internal Server Error",
  });
});

init()
  .then(async () => {
    try {
      const startupResult = await ensureMonthlyReportsForClosedMonths();
      if (startupResult.generated.length > 0) {
        console.log(
          `Generated monthly reports: ${startupResult.generated.join(", ")}`
        );
      }
    } catch (err) {
      console.error("Failed to auto-generate monthly reports:", err);
    }
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
