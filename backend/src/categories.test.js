const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "finance-categories-"));
const dbPath = path.join(tmpDir, "finance.test.db");
const port = 45000 + Math.floor(Math.random() * 1000);
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
      const response = await request("/categories");
      if (response.status === 200) {
        return;
      }
    } catch (err) {
      // keep waiting
    }
    await sleep(150);
  }
  throw new Error("Timed out waiting for category test server to start");
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

test("expense categories reject duplicate names on create and update", async () => {
  let response = await request("/categories", {
    method: "POST",
    body: {
      name: "Household",
      color: "#FECDD3",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const firstCategory = response.data;

  response = await request("/categories", {
    method: "POST",
    body: {
      name: " household ",
      color: "#FDA4AF",
    },
  });
  assert.equal(response.status, 409, JSON.stringify(response.data));
  assert.equal(response.data.error, "Category name already exists");

  response = await request("/categories", {
    method: "POST",
    body: {
      name: "Utilities",
      color: "#FB7185",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const secondCategory = response.data;

  response = await request(`/categories/${secondCategory.id}`, {
    method: "PUT",
    body: {
      name: "HOUSEHOLD",
      color: "#F43F5E",
    },
  });
  assert.equal(response.status, 409, JSON.stringify(response.data));
  assert.equal(response.data.error, "Category name already exists");

  response = await request(`/categories/${firstCategory.id}`, {
    method: "PUT",
    body: {
      name: "household",
      color: "#FED7AA",
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.name, "household");
});

test("income categories reject duplicate names on create and update", async () => {
  let response = await request("/income-categories", {
    method: "POST",
    body: {
      name: "Salary",
      color: "#FECDD3",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const firstCategory = response.data;

  response = await request("/income-categories", {
    method: "POST",
    body: {
      name: " salary ",
      color: "#FDA4AF",
    },
  });
  assert.equal(response.status, 409, JSON.stringify(response.data));
  assert.equal(response.data.error, "Income category name already exists");

  response = await request("/income-categories", {
    method: "POST",
    body: {
      name: "Bonus",
      color: "#FB7185",
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const secondCategory = response.data;

  response = await request(`/income-categories/${secondCategory.id}`, {
    method: "PUT",
    body: {
      name: "SALARY",
      color: "#F43F5E",
    },
  });
  assert.equal(response.status, 409, JSON.stringify(response.data));
  assert.equal(response.data.error, "Income category name already exists");

  response = await request(`/income-categories/${firstCategory.id}`, {
    method: "PUT",
    body: {
      name: "salary",
      color: "#FED7AA",
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.name, "salary");
});
