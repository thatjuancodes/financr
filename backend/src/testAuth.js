const {
  DEFAULT_LOCAL_USER_EMAIL,
  DEFAULT_LOCAL_USER_PASSWORD,
} = require("./auth");

async function loginDefaultUser(baseUrl) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: DEFAULT_LOCAL_USER_EMAIL,
      password: DEFAULT_LOCAL_USER_PASSWORD,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to log in default user: ${JSON.stringify(data)}`);
  }

  return {
    token: String(data.token || ""),
    workspaceId: String(data.activeWorkspace?.id || data.workspaces?.[0]?.id || ""),
  };
}

module.exports = {
  loginDefaultUser,
};
