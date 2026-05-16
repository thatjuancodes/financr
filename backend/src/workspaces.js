const { AppError } = require("./errors");
const { createUuid, nowIso } = require("./auth");

async function getWorkspaceById({ get }, workspaceId) {
  return get(
    `
    SELECT id, name, type, created_by_user_id, created_at, updated_at
    FROM workspaces
    WHERE id = ?
    LIMIT 1
    `,
    [workspaceId]
  );
}

async function assertWorkspaceMember(db, userId, workspaceId) {
  const membership = await db.get(
    `
    SELECT workspace_id, user_id, role, joined_at
    FROM workspace_members
    WHERE workspace_id = ? AND user_id = ?
    LIMIT 1
    `,
    [workspaceId, userId]
  );
  if (!membership) {
    throw new AppError("Workspace access forbidden", 403);
  }
  return membership;
}

async function assertWorkspaceOwner(db, userId, workspaceId) {
  const membership = await db.get(
    `
    SELECT workspace_id, user_id, role, joined_at
    FROM workspace_members
    WHERE workspace_id = ? AND user_id = ? AND role = 'owner'
    LIMIT 1
    `,
    [workspaceId, userId]
  );
  if (!membership) {
    throw new AppError("Workspace owner access required", 403);
  }
  return membership;
}

async function assertEntityInWorkspace(db, entityId, workspaceId) {
  const entity = await db.get(
    `
    SELECT id, name, type, workspace_id, created_at, updated_at
    FROM entities
    WHERE id = ? AND workspace_id = ?
    LIMIT 1
    `,
    [entityId, workspaceId]
  );
  if (!entity) {
    throw new AppError("Entity access forbidden", 403);
  }
  return entity;
}

async function assertAccountInWorkspace(db, accountId, workspaceId) {
  const account = await db.get(
    `
    SELECT
      a.id,
      a.name,
      a.type,
      a.entity_id,
      e.workspace_id,
      a.currency_code,
      a.created_at
    FROM accounts a
    INNER JOIN entities e ON e.id = a.entity_id
    WHERE a.id = ? AND e.workspace_id = ?
    LIMIT 1
    `,
    [accountId, workspaceId]
  );
  if (!account) {
    throw new AppError("Account access forbidden", 403);
  }
  return account;
}

async function getWorkspaceEntityIds(db, workspaceId) {
  const rows = await db.all(
    `
    SELECT id
    FROM entities
    WHERE workspace_id = ?
    ORDER BY created_at ASC, id ASC
    `,
    [workspaceId]
  );
  return rows.map((row) => String(row.id));
}

async function getWorkspaceAccountIds(db, workspaceId) {
  const rows = await db.all(
    `
    SELECT a.id
    FROM accounts a
    INNER JOIN entities e ON e.id = a.entity_id
    WHERE e.workspace_id = ?
    ORDER BY a.created_at ASC, a.id ASC
    `,
    [workspaceId]
  );
  return rows
    .map((row) => Number(row.id))
    .filter((value) => Number.isInteger(value) && value > 0);
}

async function listWorkspaceMembers(db, workspaceId) {
  const rows = await db.all(
    `
    SELECT
      wm.workspace_id,
      wm.user_id,
      wm.role,
      wm.joined_at,
      u.email,
      u.name,
      u.created_at,
      u.updated_at
    FROM workspace_members wm
    INNER JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ?
    ORDER BY
      CASE wm.role WHEN 'owner' THEN 1 ELSE 2 END,
      COALESCE(NULLIF(TRIM(u.name), ''), u.email) ASC
    `,
    [workspaceId]
  );
  return rows.map((row) => ({
    user_id: String(row.user_id),
    email: String(row.email || ""),
    name: row.name ? String(row.name) : null,
    role: String(row.role || "member"),
    joined_at: String(row.joined_at || ""),
  }));
}

async function createWorkspaceWithOwner(db, { name, type = "household", userId }) {
  const workspaceName = String(name || "").trim();
  if (!workspaceName) {
    throw new AppError("Workspace name is required", 400);
  }
  const workspaceId = createUuid();
  const timestamp = nowIso();
  await db.run(
    `
    INSERT INTO workspaces (
      id,
      name,
      type,
      created_by_user_id,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [workspaceId, workspaceName, type, userId, timestamp, timestamp]
  );
  await db.run(
    `
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (?, ?, 'owner', ?)
    `,
    [workspaceId, userId, timestamp]
  );
  return getWorkspaceById(db, workspaceId);
}

async function ensureWorkspaceEntity(db, workspaceId, options = {}) {
  const existing = await db.get(
    `
    SELECT id, name, type, workspace_id, created_at, updated_at
    FROM entities
    WHERE workspace_id = ?
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
    `,
    [workspaceId]
  );
  if (existing) {
    return existing;
  }
  const entityId = createUuid();
  const timestamp = nowIso();
  const entityName = String(options.name || "Personal").trim() || "Personal";
  const entityType = String(options.type || "personal").trim() || "personal";
  await db.run(
    `
    INSERT INTO entities (id, name, type, workspace_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [entityId, entityName, entityType, workspaceId, timestamp, timestamp]
  );
  return db.get(
    `
    SELECT id, name, type, workspace_id, created_at, updated_at
    FROM entities
    WHERE id = ?
    LIMIT 1
    `,
    [entityId]
  );
}

module.exports = {
  getWorkspaceById,
  assertWorkspaceMember,
  assertWorkspaceOwner,
  assertEntityInWorkspace,
  assertAccountInWorkspace,
  getWorkspaceEntityIds,
  getWorkspaceAccountIds,
  listWorkspaceMembers,
  createWorkspaceWithOwner,
  ensureWorkspaceEntity,
};
