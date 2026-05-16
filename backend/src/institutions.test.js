const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { loginDefaultUser } = require("./testAuth");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "finance-institutions-"));
const dbPath = path.join(tmpDir, "finance.test.db");
const port = 44000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;

let serverProcess = null;
let serverExit = null;
let authState = null;

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
      ...(authState?.token ? { Authorization: `Bearer ${authState.token}` } : {}),
      ...(authState?.workspaceId
        ? { "x-workspace-id": authState.workspaceId }
        : {}),
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
    } catch (err) {
      // keep waiting
    }
    await sleep(150);
  }
  throw new Error("Timed out waiting for institution test server to start");
}

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
  authState = await loginDefaultUser(baseUrl);
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

test("institutions endpoint returns seeded active institutions sorted by type then name", async () => {
  const response = await request("/institutions");
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.ok(Array.isArray(response.data));

  const names = response.data.map((item) => item.name);
  assert.deepEqual(names, [
    "Banco De Oro",
    "Bank of the Philippine Islands",
    "Philippine National Bank",
    "Union Bank of the Philippines",
    "GCash",
    "Maya",
  ]);

  const gcash = response.data.find((item) => item.name === "GCash");
  assert.equal(gcash.type, "e_wallet");
  assert.equal(gcash.swift_code, null);
  assert.equal(gcash.currency_code, "PHP");

  const bpi = response.data.find(
    (item) => item.name === "Bank of the Philippine Islands"
  );
  assert.equal(bpi.type, "bank");
  assert.equal(bpi.code, "BPI");
  assert.equal(bpi.swift_code, "BOPIPHMM");
});

test("cannot create duplicate institution names or e-wallets with swift codes", async () => {
  let response = await request("/institutions", {
    method: "POST",
    body: {
      name: "banco de oro",
      type: "bank",
      code: "BDO2",
      swift_code: "BNORPHMM",
    },
  });
  assert.equal(response.status, 400, JSON.stringify(response.data));
  assert.equal(response.data.error, "Institution name already exists");

  response = await request("/institutions", {
    method: "POST",
    body: {
      name: "Coins Wallet",
      type: "e_wallet",
      code: "COINS",
      swift_code: "INVALID123",
    },
  });
  assert.equal(response.status, 400, JSON.stringify(response.data));
  assert.equal(
    response.data.error,
    "swift_code must be null for e_wallet institutions"
  );
});

test("can create, update, and soft delete institutions", async () => {
  let response = await request("/institutions", {
    method: "POST",
    body: {
      name: "Test Rural Bank",
      type: "bank",
      code: "TRB",
      swift_code: "TESTRBMM",
      currency_code: "USD",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const created = response.data;
  assert.equal(created.name, "Test Rural Bank");
  assert.equal(created.type, "bank");
  assert.equal(created.code, "TRB");
  assert.equal(created.swift_code, "TESTRBMM");
  assert.equal(created.currency_code, "USD");
  assert.equal(created.country, "PH");
  assert.equal(created.is_active, 1);

  response = await request(`/institutions/${encodeURIComponent(created.id)}`, {
    method: "PATCH",
    body: {
      name: "Test Rural Bank Updated",
      code: "TRBU",
      swift_code: "TRBUPHMM",
      currency_code: "VND",
      is_active: true,
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.name, "Test Rural Bank Updated");
  assert.equal(response.data.code, "TRBU");
  assert.equal(response.data.swift_code, "TRBUPHMM");
  assert.equal(response.data.currency_code, "VND");
  assert.equal(response.data.is_active, 1);

  response = await request(`/institutions/${encodeURIComponent(created.id)}`, {
    method: "DELETE",
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.ok, true);

  const listAfterDelete = await request("/institutions");
  assert.equal(listAfterDelete.status, 200);
  assert.equal(
    listAfterDelete.data.some((item) => item.id === created.id),
    false
  );
});
