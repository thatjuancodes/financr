const { AppError } = require("./errors");
const {
  createSession,
  createUser,
  getUserByEmail,
  listUserWorkspaces,
  readBearerToken,
  revokeSession,
  serializeUser,
  normalizeEmail,
} = require("./auth");
const {
  createWorkspaceWithOwner,
  ensureWorkspaceEntity,
} = require("./workspaces");

function registerAuthRoutes(app, deps) {
  const { get, run, all, verifyPassword } = deps;

  async function buildAuthPayload(userRow) {
    const user = serializeUser(userRow);
    const workspaces = await listUserWorkspaces({ all }, user.id);
    return {
      user,
      workspaces,
      activeWorkspace: workspaces[0] || null,
    };
  }

  function handleError(res, error, fallbackMessage) {
    if (error instanceof AppError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: fallbackMessage });
  }

  app.post("/auth/signup", async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : null;
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }
      const userRow = await createUser(
        { run, get },
        {
          email,
          password,
          name,
        }
      );
      const workspace = await createWorkspaceWithOwner(
        { run, get },
        {
          name: "My Space",
          userId: userRow.id,
        }
      );
      await ensureWorkspaceEntity(
        { run, get },
        workspace.id,
        { name: "Personal", type: "personal" }
      );
      const session = await createSession({ run }, userRow.id);
      res.status(201).json({
        ...(await buildAuthPayload(userRow)),
        token: session.token,
        session_expires_at: session.expires_at,
      });
    } catch (error) {
      handleError(res, error, "Failed to sign up");
    }
  });

  app.post("/auth/login", async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }
      const userRow = await getUserByEmail({ get }, email);
      if (!userRow || !verifyPassword(password, userRow.password_hash)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const session = await createSession({ run }, userRow.id);
      res.json({
        ...(await buildAuthPayload(userRow)),
        token: session.token,
        session_expires_at: session.expires_at,
      });
    } catch (error) {
      handleError(res, error, "Failed to log in");
    }
  });

  app.post("/auth/logout", async (req, res) => {
    try {
      const token = readBearerToken(req);
      if (token) {
        await revokeSession({ run }, token);
      }
      res.json({ ok: true });
    } catch (error) {
      handleError(res, error, "Failed to log out");
    }
  });

  app.get("/auth/me", async (req, res) => {
    try {
      if (!req.currentUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      res.json(await buildAuthPayload(req.currentUser));
    } catch (error) {
      handleError(res, error, "Failed to load current user");
    }
  });
}

module.exports = {
  registerAuthRoutes,
};
