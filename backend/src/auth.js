const crypto = require("node:crypto");
const { AppError } = require("./errors");

const DEFAULT_LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_LOCAL_WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";
const DEFAULT_LOCAL_USER_EMAIL =
  process.env.FINANCE_LOCAL_USER_EMAIL || "jmgaudielalvarez@gmail.com";
const DEFAULT_LOCAL_USER_PASSWORD =
  process.env.FINANCE_LOCAL_USER_PASSWORD || "Pass123!@#";
const DEFAULT_LOCAL_USER_NAME =
  process.env.FINANCE_LOCAL_USER_NAME || "JM Alvarez";
const DEFAULT_LOCAL_WORKSPACE_NAME = "Alvarez Organization";
const DEMO_LOCAL_USER_ID = "00000000-0000-4000-8000-000000000003";
const DEMO_LOCAL_USER_EMAIL =
  process.env.FINANCE_DEMO_USER_EMAIL || "demo@steward.com";
const DEMO_LOCAL_USER_PASSWORD =
  process.env.FINANCE_DEMO_USER_PASSWORD || "Pass123!@#";
const DEMO_LOCAL_USER_NAME =
  process.env.FINANCE_DEMO_USER_NAME || "Demo";
const DEMO_BLANK_USER_ID = "00000000-0000-4000-8000-000000000004";
const DEMO_BLANK_USER_EMAIL =
  process.env.FINANCE_DEMO_BLANK_USER_EMAIL || "demo_blank@steward.com";
const DEMO_BLANK_USER_PASSWORD =
  process.env.FINANCE_DEMO_BLANK_USER_PASSWORD || "Pass123!@#";
const DEMO_BLANK_USER_NAME =
  process.env.FINANCE_DEMO_BLANK_USER_NAME || "Blank Demo";
const SESSION_TTL_DAYS = 30;

function nowIso() {
  return new Date().toISOString();
}

function addDays(isoString, dayCount) {
  const date = new Date(isoString);
  date.setUTCDate(date.getUTCDate() + dayCount);
  return date.toISOString();
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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function hashPassword(password) {
  const normalized = String(password || "");
  if (!normalized) {
    throw new AppError("password is required", 400);
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(normalized, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

function verifyPassword(password, passwordHash) {
  const normalized = String(password || "");
  const stored = String(passwordHash || "");
  if (!normalized || !stored.startsWith("scrypt$")) {
    return false;
  }
  const [, salt, expectedHex] = stored.split("$");
  if (!salt || !expectedHex) {
    return false;
  }
  const actual = crypto.scryptSync(normalized, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(actual, expected);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function readBearerToken(req) {
  const header = String(req.headers?.authorization || "").trim();
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

function serializeUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: String(row.id),
    email: normalizeEmail(row.email),
    name: normalizeName(row.name),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function serializeWorkspace(row) {
  if (!row) {
    return null;
  }
  return {
    id: String(row.id),
    name: String(row.name || ""),
    type: String(row.type || "household"),
    created_by_user_id: String(row.created_by_user_id || ""),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    role: row.role ? String(row.role) : null,
    joined_at: row.joined_at ? String(row.joined_at) : null,
  };
}

async function listUserWorkspaces({ all }, userId) {
  const rows = await all(
    `
    SELECT
      w.id,
      w.name,
      w.type,
      w.created_by_user_id,
      w.created_at,
      w.updated_at,
      wm.role,
      wm.joined_at
    FROM workspace_members wm
    INNER JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
    ORDER BY
      CASE wm.role WHEN 'owner' THEN 1 ELSE 2 END,
      w.created_at ASC,
      w.id ASC
    `,
    [userId]
  );
  return rows.map(serializeWorkspace);
}

async function getUserByEmail({ get }, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }
  return get(
    `
    SELECT id, email, name, password_hash, created_at, updated_at
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [normalizedEmail]
  );
}

async function createSession({ run }, userId, options = {}) {
  const sessionId = createUuid();
  const token = generateSessionToken();
  const createdAt = nowIso();
  const expiresAt = addDays(createdAt, options.ttlDays || SESSION_TTL_DAYS);
  await run(
    `
    INSERT INTO auth_sessions (
      id,
      user_id,
      token_hash,
      created_at,
      expires_at,
      revoked_at,
      last_used_at
    )
    VALUES (?, ?, ?, ?, ?, NULL, ?)
    `,
    [sessionId, userId, hashToken(token), createdAt, expiresAt, createdAt]
  );
  return {
    token,
    expires_at: expiresAt,
  };
}

async function resolveSessionUser({ get, run }, token) {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) {
    return null;
  }
  const now = nowIso();
  const row = await get(
    `
    SELECT
      s.id AS session_id,
      s.user_id,
      s.expires_at,
      u.id,
      u.email,
      u.name,
      u.created_at,
      u.updated_at
    FROM auth_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > ?
    LIMIT 1
    `,
    [hashToken(normalizedToken), now]
  );
  if (!row) {
    return null;
  }
  await run("UPDATE auth_sessions SET last_used_at = ? WHERE id = ?", [
    now,
    row.session_id,
  ]);
  return serializeUser(row);
}

async function revokeSession({ run }, token) {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) {
    return;
  }
  await run(
    `
    UPDATE auth_sessions
    SET revoked_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL
    `,
    [nowIso(), hashToken(normalizedToken)]
  );
}

async function createUser({ run, get }, { email, password, name }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);
  if (!normalizedEmail || !password) {
    throw new AppError("email and password are required", 400);
  }
  const existing = await get("SELECT id FROM users WHERE email = ? LIMIT 1", [
    normalizedEmail,
  ]);
  if (existing) {
    throw new AppError("Email already in use", 409);
  }
  const userId = createUuid();
  const timestamp = nowIso();
  await run(
    `
    INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [userId, normalizedEmail, normalizedName, hashPassword(password), timestamp, timestamp]
  );
  return get(
    `
    SELECT id, email, name, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );
}

module.exports = {
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
  SESSION_TTL_DAYS,
  nowIso,
  createUuid,
  normalizeEmail,
  normalizeName,
  hashPassword,
  verifyPassword,
  readBearerToken,
  serializeUser,
  serializeWorkspace,
  listUserWorkspaces,
  getUserByEmail,
  createUser,
  createSession,
  resolveSessionUser,
  revokeSession,
};
