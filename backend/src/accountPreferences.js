function normalizeEntityId(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeOptionalAccountId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function accountPreferencePriority(kind, accountType) {
  const normalizedKind = String(kind || "").trim().toLowerCase();
  const normalizedType = String(accountType || "").trim().toLowerCase();
  if (normalizedKind === "income") {
    if (normalizedType === "bank") {
      return 1;
    }
    if (normalizedType === "cash") {
      return 2;
    }
    if (normalizedType === "ewallet") {
      return 3;
    }
    return 4;
  }
  if (normalizedType === "cash") {
    return 1;
  }
  if (normalizedType === "bank") {
    return 2;
  }
  if (normalizedType === "ewallet") {
    return 3;
  }
  return 4;
}

async function listEntityAccountPreferences(all) {
  const rows = await all(
    `
    SELECT entity_id, default_expense_account_id, default_income_account_id
    FROM entity_account_preferences
    ORDER BY entity_id ASC
    `
  );
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    entity_id: String(row.entity_id || ""),
    default_expense_account_id: normalizeOptionalAccountId(
      row.default_expense_account_id
    ),
    default_income_account_id: normalizeOptionalAccountId(
      row.default_income_account_id
    ),
  }));
}

async function getEntityAccountPreference(get, entityId) {
  const normalizedEntityId = normalizeEntityId(entityId);
  if (!normalizedEntityId) {
    return null;
  }
  const row = await get(
    `
    SELECT entity_id, default_expense_account_id, default_income_account_id
    FROM entity_account_preferences
    WHERE entity_id = ?
    `,
    [normalizedEntityId]
  );
  if (!row) {
    return null;
  }
  return {
    entity_id: String(row.entity_id || normalizedEntityId),
    default_expense_account_id: normalizeOptionalAccountId(
      row.default_expense_account_id
    ),
    default_income_account_id: normalizeOptionalAccountId(
      row.default_income_account_id
    ),
  };
}

async function resolveEntityDefaultAccountId({ get, all, entityId, kind }) {
  const normalizedEntityId = normalizeEntityId(entityId);
  if (!normalizedEntityId) {
    return null;
  }

  const [entityPreference, settingsRow, accountRows] = await Promise.all([
    getEntityAccountPreference(get, normalizedEntityId),
    get(
      `
      SELECT default_expense_account_id, default_income_account_id
      FROM settings
      WHERE id = 1
      `
    ),
    all(
      `
      SELECT id, type, created_at
      FROM accounts
      WHERE entity_id = ?
      ORDER BY created_at ASC, id ASC
      `,
      [normalizedEntityId]
    ),
  ]);

  const accounts = Array.isArray(accountRows) ? accountRows : [];
  const accountIds = new Set(
    accounts
      .map((item) => normalizeOptionalAccountId(item?.id))
      .filter((id) => id !== null)
      .map(String)
  );
  const entityPreferredId =
    kind === "income"
      ? normalizeOptionalAccountId(entityPreference?.default_income_account_id)
      : normalizeOptionalAccountId(entityPreference?.default_expense_account_id);
  if (entityPreferredId && accountIds.has(String(entityPreferredId))) {
    return entityPreferredId;
  }

  const globalPreferredId =
    kind === "income"
      ? normalizeOptionalAccountId(settingsRow?.default_income_account_id)
      : normalizeOptionalAccountId(settingsRow?.default_expense_account_id);
  if (globalPreferredId && accountIds.has(String(globalPreferredId))) {
    return globalPreferredId;
  }

  const sortedAccounts = [...accounts].sort((left, right) => {
    const priorityDelta =
      accountPreferencePriority(kind, left?.type) -
      accountPreferencePriority(kind, right?.type);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    const createdAtDelta = String(left?.created_at || "").localeCompare(
      String(right?.created_at || "")
    );
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }
    return Number(left?.id ?? 0) - Number(right?.id ?? 0);
  });

  return normalizeOptionalAccountId(sortedAccounts[0]?.id);
}

module.exports = {
  listEntityAccountPreferences,
  getEntityAccountPreference,
  resolveEntityDefaultAccountId,
  normalizeOptionalAccountId,
};
