const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { approveCandidate } = require("./imports/approveCandidate");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "finance-imports-"));
const dbPath = path.join(tmpDir, "finance-imports.test.db");
const port = 45000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;

let serverProcess = null;
let serverExit = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

function escapePdfText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createPdfBuffer(lines) {
  const contentLines = ["BT", "/F1 12 Tf", "50 750 Td"];
  lines.forEach((line, index) => {
    if (index > 0) {
      contentLines.push("0 -16 Td");
    }
    contentLines.push(`(${escapePdfText(line)}) Tj`);
  });
  contentLines.push("ET");
  const streamContent = contentLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(streamContent, "utf8")} >>\nstream\n${streamContent}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  let cursor = chunks[0].length;
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(cursor);
    const chunk = `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    chunks.push(chunk);
    cursor += chunk.length;
  }
  const xrefOffset = cursor;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    "%%EOF\n",
  ].join("\n");
  chunks.push(xref);
  return Buffer.from(chunks.join(""), "utf8");
}

async function rawRequest(pathname, { method = "GET", body, auth, workspaceId, headers } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      ...(headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = text;
    }
  }
  return {
    status: response.status,
    data,
  };
}

async function multipartRequest(
  pathname,
  { auth, workspaceId, fields = {}, fileBuffer, filename = "statement.pdf", mimeType = "application/pdf" }
) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  });
  form.append("file", new Blob([fileBuffer], { type: mimeType }), filename);

  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
    },
    body: form,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = text;
    }
  }
  return {
    status: response.status,
    data,
  };
}

async function waitForServerReady() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (serverExit) {
      throw new Error(`Server exited before ready (code ${serverExit.code})`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.status === 200) {
        return;
      }
    } catch (_error) {
      // keep waiting
    }
    await sleep(150);
  }
  throw new Error("Timed out waiting for import test server");
}

async function signup(prefix) {
  const email = randomEmail(prefix);
  const password = "test-password-123";
  const response = await rawRequest("/auth/signup", {
    method: "POST",
    body: { email, password, name: prefix },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return {
    token: response.data.token,
    user: response.data.user,
    workspaceId: response.data.activeWorkspace.id,
    email,
    password,
  };
}

async function getEntities(auth) {
  const response = await rawRequest("/entities", {
    auth,
    workspaceId: auth.workspaceId,
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return response.data;
}

async function createAccount(auth, entityId, name) {
  const response = await rawRequest("/accounts", {
    method: "POST",
    auth,
    workspaceId: auth.workspaceId,
    body: {
      name,
      type: "cash",
      entity_id: entityId,
      currency_code: "PHP",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return response.data;
}

async function createExpense(auth, entityId, accountId, name, amount, spentAt) {
  const response = await rawRequest("/expenses", {
    method: "POST",
    auth,
    workspaceId: auth.workspaceId,
    body: {
      name,
      amount,
      spent_at: spentAt,
      entity_id: entityId,
      from_account_id: accountId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return response.data;
}

function findCandidateByType(batchPayload, candidateType) {
  return (batchPayload.candidates || []).find((candidate) => candidate.candidate_type === candidateType);
}

test.before(async () => {
  serverProcess = spawn("node", ["src/server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(port),
      FINANCE_DB_PATH: dbPath,
    },
    stdio: "inherit",
  });
  serverProcess.on("exit", (code, signal) => {
    serverExit = { code, signal };
  });
  await waitForServerReady();
});

test.after(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
    await sleep(150);
    if (!serverProcess.killed) {
      serverProcess.kill("SIGKILL");
    }
  }
});

test("upload creates import batch, file, and parsed candidates", async () => {
  const owner = await signup("imports-owner");
  const entity = (await getEntities(owner))[0];
  const account = await createAccount(owner, entity.id, "Checking Upload");

  const response = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      sourceLabel: "May statement",
      entityId: entity.id,
      accountId: account.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Grocery Store -1,234.56",
      "05/11/2026 Salary Credit 5,000.00",
    ]),
  });

  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.batch.workspace_id, owner.workspaceId);
  assert.equal(response.data.files.length, 1);
  assert.ok(response.data.files[0].sha256_hash);
  assert.equal(response.data.candidates.length, 2);
  assert.equal(response.data.summary.total_count, 2);
});

test("non-member cannot access another workspace import batch", async () => {
  const owner = await signup("imports-owner-locked");
  const outsider = await signup("imports-outsider");
  const entity = (await getEntities(owner))[0];
  const account = await createAccount(owner, entity.id, "Locked Checking");

  const uploadResponse = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      entityId: entity.id,
      accountId: account.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Grocery Store -499.00",
    ]),
  });
  assert.equal(uploadResponse.status, 201, JSON.stringify(uploadResponse.data));

  const batchResponse = await rawRequest(`/imports/${uploadResponse.data.batch.id}`, {
    auth: outsider,
    workspaceId: owner.workspaceId,
  });
  assert.equal(batchResponse.status, 403, JSON.stringify(batchResponse.data));
});

test("duplicate detection marks likely duplicate candidates", async () => {
  const owner = await signup("imports-dup-owner");
  const entity = (await getEntities(owner))[0];
  const account = await createAccount(owner, entity.id, "Duplicate Checking");
  await createExpense(owner, entity.id, account.id, "Grocery Store", 1234.56, "2026-05-10");

  const uploadResponse = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      entityId: entity.id,
      accountId: account.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Grocery Store -1,234.56",
    ]),
  });

  assert.equal(uploadResponse.status, 201, JSON.stringify(uploadResponse.data));
  assert.equal(uploadResponse.data.candidates[0].status, "duplicate");
  assert.equal(uploadResponse.data.candidates[0].duplicate_of_type, "expense");
});

test("candidate with cross-workspace account cannot be approved", async () => {
  const candidate = {
    id: "candidate-cross-workspace",
    candidate_type: "expense",
    amount_cents: -25000,
    transaction_date: "2026-05-10",
    description: "Grocery Store",
    merchant: "Grocery Store",
    suggested_entity_id: "entity-1",
    suggested_account_id: 99,
    suggested_category_id: null,
  };

  await assert.rejects(
    () =>
      approveCandidate({
        get: async (sql, params) => {
          if (sql.includes("FROM entities")) {
            return { id: "entity-1" };
          }
          if (sql.includes("FROM accounts")) {
            return null;
          }
          return null;
        },
        run: async () => ({ lastID: 1, changes: 1 }),
        candidate,
        workspaceId: "workspace-1",
        currentUserId: "user-1",
        getTransferById: async () => null,
        serializeTransferRow: (row) => row,
      }),
    (error) => {
      assert.equal(error?.status, 403);
      assert.match(String(error?.message || ""), /outside the active workspace/i);
      return true;
    }
  );
});

test("approving expense candidate creates expense row", async () => {
  const owner = await signup("imports-expense-owner");
  const entity = (await getEntities(owner))[0];
  const account = await createAccount(owner, entity.id, "Expense Checking");

  const uploadResponse = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      entityId: entity.id,
      accountId: account.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Grocery Store -150.25",
    ]),
  });
  const expenseCandidate = findCandidateByType(uploadResponse.data, "expense");

  const approveResponse = await rawRequest(`/imports/${uploadResponse.data.batch.id}/approve`, {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
    body: {
      candidateIds: [expenseCandidate.id],
    },
  });

  assert.equal(approveResponse.status, 200, JSON.stringify(approveResponse.data));
  assert.equal(approveResponse.data.created_records[0].createdType, "expense");
  const expensesResponse = await rawRequest("/expenses", {
    auth: owner,
    workspaceId: owner.workspaceId,
  });
  assert.equal(expensesResponse.status, 200, JSON.stringify(expensesResponse.data));
  assert.ok(
    expensesResponse.data.some((row) => String(row.name || "").includes("Grocery Store")),
    "approved import should create a canonical expense row"
  );
});

test("approving income candidate creates income row", async () => {
  const owner = await signup("imports-income-owner");
  const entity = (await getEntities(owner))[0];
  const account = await createAccount(owner, entity.id, "Income Checking");

  const uploadResponse = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      entityId: entity.id,
      accountId: account.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Salary Credit 5,000.00",
    ]),
  });
  const incomeCandidate = findCandidateByType(uploadResponse.data, "income");

  const approveResponse = await rawRequest(`/imports/${uploadResponse.data.batch.id}/approve`, {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
    body: {
      candidateIds: [incomeCandidate.id],
    },
  });

  assert.equal(approveResponse.status, 200, JSON.stringify(approveResponse.data));
  assert.equal(approveResponse.data.created_records[0].createdType, "income");
  const incomeResponse = await rawRequest("/income", {
    auth: owner,
    workspaceId: owner.workspaceId,
  });
  assert.equal(incomeResponse.status, 200, JSON.stringify(incomeResponse.data));
  assert.ok(
    incomeResponse.data.some((row) => String(row.source || "").includes("Salary Credit")),
    "approved import should create a canonical income row"
  );
});

test("approving transfer candidate creates transfer row", async () => {
  const owner = await signup("imports-transfer-owner");
  const entity = (await getEntities(owner))[0];
  const fromAccount = await createAccount(owner, entity.id, "Transfer Source");
  const toAccount = await createAccount(owner, entity.id, "Transfer Savings");

  const uploadResponse = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      entityId: entity.id,
      accountId: fromAccount.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Transfer to Transfer Savings 2,500.00",
    ]),
  });
  const transferCandidate = findCandidateByType(uploadResponse.data, "transfer");
  assert.ok(transferCandidate, JSON.stringify(uploadResponse.data.candidates));
  assert.equal(transferCandidate.suggested_to_account_id, toAccount.id);

  const approveResponse = await rawRequest(`/imports/${uploadResponse.data.batch.id}/approve`, {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
    body: {
      candidateIds: [transferCandidate.id],
    },
  });

  assert.equal(approveResponse.status, 200, JSON.stringify(approveResponse.data));
  assert.equal(approveResponse.data.created_records[0].createdType, "transfer");
  const transfersResponse = await rawRequest("/transfers", {
    auth: owner,
    workspaceId: owner.workspaceId,
  });
  assert.equal(transfersResponse.status, 200, JSON.stringify(transfersResponse.data));
  assert.ok(
    transfersResponse.data.some((row) => row.from_account_id === fromAccount.id && row.to_account_id === toAccount.id),
    "approved import should create a canonical transfer row"
  );
});

test("approved candidates cannot be approved twice", async () => {
  const owner = await signup("imports-double-owner");
  const entity = (await getEntities(owner))[0];
  const account = await createAccount(owner, entity.id, "Double Checking");

  const uploadResponse = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      entityId: entity.id,
      accountId: account.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Grocery Store -99.00",
    ]),
  });
  const expenseCandidate = findCandidateByType(uploadResponse.data, "expense");

  const firstApproval = await rawRequest(`/imports/${uploadResponse.data.batch.id}/approve`, {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
    body: {
      candidateIds: [expenseCandidate.id],
    },
  });
  assert.equal(firstApproval.status, 200, JSON.stringify(firstApproval.data));

  const secondApproval = await rawRequest(`/imports/${uploadResponse.data.batch.id}/approve`, {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
    body: {
      candidateIds: [expenseCandidate.id],
    },
  });
  assert.equal(secondApproval.status, 400, JSON.stringify(secondApproval.data));
});

test("rejected candidates are not approved", async () => {
  const owner = await signup("imports-reject-owner");
  const entity = (await getEntities(owner))[0];
  const account = await createAccount(owner, entity.id, "Reject Checking");

  const uploadResponse = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      entityId: entity.id,
      accountId: account.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Grocery Store -88.00",
    ]),
  });
  const expenseCandidate = findCandidateByType(uploadResponse.data, "expense");

  const rejectResponse = await rawRequest(`/imports/candidates/${expenseCandidate.id}/reject`, {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
  });
  assert.equal(rejectResponse.status, 200, JSON.stringify(rejectResponse.data));

  const approveResponse = await rawRequest(`/imports/${uploadResponse.data.batch.id}/approve`, {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
    body: {
      candidateIds: [expenseCandidate.id],
    },
  });
  assert.equal(approveResponse.status, 400, JSON.stringify(approveResponse.data));
});

test("deleting a batch removes staged import records and file access", async () => {
  const owner = await signup("imports-delete-owner");
  const entity = (await getEntities(owner))[0];
  const account = await createAccount(owner, entity.id, "Delete Checking");

  const uploadResponse = await multipartRequest("/imports/upload", {
    auth: owner,
    workspaceId: owner.workspaceId,
    fields: {
      entityId: entity.id,
      accountId: account.id,
    },
    fileBuffer: createPdfBuffer([
      "Date Description Amount",
      "05/10/2026 Grocery Store -88.00",
    ]),
  });
  assert.equal(uploadResponse.status, 201, JSON.stringify(uploadResponse.data));

  const deleteResponse = await rawRequest(`/imports/${uploadResponse.data.batch.id}`, {
    method: "DELETE",
    auth: owner,
    workspaceId: owner.workspaceId,
  });
  assert.equal(deleteResponse.status, 200, JSON.stringify(deleteResponse.data));

  const batchResponse = await rawRequest(`/imports/${uploadResponse.data.batch.id}`, {
    auth: owner,
    workspaceId: owner.workspaceId,
  });
  assert.equal(batchResponse.status, 404, JSON.stringify(batchResponse.data));
});
