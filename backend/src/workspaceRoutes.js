const crypto = require("node:crypto");
const { AppError } = require("./errors");
const {
  listUserWorkspaces,
  normalizeEmail,
  serializeWorkspace,
} = require("./auth");
const {
  assertWorkspaceMember,
  assertWorkspaceOwner,
  createWorkspaceWithOwner,
  ensureWorkspaceEntity,
  getWorkspaceById,
  listWorkspaceMembers,
} = require("./workspaces");

function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function addDays(isoString, dayCount) {
  const date = new Date(isoString);
  date.setUTCDate(date.getUTCDate() + dayCount);
  return date.toISOString();
}

function registerWorkspaceRoutes(app, deps) {
  const { get, run, all, nowIso } = deps;

  async function getInviteByToken(token) {
    return get(
      `
      SELECT
        wi.id,
        wi.workspace_id,
        wi.email,
        wi.role,
        wi.token,
        wi.status,
        wi.invited_by_user_id,
        wi.accepted_by_user_id,
        wi.expires_at,
        wi.created_at,
        wi.accepted_at,
        w.name AS workspace_name,
        w.type AS workspace_type,
        inviter.email AS invited_by_email,
        inviter.name AS invited_by_name
      FROM workspace_invites wi
      INNER JOIN workspaces w ON w.id = wi.workspace_id
      INNER JOIN users inviter ON inviter.id = wi.invited_by_user_id
      WHERE wi.token = ?
      LIMIT 1
      `,
      [token]
    );
  }

  function serializeInvite(invite) {
    if (!invite) {
      return null;
    }
    return {
      id: String(invite.id),
      workspace_id: String(invite.workspace_id),
      workspace_name: String(invite.workspace_name || ""),
      workspace_type: String(invite.workspace_type || "household"),
      email: String(invite.email || ""),
      role: String(invite.role || "member"),
      status: String(invite.status || "pending"),
      expires_at: String(invite.expires_at || ""),
      created_at: String(invite.created_at || ""),
      accepted_at: invite.accepted_at ? String(invite.accepted_at) : null,
      invited_by: {
        user_id: String(invite.invited_by_user_id || ""),
        email: String(invite.invited_by_email || ""),
        name: invite.invited_by_name ? String(invite.invited_by_name) : null,
      },
    };
  }

  function handleError(res, error, fallbackMessage) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: fallbackMessage });
  }

  app.get("/workspaces", async (req, res) => {
    try {
      res.json(await listUserWorkspaces({ all }, req.currentUser.id));
    } catch (error) {
      handleError(res, error, "Failed to load workspaces");
    }
  });

  app.post("/workspaces", async (req, res) => {
    try {
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) {
        return res.status(400).json({ error: "Workspace name is required" });
      }
      const workspace = await createWorkspaceWithOwner(
        { run, get },
        { name, userId: req.currentUser.id }
      );
      await ensureWorkspaceEntity(
        { run, get },
        workspace.id,
        { name: "Personal", type: "personal" }
      );
      res.status(201).json(serializeWorkspace(workspace));
    } catch (error) {
      handleError(res, error, "Failed to create workspace");
    }
  });

  app.get("/workspaces/:workspaceId", async (req, res) => {
    try {
      const workspaceId = String(req.params.workspaceId || "").trim();
      await assertWorkspaceMember({ get }, req.currentUser.id, workspaceId);
      const workspace = await getWorkspaceById({ get }, workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      res.json({
        ...serializeWorkspace(workspace),
        members: await listWorkspaceMembers({ all }, workspaceId),
      });
    } catch (error) {
      handleError(res, error, "Failed to load workspace");
    }
  });

  app.patch("/workspaces/:workspaceId", async (req, res) => {
    try {
      const workspaceId = String(req.params.workspaceId || "").trim();
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) {
        return res.status(400).json({ error: "Workspace name is required" });
      }
      await assertWorkspaceOwner({ get }, req.currentUser.id, workspaceId);
      await run(
        "UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?",
        [name, nowIso(), workspaceId]
      );
      const workspace = await getWorkspaceById({ get }, workspaceId);
      res.json(serializeWorkspace(workspace));
    } catch (error) {
      handleError(res, error, "Failed to update workspace");
    }
  });

  app.get("/workspaces/:workspaceId/members", async (req, res) => {
    try {
      const workspaceId = String(req.params.workspaceId || "").trim();
      await assertWorkspaceMember({ get }, req.currentUser.id, workspaceId);
      res.json(await listWorkspaceMembers({ all }, workspaceId));
    } catch (error) {
      handleError(res, error, "Failed to load workspace members");
    }
  });

  app.post("/workspaces/:workspaceId/invites", async (req, res) => {
    try {
      const workspaceId = String(req.params.workspaceId || "").trim();
      await assertWorkspaceOwner({ get }, req.currentUser.id, workspaceId);
      const email = normalizeEmail(req.body?.email);
      const role =
        String(req.body?.role || "member").trim().toLowerCase() === "owner"
          ? "owner"
          : "member";
      if (!email) {
        return res.status(400).json({ error: "email is required" });
      }
      const existingMember = await get(
        `
        SELECT wm.user_id
        FROM workspace_members wm
        INNER JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = ? AND u.email = ?
        LIMIT 1
        `,
        [workspaceId, email]
      );
      if (existingMember) {
        return res.status(409).json({ error: "User is already a household member" });
      }
      const createdAt = nowIso();
      const inviteId = deps.createUuid();
      const token = generateInviteToken();
      const expiresAt = addDays(createdAt, 7);
      await run(
        `
        INSERT INTO workspace_invites (
          id,
          workspace_id,
          email,
          role,
          token,
          status,
          invited_by_user_id,
          accepted_by_user_id,
          expires_at,
          created_at,
          accepted_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, ?, ?, NULL)
        `,
        [inviteId, workspaceId, email, role, token, req.currentUser.id, expiresAt, createdAt]
      );
      const invite = await getInviteByToken(token);
      res.status(201).json({
        invite: serializeInvite(invite),
        invite_link: `/invite/${token}`,
      });
    } catch (error) {
      handleError(res, error, "Failed to create invite");
    }
  });

  app.get("/invites/:token", async (req, res) => {
    try {
      const token = String(req.params.token || "").trim();
      if (!token) {
        return res.status(400).json({ error: "Invalid invite token" });
      }
      const invite = await getInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      if (invite.status !== "pending") {
        return res.status(410).json({ error: "Invite is no longer pending" });
      }
      if (String(invite.expires_at || "") <= nowIso()) {
        return res.status(410).json({ error: "Invite has expired" });
      }
      res.json({ invite: serializeInvite(invite) });
    } catch (error) {
      handleError(res, error, "Failed to load invite");
    }
  });

  app.post("/invites/:token/accept", async (req, res) => {
    try {
      const token = String(req.params.token || "").trim();
      if (!token) {
        return res.status(400).json({ error: "Invalid invite token" });
      }
      const invite = await getInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      if (invite.status !== "pending") {
        return res.json({ ok: true, workspace_id: invite.workspace_id });
      }
      if (String(invite.expires_at || "") <= nowIso()) {
        return res.status(410).json({ error: "Invite has expired" });
      }
      if (normalizeEmail(req.currentUser.email) !== normalizeEmail(invite.email)) {
        return res.status(403).json({ error: "Invite email does not match current user" });
      }

      const joinedAt = nowIso();
      await run(
        `
        INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(workspace_id, user_id) DO NOTHING
        `,
        [invite.workspace_id, req.currentUser.id, invite.role || "member", joinedAt]
      );
      await run(
        `
        UPDATE workspace_invites
        SET status = 'accepted',
            accepted_by_user_id = ?,
            accepted_at = ?
        WHERE id = ?
        `,
        [req.currentUser.id, joinedAt, invite.id]
      );
      const workspace = await getWorkspaceById({ get }, invite.workspace_id);
      res.json({
        ok: true,
        workspace: serializeWorkspace(workspace),
      });
    } catch (error) {
      handleError(res, error, "Failed to accept invite");
    }
  });
}

module.exports = {
  registerWorkspaceRoutes,
};
