const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "finance-auth-workspace-"));
const dbPath = path.join(tmpDir, "finance.test.db");
const port = 44000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
const testDate = "2026-05-10";

let serverProcess = null;
let serverExit = null;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function rawRequest(pathname, { method = "GET", body, auth, workspaceId } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = text;
    }
  }

  return {
    status: res.status,
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
  throw new Error("Timed out waiting for test server to start");
}

function randomEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function signup({ email, password, name }) {
  const response = await rawRequest("/auth/signup", {
    method: "POST",
    body: { email, password, name },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return {
    email,
    password,
    token: response.data.token,
    user: response.data.user,
    workspaceId: response.data.activeWorkspace?.id,
    workspaces: response.data.workspaces || [],
  };
}

async function login({ email, password }) {
  const response = await rawRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return response.data;
}

async function getEntities(auth, workspaceId) {
  const response = await rawRequest("/entities", { auth, workspaceId });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return Array.isArray(response.data) ? response.data : [];
}

async function createAccount(auth, workspaceId, entityId, name) {
  const response = await rawRequest("/accounts", {
    method: "POST",
    auth,
    workspaceId,
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

async function createIncome(auth, workspaceId, entityId, accountId, source, amount) {
  const response = await rawRequest("/income", {
    method: "POST",
    auth,
    workspaceId,
    body: {
      amount,
      source,
      received_date: testDate,
      entity_id: entityId,
      to_account_id: accountId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return response.data;
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

test("auth, household membership, and workspace scoping work end to end", async () => {
  const owner = await signup({
    email: randomEmail("owner"),
    password: "test-password-1",
    name: "Owner",
  });
  assert.equal(owner.user.email, owner.email);
  assert.equal(owner.workspaces.length, 1);
  assert.equal(owner.workspaceId, owner.workspaces[0]?.id);

  const ownerEntities = await getEntities(owner, owner.workspaceId);
  assert.ok(ownerEntities.length >= 1);
  assert.ok(
    ownerEntities.some((entity) => entity.name === "Personal"),
    "signup should create a default Personal entity"
  );

  const loginPayload = await login({
    email: owner.email,
    password: owner.password,
  });
  assert.equal(loginPayload.user.email, owner.email);
  assert.ok(typeof loginPayload.token === "string" && loginPayload.token.length > 10);

  const unauthenticated = await rawRequest("/workspaces");
  assert.equal(unauthenticated.status, 401);

  const member = await signup({
    email: randomEmail("member"),
    password: "test-password-2",
    name: "Member",
  });
  const memberEntities = await getEntities(member, member.workspaceId);
  assert.ok(memberEntities.length >= 1);

  const inviteResponse = await rawRequest(
    `/workspaces/${encodeURIComponent(owner.workspaceId)}/invites`,
    {
      method: "POST",
      auth: owner,
      body: {
        email: member.email,
      },
    }
  );
  assert.equal(inviteResponse.status, 201, JSON.stringify(inviteResponse.data));
  assert.match(String(inviteResponse.data?.invite_link || ""), /^\/invite\//);
  const inviteToken = String(inviteResponse.data.invite_link).split("/").pop();
  assert.ok(inviteToken);

  const inviteLookup = await rawRequest(`/invites/${encodeURIComponent(inviteToken)}`);
  assert.equal(inviteLookup.status, 200, JSON.stringify(inviteLookup.data));
  assert.equal(inviteLookup.data?.invite?.workspace_id, owner.workspaceId);

  const inviteAccept = await rawRequest(
    `/invites/${encodeURIComponent(inviteToken)}/accept`,
    {
      method: "POST",
      auth: member,
    }
  );
  assert.equal(inviteAccept.status, 200, JSON.stringify(inviteAccept.data));
  assert.equal(inviteAccept.data?.workspace?.id, owner.workspaceId);

  const duplicateAccept = await rawRequest(
    `/invites/${encodeURIComponent(inviteToken)}/accept`,
    {
      method: "POST",
      auth: member,
    }
  );
  assert.equal(duplicateAccept.status, 200, JSON.stringify(duplicateAccept.data));

  const ownerMembers = await rawRequest(
    `/workspaces/${encodeURIComponent(owner.workspaceId)}/members`,
    {
      auth: owner,
    }
  );
  assert.equal(ownerMembers.status, 200, JSON.stringify(ownerMembers.data));
  assert.equal(ownerMembers.data.length, 2);
  assert.equal(
    ownerMembers.data.filter((row) => row.email === member.email).length,
    1,
    "duplicate invite acceptance must not create duplicate membership rows"
  );

  const memberCanAccessHousehold = await rawRequest("/entities", {
    auth: member,
    workspaceId: owner.workspaceId,
  });
  assert.equal(memberCanAccessHousehold.status, 200, JSON.stringify(memberCanAccessHousehold.data));

  const nonMemberBlocked = await rawRequest("/entities", {
    auth: owner,
    workspaceId: member.workspaceId,
  });
  assert.equal(nonMemberBlocked.status, 403, JSON.stringify(nonMemberBlocked.data));

  const ownerEntity = ownerEntities[0];
  const memberEntity = memberEntities[0];
  const ownerAccount = await createAccount(
    owner,
    owner.workspaceId,
    ownerEntity.id,
    `owner-cash-${Date.now()}`
  );
  const memberAccount = await createAccount(
    member,
    member.workspaceId,
    memberEntity.id,
    `member-cash-${Date.now()}`
  );

  await createIncome(
    owner,
    owner.workspaceId,
    ownerEntity.id,
    ownerAccount.id,
    "Owner Workspace Salary",
    600
  );
  await createIncome(
    member,
    member.workspaceId,
    memberEntity.id,
    memberAccount.id,
    "Member Workspace Salary",
    400
  );

  const foreignEntityWrite = await rawRequest("/expenses", {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
    body: {
      amount: 25,
      name: "Foreign entity write",
      spent_at: testDate,
      entity_id: memberEntity.id,
      from_account_id: ownerAccount.id,
    },
  });
  assert.equal(foreignEntityWrite.status, 403, JSON.stringify(foreignEntityWrite.data));

  const foreignAccountWrite = await rawRequest("/income", {
    method: "POST",
    auth: owner,
    workspaceId: owner.workspaceId,
    body: {
      amount: 50,
      source: "Foreign account write",
      received_date: testDate,
      entity_id: ownerEntity.id,
      to_account_id: memberAccount.id,
    },
  });
  assert.equal(foreignAccountWrite.status, 403, JSON.stringify(foreignAccountWrite.data));

  const crossWorkspaceTransfer = await rawRequest("/transfers", {
    method: "POST",
    auth: member,
    workspaceId: owner.workspaceId,
    body: {
      from_account_id: ownerAccount.id,
      to_account_id: memberAccount.id,
      amount: 50,
      date: testDate,
      notes: "cross workspace transfer",
    },
  });
  assert.equal(crossWorkspaceTransfer.status, 403, JSON.stringify(crossWorkspaceTransfer.data));

  const ownerTransactions = await rawRequest("/transactions", {
    auth: owner,
    workspaceId: owner.workspaceId,
  });
  assert.equal(ownerTransactions.status, 200, JSON.stringify(ownerTransactions.data));
  const ownerTransactionNotes = new Set(
    (ownerTransactions.data || []).map((row) => String(row.note || row.category || ""))
  );
  assert.ok(ownerTransactionNotes.has("Owner Workspace Salary"));
  assert.ok(!ownerTransactionNotes.has("Member Workspace Salary"));

  const memberTransactions = await rawRequest("/transactions", {
    auth: member,
    workspaceId: member.workspaceId,
  });
  assert.equal(memberTransactions.status, 200, JSON.stringify(memberTransactions.data));
  const memberTransactionNotes = new Set(
    (memberTransactions.data || []).map((row) => String(row.note || row.category || ""))
  );
  assert.ok(memberTransactionNotes.has("Member Workspace Salary"));
  assert.ok(!memberTransactionNotes.has("Owner Workspace Salary"));
});
