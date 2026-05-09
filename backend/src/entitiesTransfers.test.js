const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "finance-entities-transfers-"));
const dbPath = path.join(tmpDir, "finance.test.db");
const port = 43000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;

let serverProcess = null;
let serverExit = null;
let institutionsCache = null;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function request(pathname, { method = "GET", body } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = text;
    }
  }

  return {
    status: res.status,
    data,
  };
}

function assertMoneyEqual(actual, expected, message = "Unexpected money value") {
  const actualNumber = Number(actual);
  const expectedNumber = Number(expected);
  assert.ok(Number.isFinite(actualNumber), `${message}: actual is not numeric`);
  assert.ok(Number.isFinite(expectedNumber), `${message}: expected is not numeric`);
  assert.ok(
    Math.abs(actualNumber - expectedNumber) <= 0.0001,
    `${message}: expected ${expectedNumber}, got ${actualNumber}`
  );
}

function randomName(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function waitForServerReady() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (serverExit) {
      throw new Error(`Server exited before ready (code ${serverExit.code})`);
    }
    try {
      const response = await request("/entities");
      if (response.status === 200) {
        return;
      }
    } catch (err) {
      // keep waiting
    }
    await sleep(150);
  }
  throw new Error("Timed out waiting for test server to start");
}

async function getEntitiesByType() {
  const response = await request("/entities");
  assert.equal(response.status, 200);
  const byType = new Map((response.data || []).map((item) => [item.type, item]));
  assert.ok(byType.has("personal"));
  assert.ok(byType.has("family"));
  assert.ok(byType.has("business"));
  return byType;
}

async function getInstitutions() {
  if (Array.isArray(institutionsCache)) {
    return institutionsCache;
  }
  const response = await request("/institutions");
  assert.equal(response.status, 200);
  institutionsCache = Array.isArray(response.data) ? response.data : [];
  return institutionsCache;
}

async function getInstitutionForAccountType(type) {
  const institutions = await getInstitutions();
  const institutionType =
    type === "bank" ? "bank" : type === "ewallet" ? "e_wallet" : null;
  if (!institutionType) {
    return null;
  }
  const institution =
    institutions.find((item) => item.code === "BPI" && item.type === institutionType) ||
    institutions.find((item) => item.code === "GCASH" && item.type === institutionType) ||
    institutions.find((item) => item.type === institutionType) ||
    null;
  assert.ok(institution, `Missing institution for account type ${type}`);
  return institution;
}

async function createAccount({
  name,
  type = "cash",
  entityId,
  institutionId,
  currencyCode,
} = {}) {
  const resolvedInstitutionId =
    institutionId !== undefined
      ? institutionId
      : type === "bank" || type === "ewallet"
        ? (await getInstitutionForAccountType(type)).id
        : null;
  const response = await request("/accounts", {
    method: "POST",
    body: {
      name,
      type,
      entity_id: entityId,
      institution_id: resolvedInstitutionId,
      currency_code: currencyCode,
    },
  });
  assert.equal(response.status, 201, `Failed to create account: ${JSON.stringify(response.data)}`);
  return response.data;
}

async function createEntity({ name, type }) {
  const response = await request("/entities", {
    method: "POST",
    body: { name, type },
  });
  assert.equal(response.status, 201, `Failed to create entity: ${JSON.stringify(response.data)}`);
  return response.data;
}

async function getAccountsById() {
  const response = await request("/accounts");
  assert.equal(response.status, 200);
  return new Map((response.data || []).map((item) => [Number(item.id), item]));
}

test("seed data no longer creates generic personal Bank account", async () => {
  const response = await request("/accounts");
  assert.equal(response.status, 200);

  const legacyBank = (response.data || []).find(
    (item) => item.name === "Bank" && item.type === "bank"
  );
  assert.equal(legacyBank, undefined);
});

test("bank and ewallet accounts require matching institutions", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;
  const bankInstitution = await getInstitutionForAccountType("bank");
  const walletInstitution = await getInstitutionForAccountType("ewallet");

  let response = await request("/accounts", {
    method: "POST",
    body: {
      name: randomName("bank-without-inst"),
      type: "bank",
      entity_id: personalEntityId,
    },
  });
  assert.equal(response.status, 400);

  response = await request("/accounts", {
    method: "POST",
    body: {
      name: randomName("cash-with-inst"),
      type: "cash",
      entity_id: personalEntityId,
      institution_id: bankInstitution.id,
    },
  });
  assert.equal(response.status, 400);

  response = await request("/accounts", {
    method: "POST",
    body: {
      name: randomName("wallet-wrong-inst"),
      type: "ewallet",
      entity_id: personalEntityId,
      institution_id: bankInstitution.id,
    },
  });
  assert.equal(response.status, 400);

  response = await request("/accounts", {
    method: "POST",
    body: {
      name: randomName("wallet-correct-inst"),
      type: "ewallet",
      entity_id: personalEntityId,
      institution_id: walletInstitution.id,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.institution?.id, walletInstitution.id);
  assert.equal(response.data.institution?.type, "e_wallet");
});

test("accounts support custom currency codes and reject cross-currency transfers", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;

  const usdCash = await createAccount({
    name: randomName("usd-cash"),
    type: "cash",
    entityId: personalEntityId,
    currencyCode: "USD",
  });
  assert.equal(usdCash.currency_code, "USD");

  const vndCash = await createAccount({
    name: randomName("vnd-cash"),
    type: "cash",
    entityId: personalEntityId,
    currencyCode: "VND",
  });
  assert.equal(vndCash.currency_code, "VND");

  let response = await request(`/accounts/${usdCash.id}`, {
    method: "PUT",
    body: {
      currency_code: "USD",
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.currency_code, "USD");

  response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 100,
      to_account_id: usdCash.id,
      created_at: "2026-04-12",
      note: "USD top-up",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: usdCash.id,
      to_account_id: vndCash.id,
      amount: 25,
      date: "2026-04-13",
      notes: "cross currency should fail",
    },
  });
  assert.equal(response.status, 400, JSON.stringify(response.data));
  assert.equal(response.data.error, "Transfer requires accounts with the same currency");
});

test("account names are unique per entity, not globally", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;
  const businessEntityId = entitiesByType.get("business").id;
  const sharedName = randomName("shared-account-name");

  const personalAccount = await createAccount({
    name: sharedName,
    type: "cash",
    entityId: personalEntityId,
  });
  const businessAccount = await createAccount({
    name: sharedName,
    type: "cash",
    entityId: businessEntityId,
  });

  assert.equal(personalAccount.name, sharedName);
  assert.equal(businessAccount.name, sharedName);

  const duplicate = await request("/accounts", {
    method: "POST",
    body: {
      name: sharedName,
      type: "cash",
      entity_id: personalEntityId,
    },
  });
  assert.equal(duplicate.status, 409);
});

test("initial balance is its own transaction type and increases account balance", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;
  const account = await createAccount({
    name: randomName("initial-balance-account"),
    type: "cash",
    entityId: personalEntityId,
  });

  const response = await request("/transactions", {
    method: "POST",
    body: {
      type: "initial_balance",
      amount: 321.45,
      to_account_id: account.id,
      created_at: "2026-04-12",
      note: "Opening balance",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.type, "initial_balance");

  const accountsById = await getAccountsById();
  assertMoneyEqual(accountsById.get(account.id).balance, 321.45);
});

test.before(async () => {
  serverProcess = spawn("node", ["src/server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(port),
      FINANCE_DB_PATH: dbPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.on("exit", (code, signal) => {
    serverExit = { code, signal };
  });

  await waitForServerReady();
});

test.after(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
    await sleep(300);
    if (!serverProcess.killed) {
      serverProcess.kill("SIGKILL");
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("same-entity transfer updates source and destination balances", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;

  const cash = await createAccount({
    name: randomName("same-entity-cash"),
    type: "cash",
    entityId: personalEntityId,
    currencyCode: "PHP",
  });
  const bank = await createAccount({
    name: randomName("same-entity-bank"),
    type: "bank",
    entityId: personalEntityId,
    currencyCode: "PHP",
  });

  const before = await getAccountsById();

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 500,
      to_account_id: cash.id,
      created_at: "2026-04-10",
      category: "seed",
      note: "test top-up",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: cash.id,
      to_account_id: bank.id,
      amount: 200,
      date: "2026-04-11",
      notes: "same entity move",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  const after = await getAccountsById();
  assertMoneyEqual(
    after.get(cash.id).balance,
    Number(before.get(cash.id).balance) + 500 - 200,
    "Cash balance mismatch"
  );
  assertMoneyEqual(
    after.get(bank.id).balance,
    Number(before.get(bank.id).balance) + 200,
    "Bank balance mismatch"
  );
});

test("cross-entity transfer can mirror into expense and income categories", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;
  const businessEntityId = entitiesByType.get("business").id;

  const expenseCategoryResponse = await request("/categories", {
    method: "POST",
    body: {
      name: randomName("transfer-expense-category"),
      color: "#F59E0B",
    },
  });
  assert.equal(expenseCategoryResponse.status, 201, JSON.stringify(expenseCategoryResponse.data));

  const incomeCategoryResponse = await request("/income-categories", {
    method: "POST",
    body: {
      name: randomName("transfer-income-category"),
      color: "#10B981",
    },
  });
  assert.equal(incomeCategoryResponse.status, 201, JSON.stringify(incomeCategoryResponse.data));

  const familySource = await createAccount({
    name: randomName("mapped-transfer-family-source"),
    type: "cash",
    entityId: familyEntityId,
    currencyCode: "PHP",
  });
  const businessDestination = await createAccount({
    name: randomName("mapped-transfer-business-destination"),
    type: "bank",
    entityId: businessEntityId,
    currencyCode: "PHP",
  });

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 750,
      to_account_id: familySource.id,
      created_at: "2026-04-19",
      note: "seed mapped transfer source",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: familySource.id,
      to_account_id: businessDestination.id,
      amount: 300,
      date: "2026-04-20",
      notes: "capital support transfer",
      mirror_as_income_expense: true,
      expense_category_id: expenseCategoryResponse.data.id,
      income_category_id: incomeCategoryResponse.data.id,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.mirror_as_income_expense, true);
  assert.equal(response.data.expense_category_id, expenseCategoryResponse.data.id);
  assert.equal(response.data.income_category_id, incomeCategoryResponse.data.id);

  const transferId = response.data.id;

  const familyExpenses = await request(
    `/expenses?entity_id=${encodeURIComponent(familyEntityId)}`
  );
  const businessIncome = await request(
    `/income?entity_id=${encodeURIComponent(businessEntityId)}`
  );
  assert.equal(familyExpenses.status, 200, JSON.stringify(familyExpenses.data));
  assert.equal(businessIncome.status, 200, JSON.stringify(businessIncome.data));

  const mirroredExpense = (familyExpenses.data || []).find(
    (item) =>
      item.notes === "capital support transfer" &&
      item.expense_category_id === expenseCategoryResponse.data.id &&
      String(item.spent_at).slice(0, 10) === "2026-04-20" &&
      Number(item.amount) === 300
  );
  const mirroredIncome = (businessIncome.data || []).find(
    (item) =>
      item.source === "capital support transfer" &&
      item.income_category_id === incomeCategoryResponse.data.id &&
      String(item.received_date).slice(0, 10) === "2026-04-20" &&
      Number(item.amount) === 300
  );
  assert.ok(mirroredExpense, "Expected mirrored expense row for mapped transfer");
  assert.ok(mirroredIncome, "Expected mirrored income row for mapped transfer");

  response = await request(
    `/transfers/${encodeURIComponent(String(transferId))}?source_type=transfer`,
    {
      method: "DELETE",
    }
  );
  assert.equal(response.status, 200, JSON.stringify(response.data));

  const familyExpensesAfterDelete = await request(
    `/expenses?entity_id=${encodeURIComponent(familyEntityId)}`
  );
  const businessIncomeAfterDelete = await request(
    `/income?entity_id=${encodeURIComponent(businessEntityId)}`
  );
  assert.equal(
    familyExpensesAfterDelete.status,
    200,
    JSON.stringify(familyExpensesAfterDelete.data)
  );
  assert.equal(
    businessIncomeAfterDelete.status,
    200,
    JSON.stringify(businessIncomeAfterDelete.data)
  );
  assert.equal(
    (familyExpensesAfterDelete.data || []).some((item) => item.id === mirroredExpense.id),
    false
  );
  assert.equal(
    (businessIncomeAfterDelete.data || []).some((item) => item.id === mirroredIncome.id),
    false
  );
});

test("transfer fee creates a bank fee expense and is reversed when transfer is deleted", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;

  const cash = await createAccount({
    name: randomName("transfer-fee-cash"),
    type: "cash",
    entityId: personalEntityId,
    currencyCode: "PHP",
  });
  const bank = await createAccount({
    name: randomName("transfer-fee-bank"),
    type: "bank",
    entityId: personalEntityId,
    currencyCode: "PHP",
  });

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 500,
      to_account_id: cash.id,
      created_at: "2026-04-12",
      note: "seed transfer fee cash",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: cash.id,
      to_account_id: bank.id,
      amount: 200,
      transfer_fee_amount: 25,
      date: "2026-04-13",
      notes: "transfer with fee",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.transfer_fee_amount, 25);
  assert.ok(response.data.fee_expense_id);

  let accountsAfter = await getAccountsById();
  assertMoneyEqual(accountsAfter.get(cash.id).balance, 275);
  assertMoneyEqual(accountsAfter.get(bank.id).balance, 200);

  const expenses = await request(
    `/expenses?entity_id=${encodeURIComponent(personalEntityId)}`
  );
  assert.equal(expenses.status, 200, JSON.stringify(expenses.data));
  const feeExpense = (expenses.data || []).find(
    (item) =>
      Number(item.id) === Number(response.data.fee_expense_id) &&
      Number(item.amount) === 25 &&
      item.expense_category_name === "Misc - Bank Fees" &&
      item.from_account_id === cash.id
  );
  assert.ok(feeExpense, "Expected transfer fee expense row");

  const removeResponse = await request(
    `/transfers/${encodeURIComponent(String(response.data.id))}?source_type=transfer`,
    {
      method: "DELETE",
    }
  );
  assert.equal(removeResponse.status, 200, JSON.stringify(removeResponse.data));

  accountsAfter = await getAccountsById();
  assertMoneyEqual(accountsAfter.get(cash.id).balance, 500);
  assertMoneyEqual(accountsAfter.get(bank.id).balance, 0);
});

test("entity CRUD supports multiple business entities", async () => {
  const businessA = await createEntity({
    name: randomName("biz-entity-a"),
    type: "business",
  });
  const businessB = await createEntity({
    name: randomName("biz-entity-b"),
    type: "business",
  });

  assert.equal(businessA.type, "business");
  assert.equal(businessB.type, "business");
  assert.notEqual(String(businessA.id), String(businessB.id));

  const renamed = await request(`/entities/${encodeURIComponent(String(businessA.id))}`, {
    method: "PUT",
    body: {
      name: `${businessA.name}-renamed`,
      type: "business",
    },
  });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
  assert.equal(renamed.data.name, `${businessA.name}-renamed`);
  assert.equal(renamed.data.type, "business");

  const removed = await request(`/entities/${encodeURIComponent(String(businessB.id))}`, {
    method: "DELETE",
  });
  assert.equal(removed.status, 200, JSON.stringify(removed.data));
  assert.equal(removed.data.ok, true);
});

test("cross-entity transfer does not create income/expense rows and updates both balances", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;
  const businessEntityId = entitiesByType.get("business").id;

  const personalAccount = await createAccount({
    name: randomName("cross-entity-personal"),
    type: "cash",
    entityId: personalEntityId,
    currencyCode: "PHP",
  });
  const businessAccount = await createAccount({
    name: randomName("cross-entity-business"),
    type: "bank",
    entityId: businessEntityId,
    currencyCode: "PHP",
  });

  const before = await getAccountsById();
  const incomeBefore = await request("/income");
  const expensesBefore = await request("/expenses");
  assert.equal(incomeBefore.status, 200);
  assert.equal(expensesBefore.status, 200);

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 700,
      to_account_id: personalAccount.id,
      created_at: "2026-04-12",
      category: "seed",
      note: "cross-entity top-up",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: personalAccount.id,
      to_account_id: businessAccount.id,
      amount: 500,
      date: "2026-04-13",
      notes: "personal to business",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  const incomeAfter = await request("/income");
  const expensesAfter = await request("/expenses");
  assert.equal(incomeAfter.status, 200);
  assert.equal(expensesAfter.status, 200);
  assert.equal(incomeAfter.data.length, incomeBefore.data.length);
  assert.equal(expensesAfter.data.length, expensesBefore.data.length);

  const after = await getAccountsById();
  assertMoneyEqual(
    after.get(personalAccount.id).balance,
    Number(before.get(personalAccount.id).balance) + 700 - 500,
    "Personal account balance mismatch"
  );
  assertMoneyEqual(
    after.get(businessAccount.id).balance,
    Number(before.get(businessAccount.id).balance) + 500,
    "Business account balance mismatch"
  );
});

test("recurring transfer can mirror source expense and destination income across entities", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;
  const businessEntityId = entitiesByType.get("business").id;

  const familyAccount = await createAccount({
    name: randomName("recurring-transfer-family"),
    type: "cash",
    entityId: familyEntityId,
    currencyCode: "PHP",
  });
  const businessDefaultAccount = await createAccount({
    name: randomName("recurring-transfer-business-default"),
    type: "cash",
    entityId: businessEntityId,
    currencyCode: "PHP",
  });
  const businessReceivingAccount = await createAccount({
    name: randomName("recurring-transfer-business-receiving"),
    type: "cash",
    entityId: businessEntityId,
    currencyCode: "PHP",
  });

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 600,
      to_account_id: familyAccount.id,
      created_at: "2026-04-18",
      note: "Seed recurring transfer source",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/recurring-items", {
    method: "POST",
    body: {
      type: "transfer",
      amount: 200,
      category: "Family support",
      from_account_id: familyAccount.id,
      to_account_id: businessReceivingAccount.id,
      mirror_as_income_expense: true,
      frequency: "monthly",
      next_due_date: "2026-05-01",
      description: "Recurring cross-entity transfer",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.type, "transfer");
  assert.equal(response.data.entity_id, familyEntityId);

  const recurringId = response.data.id;
  response = await request(`/recurring-items/${recurringId}/confirm`, {
    method: "POST",
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.created_record?.source_type, "transfer");
  assert.equal(response.data.created_record?.from_account_id, familyAccount.id);
  assert.equal(response.data.created_record?.to_account_id, businessReceivingAccount.id);
  assert.equal(response.data.bookkeeping_records?.length, 2);

  const accountsAfter = await getAccountsById();
  assertMoneyEqual(accountsAfter.get(familyAccount.id).balance, 400);
  assertMoneyEqual(accountsAfter.get(businessDefaultAccount.id).balance, 0);
  assertMoneyEqual(accountsAfter.get(businessReceivingAccount.id).balance, 200);

  const familyExpenses = await request(
    `/expenses?entity_id=${encodeURIComponent(familyEntityId)}`
  );
  const businessIncome = await request(
    `/income?entity_id=${encodeURIComponent(businessEntityId)}`
  );
  assert.equal(familyExpenses.status, 200, JSON.stringify(familyExpenses.data));
  assert.equal(businessIncome.status, 200, JSON.stringify(businessIncome.data));

  const mirroredExpense = (familyExpenses.data || []).find(
    (item) =>
      item.name === "Family support" &&
      String(item.spent_at).slice(0, 10) === "2026-05-01" &&
      Number(item.amount) === 200
  );
  const mirroredIncome = (businessIncome.data || []).find(
    (item) =>
      item.source === "Family support" &&
      String(item.received_date).slice(0, 10) === "2026-05-01" &&
      Number(item.amount) === 200
  );
  assert.ok(mirroredExpense, "Expected mirrored expense row");
  assert.ok(mirroredIncome, "Expected mirrored income row");

  const recurringItems = await request(
    `/recurring-items?entity_id=${encodeURIComponent(familyEntityId)}`
  );
  assert.equal(recurringItems.status, 200, JSON.stringify(recurringItems.data));
  const updatedRecurring = (recurringItems.data || []).find((item) => item.id === recurringId);
  assert.ok(updatedRecurring, "Expected recurring transfer row");
  assert.equal(updatedRecurring.last_confirmed_date, "2026-05-01");
  assert.equal(updatedRecurring.next_due_date, "2026-06-01");

  const destinationRecurringItems = await request(
    `/recurring-items?entity_id=${encodeURIComponent(businessEntityId)}`
  );
  assert.equal(
    destinationRecurringItems.status,
    200,
    JSON.stringify(destinationRecurringItems.data)
  );
  const destinationVisibleRecurring = (destinationRecurringItems.data || []).find(
    (item) => item.id === recurringId
  );
  assert.ok(destinationVisibleRecurring, "Expected destination entity to see recurring transfer");
});

test("recurring transfer fee creates a bank fee expense on confirm", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;

  const familySource = await createAccount({
    name: randomName("recurring-fee-source"),
    type: "cash",
    entityId: familyEntityId,
    currencyCode: "PHP",
  });
  const familyDestination = await createAccount({
    name: randomName("recurring-fee-destination"),
    type: "bank",
    entityId: familyEntityId,
    currencyCode: "PHP",
  });

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 400,
      to_account_id: familySource.id,
      created_at: "2026-04-18",
      note: "seed recurring transfer fee source",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/recurring-items", {
    method: "POST",
    body: {
      type: "transfer",
      amount: 150,
      transfer_fee_amount: 10,
      category: "Savings move",
      from_account_id: familySource.id,
      to_account_id: familyDestination.id,
      frequency: "monthly",
      next_due_date: "2026-05-05",
      description: "Recurring transfer with fee",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.transfer_fee_amount, 10);

  response = await request(`/recurring-items/${response.data.id}/confirm`, {
    method: "POST",
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.created_record?.transfer_fee_amount, 10);
  assert.ok(response.data.created_record?.fee_expense_id);

  const accountsAfter = await getAccountsById();
  assertMoneyEqual(accountsAfter.get(familySource.id).balance, 240);
  assertMoneyEqual(accountsAfter.get(familyDestination.id).balance, 150);

  const familyExpenses = await request(
    `/expenses?entity_id=${encodeURIComponent(familyEntityId)}`
  );
  assert.equal(familyExpenses.status, 200, JSON.stringify(familyExpenses.data));
  const feeExpense = (familyExpenses.data || []).find(
    (item) =>
      Number(item.id) === Number(response.data.created_record?.fee_expense_id) &&
      Number(item.amount) === 10 &&
      item.expense_category_name === "Misc - Bank Fees" &&
      item.from_account_id === familySource.id
  );
  assert.ok(feeExpense, "Expected recurring transfer fee expense row");
});

test("cannot delete an entity that still has accounts", async () => {
  const entity = await createEntity({
    name: randomName("locked-entity"),
    type: "business",
  });
  await createAccount({
    name: randomName("locked-entity-account"),
    type: "bank",
    entityId: entity.id,
  });

  const response = await request(`/entities/${encodeURIComponent(String(entity.id))}`, {
    method: "DELETE",
  });
  assert.equal(response.status, 400);
  assert.equal(
    response.data.error,
    "Move or remove accounts in this entity before deleting it"
  );
});

test("transfer to the same account is rejected", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;

  const account = await createAccount({
    name: randomName("same-account-check"),
    type: "cash",
    entityId: personalEntityId,
  });

  const response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: account.id,
      to_account_id: account.id,
      amount: 10,
      date: "2026-04-14",
    },
  });

  assert.equal(response.status, 400);
  assert.equal(response.data.error, "Transfer must use two different accounts");
});

test("can remove both transfer records and legacy transfer transactions", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;

  const fromAccount = await createAccount({
    name: randomName("remove-transfer-from"),
    type: "bank",
    entityId: familyEntityId,
    currencyCode: "PHP",
  });
  const toAccount = await createAccount({
    name: randomName("remove-transfer-to"),
    type: "cash",
    entityId: familyEntityId,
    currencyCode: "PHP",
  });

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 500,
      to_account_id: fromAccount.id,
      created_at: "2026-04-15",
      category: "seed",
      note: "seed for transfer removal",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  const beforeTransfer = await getAccountsById();

  response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: fromAccount.id,
      to_account_id: toAccount.id,
      amount: 200,
      date: "2026-04-16",
      notes: "to delete transfer row",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const transferId = response.data.id;

  response = await request(
    `/transfers/${encodeURIComponent(String(transferId))}?source_type=transfer`,
    {
      method: "DELETE",
    }
  );
  assert.equal(response.status, 200, JSON.stringify(response.data));

  const afterTransferDelete = await getAccountsById();
  assertMoneyEqual(
    afterTransferDelete.get(fromAccount.id).balance,
    beforeTransfer.get(fromAccount.id).balance,
    "Source account mismatch after transfer-row delete"
  );
  assertMoneyEqual(
    afterTransferDelete.get(toAccount.id).balance,
    beforeTransfer.get(toAccount.id).balance,
    "Destination account mismatch after transfer-row delete"
  );

  response = await request("/transactions", {
    method: "POST",
    body: {
      type: "transfer",
      amount: 120,
      from_account_id: fromAccount.id,
      to_account_id: toAccount.id,
      created_at: "2026-04-17",
      category: null,
      note: "legacy transfer to delete",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const legacyTransferId = response.data.id;

  response = await request(
    `/transfers/${encodeURIComponent(
      String(legacyTransferId)
    )}?source_type=legacy_transaction`,
    {
      method: "DELETE",
    }
  );
  assert.equal(response.status, 200, JSON.stringify(response.data));

  const transferList = await request("/transfers");
  assert.equal(transferList.status, 200, JSON.stringify(transferList.data));
  const hasLegacyTransfer = (transferList.data || []).some(
    (item) => String(item.id) === String(legacyTransferId)
  );
  assert.equal(hasLegacyTransfer, false);
});

test("balance integrity holds with income + expense + multiple transfers", async () => {
  const entitiesByType = await getEntitiesByType();
  const personalEntityId = entitiesByType.get("personal").id;
  const businessEntityId = entitiesByType.get("business").id;

  const personalAccount = await createAccount({
    name: randomName("integrity-personal"),
    type: "cash",
    entityId: personalEntityId,
    currencyCode: "PHP",
  });
  const businessAccount = await createAccount({
    name: randomName("integrity-business"),
    type: "bank",
    entityId: businessEntityId,
    currencyCode: "PHP",
  });

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "income",
      amount: 1000,
      to_account_id: personalAccount.id,
      created_at: "2026-04-15",
      category: "salary",
      note: "integrity income",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transactions", {
    method: "POST",
    body: {
      type: "expense",
      amount: 175,
      from_account_id: personalAccount.id,
      created_at: "2026-04-16",
      category: "bills",
      note: "integrity expense",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: personalAccount.id,
      to_account_id: businessAccount.id,
      amount: 300,
      date: "2026-04-17",
      notes: "new transfer out",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transfers", {
    method: "POST",
    body: {
      from_account_id: businessAccount.id,
      to_account_id: personalAccount.id,
      amount: 25,
      date: "2026-04-18",
      notes: "new transfer in",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transactions", {
    method: "POST",
    body: {
      type: "transfer",
      amount: 50,
      from_account_id: personalAccount.id,
      to_account_id: businessAccount.id,
      created_at: "2026-04-19",
      category: null,
      note: "legacy transfer out",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  const accountsById = await getAccountsById();
  assertMoneyEqual(accountsById.get(personalAccount.id).balance, 500, "Personal integrity mismatch");
  assertMoneyEqual(accountsById.get(businessAccount.id).balance, 325, "Business integrity mismatch");
});

test("account balances include legacy income and expense flows", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;

  const familyBank = await createAccount({
    name: randomName("legacy-family-bank"),
    type: "bank",
    entityId: familyEntityId,
  });

  let response = await request("/settings/default-accounts", {
    method: "PUT",
    body: {
      default_income_account_id: familyBank.id,
      default_expense_account_id: familyBank.id,
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));

  const before = await getAccountsById();
  const beforeBalance = Number(before.get(familyBank.id)?.balance ?? 0);

  response = await request("/income", {
    method: "POST",
    body: {
      amount: 1234.56,
      source: "legacy-income-balance-test",
      received_date: "2026-04-20",
      entity_id: familyEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/expenses", {
    method: "POST",
    body: {
      amount: 234.56,
      name: "legacy-expense-balance-test",
      spent_at: "2026-04-21",
      entity_id: familyEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  const after = await getAccountsById();
  const afterBalance = Number(after.get(familyBank.id)?.balance ?? 0);
  assertMoneyEqual(
    afterBalance,
    beforeBalance + 1000,
    "Legacy income/expense were not reflected in account balance"
  );
});

test("entity-scoped default accounts are used for new legacy income and expense rows", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;
  const businessEntityId = entitiesByType.get("business").id;

  const familyExpenseAccount = await createAccount({
    name: randomName("family-expense-default"),
    type: "cash",
    entityId: familyEntityId,
  });
  const familyIncomeAccount = await createAccount({
    name: randomName("family-income-default"),
    type: "bank",
    entityId: familyEntityId,
  });
  const businessExpenseAccount = await createAccount({
    name: randomName("business-expense-default"),
    type: "cash",
    entityId: businessEntityId,
  });
  const businessIncomeAccount = await createAccount({
    name: randomName("business-income-default"),
    type: "bank",
    entityId: businessEntityId,
  });

  let response = await request("/settings/default-accounts", {
    method: "PUT",
    body: {
      entity_id: familyEntityId,
      default_income_account_id: familyIncomeAccount.id,
      default_expense_account_id: familyExpenseAccount.id,
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));

  response = await request("/settings/default-accounts", {
    method: "PUT",
    body: {
      entity_id: businessEntityId,
      default_income_account_id: businessIncomeAccount.id,
      default_expense_account_id: businessExpenseAccount.id,
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));

  response = await request("/income", {
    method: "POST",
    body: {
      amount: 500,
      source: "family-default-income",
      received_date: "2026-04-25",
      entity_id: familyEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.to_account_id, familyIncomeAccount.id);

  response = await request("/expenses", {
    method: "POST",
    body: {
      amount: 125,
      name: "business-default-expense",
      spent_at: "2026-04-25",
      entity_id: businessEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.from_account_id, businessExpenseAccount.id);
});

test("editing expense account moves the deduction to the selected account", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;

  const primaryAccount = await createAccount({
    name: randomName("expense-edit-primary"),
    type: "cash",
    entityId: familyEntityId,
  });
  const secondaryAccount = await createAccount({
    name: randomName("expense-edit-secondary"),
    type: "bank",
    entityId: familyEntityId,
  });

  let response = await request("/transactions", {
    method: "POST",
    body: {
      type: "initial_balance",
      amount: 1000,
      to_account_id: primaryAccount.id,
      created_at: "2026-04-01",
      note: "seed primary",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/transactions", {
    method: "POST",
    body: {
      type: "initial_balance",
      amount: 500,
      to_account_id: secondaryAccount.id,
      created_at: "2026-04-01",
      note: "seed secondary",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/settings/default-accounts", {
    method: "PUT",
    body: {
      entity_id: familyEntityId,
      default_expense_account_id: primaryAccount.id,
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));

  response = await request("/expenses", {
    method: "POST",
    body: {
      amount: 100,
      name: "move-me-expense",
      spent_at: "2026-04-20",
      entity_id: familyEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.from_account_id, primaryAccount.id);

  let accountsAfter = await getAccountsById();
  assertMoneyEqual(accountsAfter.get(primaryAccount.id).balance, 900);
  assertMoneyEqual(accountsAfter.get(secondaryAccount.id).balance, 500);

  response = await request(`/expenses/${response.data.id}`, {
    method: "PUT",
    body: {
      amount: 100,
      name: "move-me-expense",
      spent_at: "2026-04-20",
      from_account_id: secondaryAccount.id,
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.from_account_id, secondaryAccount.id);

  accountsAfter = await getAccountsById();
  assertMoneyEqual(accountsAfter.get(primaryAccount.id).balance, 1000);
  assertMoneyEqual(accountsAfter.get(secondaryAccount.id).balance, 400);
});

test("account ledger reflects legacy income and expense removal", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;

  const account = await createAccount({
    name: randomName("legacy-ledger-account"),
    type: "cash",
    entityId: familyEntityId,
  });

  let response = await request("/income", {
    method: "POST",
    body: {
      amount: 300,
      source: "ledger-income-remove",
      received_date: "2026-04-25",
      entity_id: familyEntityId,
      to_account_id: account.id,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const incomeId = response.data.id;

  response = await request("/expenses", {
    method: "POST",
    body: {
      amount: 80,
      name: "ledger-expense-remove",
      spent_at: "2026-04-26",
      entity_id: familyEntityId,
      from_account_id: account.id,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const expenseId = response.data.id;

  response = await request(`/transactions?account_id=${account.id}`);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  let incomeLedgerRow = (response.data || []).find(
    (item) => item.source_type === "legacy_income" && String(item.id) === `income:${incomeId}`
  );
  let expenseLedgerRow = (response.data || []).find(
    (item) => item.source_type === "legacy_expense" && String(item.id) === `expense:${expenseId}`
  );
  assert.ok(incomeLedgerRow, "Expected legacy income row in account ledger");
  assert.ok(expenseLedgerRow, "Expected legacy expense row in account ledger");

  response = await request(`/expenses/${expenseId}`, { method: "DELETE" });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  response = await request(`/income/${incomeId}`, { method: "DELETE" });
  assert.equal(response.status, 200, JSON.stringify(response.data));

  response = await request(`/transactions?account_id=${account.id}`);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  incomeLedgerRow = (response.data || []).find(
    (item) => item.source_type === "legacy_income" && String(item.id) === `income:${incomeId}`
  );
  expenseLedgerRow = (response.data || []).find(
    (item) => item.source_type === "legacy_expense" && String(item.id) === `expense:${expenseId}`
  );
  assert.equal(incomeLedgerRow, undefined);
  assert.equal(expenseLedgerRow, undefined);
});

test("monthly reports are filtered per entity", async () => {
  const entitiesByType = await getEntitiesByType();
  const familyEntityId = entitiesByType.get("family").id;
  const businessEntityId = entitiesByType.get("business").id;
  const monthKey = "2025-11";

  let response = await request("/income", {
    method: "POST",
    body: {
      amount: 111,
      source: "family-report-income",
      received_date: `${monthKey}-02`,
      entity_id: familyEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/expenses", {
    method: "POST",
    body: {
      amount: 11,
      name: "family-report-expense",
      spent_at: `${monthKey}-03`,
      entity_id: familyEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/income", {
    method: "POST",
    body: {
      amount: 222,
      source: "business-report-income",
      received_date: `${monthKey}-05`,
      entity_id: businessEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request("/expenses", {
    method: "POST",
    body: {
      amount: 22,
      name: "business-report-expense",
      spent_at: `${monthKey}-06`,
      entity_id: businessEntityId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request(
    `/monthly-reports/generate?entity_id=${encodeURIComponent(familyEntityId)}`,
    {
      method: "POST",
      body: { month_key: monthKey },
    }
  );
  assert.equal(response.status, 201, JSON.stringify(response.data));

  response = await request(
    `/monthly-reports/generate?entity_id=${encodeURIComponent(businessEntityId)}`,
    {
      method: "POST",
      body: { month_key: monthKey },
    }
  );
  assert.equal(response.status, 201, JSON.stringify(response.data));

  const familyDetail = await request(
    `/monthly-reports/${monthKey}?entity_id=${encodeURIComponent(familyEntityId)}`
  );
  const businessDetail = await request(
    `/monthly-reports/${monthKey}?entity_id=${encodeURIComponent(businessEntityId)}`
  );
  assert.equal(familyDetail.status, 200, JSON.stringify(familyDetail.data));
  assert.equal(businessDetail.status, 200, JSON.stringify(businessDetail.data));

  assertMoneyEqual(
    familyDetail.data?.report?.summary?.income,
    111,
    "Family monthly report income mismatch"
  );
  assertMoneyEqual(
    familyDetail.data?.report?.summary?.expenses,
    11,
    "Family monthly report expense mismatch"
  );
  assertMoneyEqual(
    businessDetail.data?.report?.summary?.income,
    222,
    "Business monthly report income mismatch"
  );
  assertMoneyEqual(
    businessDetail.data?.report?.summary?.expenses,
    22,
    "Business monthly report expense mismatch"
  );

  const familyList = await request(
    `/monthly-reports?entity_id=${encodeURIComponent(familyEntityId)}`
  );
  const businessList = await request(
    `/monthly-reports?entity_id=${encodeURIComponent(businessEntityId)}`
  );
  assert.equal(familyList.status, 200, JSON.stringify(familyList.data));
  assert.equal(businessList.status, 200, JSON.stringify(businessList.data));

  const familyMonth = (familyList.data?.items || []).find(
    (item) => item.month_key === monthKey
  );
  const businessMonth = (businessList.data?.items || []).find(
    (item) => item.month_key === monthKey
  );
  assert.ok(familyMonth);
  assert.ok(businessMonth);
  assertMoneyEqual(familyMonth.summary?.income, 111, "Family list income mismatch");
  assertMoneyEqual(businessMonth.summary?.income, 222, "Business list income mismatch");
});
