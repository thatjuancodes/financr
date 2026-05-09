const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "finance-insurance-"));
const dbPath = path.join(tmpDir, "finance.test.db");
const port = 46000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;

let serverProcess = null;
let serverExit = null;

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
  throw new Error("Timed out waiting for insurance test server to start");
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

test("life insurance records are entity-owned and support CRUD", async () => {
  const entitiesResponse = await request("/entities");
  assert.equal(entitiesResponse.status, 200, JSON.stringify(entitiesResponse.data));
  assert.ok(Array.isArray(entitiesResponse.data));
  assert.ok(entitiesResponse.data.length >= 2);

  const personalEntity = entitiesResponse.data.find((item) => item.type === "personal");
  const familyEntity = entitiesResponse.data.find((item) => item.type === "family");
  assert.ok(personalEntity);
  assert.ok(familyEntity);

  let response = await request("/life-insurances", {
    method: "POST",
    body: {
      entity_id: personalEntity.id,
      provider: "Sun Life",
      policy_name: "Secure Future",
      insured_person: "John Doe",
      coverage_amount: 1500000,
      cash_surrender_value: 120000,
      premium_amount: 2500,
      payment_frequency: "monthly",
      renewal_date: "2026-12-01",
      notes: "Primary life cover",
      is_active: true,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const created = response.data;
  assert.equal(created.entity_id, personalEntity.id);
  assert.equal(created.entity_name, personalEntity.name);
  assert.equal(created.provider, "Sun Life");
  assert.equal(created.cash_surrender_value, 120000);

  response = await request(`/life-insurances?entity_id=${encodeURIComponent(personalEntity.id)}`);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.length, 1);
  assert.equal(response.data[0].id, created.id);

  response = await request(`/life-insurances?entity_id=${encodeURIComponent(familyEntity.id)}`);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.length, 0);

  response = await request(`/life-insurances/${created.id}`, {
    method: "PUT",
    body: {
      entity_id: familyEntity.id,
      provider: "Sun Life",
      policy_name: "Secure Future Plus",
      insured_person: "John Doe",
      coverage_amount: 1750000,
      cash_surrender_value: 180000,
      premium_amount: 2750,
      payment_frequency: "annual",
      renewal_date: "2027-12-01",
      notes: "Moved to family budget",
      is_active: false,
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.entity_id, familyEntity.id);
  assert.equal(response.data.policy_name, "Secure Future Plus");
  assert.equal(response.data.cash_surrender_value, 180000);
  assert.equal(response.data.premium_amount, 2750);
  assert.equal(response.data.is_active, 0);

  response = await request("/life-insurances", {
    method: "POST",
    body: {
      entity_id: "missing-entity",
      provider: "AXA",
      policy_name: "Term Shield",
      insured_person: "Jane Doe",
      coverage_amount: 1000000,
      cash_surrender_value: 0,
      premium_amount: 1000,
      payment_frequency: "monthly",
      renewal_date: "2026-10-10",
      notes: "",
      is_active: true,
    },
  });
  assert.equal(response.status, 400, JSON.stringify(response.data));
  assert.equal(response.data.error, "Entity not found");

  response = await request(`/life-insurances/${created.id}`, {
    method: "DELETE",
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.ok, true);

  response = await request("/life-insurances");
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.length, 0);
});
