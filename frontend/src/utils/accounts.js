import { formatAmountInput, parseAmountInput, todayISO } from "./format";

export const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-wallet" },
];

export const ACCOUNT_CURRENCY_OPTIONS = [
  "PHP",
  "USD",
  "VND",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
];

export const ENTITY_TYPE_OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "family", label: "Family" },
  { value: "business", label: "Business" },
];

export const TRANSACTION_TYPES = [
  { value: "income", label: "Income" },
  { value: "initial_balance", label: "Initial Balance" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];

export function defaultAccountSelection(accounts, preferredType = "cash") {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return "";
  }
  const preferred = accounts.find((item) => item.type === preferredType);
  if (preferred?.id) {
    return String(preferred.id);
  }
  return String(accounts[0].id);
}

export function preferredAccountSelection(
  accounts,
  preferredAccountId,
  fallbackType = "cash"
) {
  const preferred = String(preferredAccountId ?? "").trim();
  if (preferred) {
    const match = accounts.find((item) => String(item.id) === preferred);
    if (match?.id) {
      return String(match.id);
    }
  }
  return defaultAccountSelection(accounts, fallbackType);
}

export function normalizeDefaultAccountPreferences(settings, accounts) {
  return normalizeDefaultAccountPreferencesForEntity(settings, accounts, "");
}

export function normalizeDefaultAccountPreferencesForEntity(
  settings,
  accounts,
  entityId = ""
) {
  const normalizedEntityId = String(entityId || "").trim();
  const normalizedAccounts = (Array.isArray(accounts) ? accounts : []).filter((item) =>
    normalizedEntityId
      ? String(item?.entity_id || "") === normalizedEntityId
      : true
  );
  const entityDefaults = Array.isArray(settings?.entity_default_accounts)
    ? settings.entity_default_accounts.find(
        (item) => String(item?.entity_id || "") === normalizedEntityId
      ) || null
    : null;
  const defaultExpenseAccountId = preferredAccountSelection(
    normalizedAccounts,
    entityDefaults?.default_expense_account_id ?? settings?.default_expense_account_id,
    "cash"
  );
  const defaultIncomeAccountId = preferredAccountSelection(
    normalizedAccounts,
    entityDefaults?.default_income_account_id ?? settings?.default_income_account_id,
    "bank"
  );
  return {
    default_expense_account_id: defaultExpenseAccountId,
    default_income_account_id: defaultIncomeAccountId || defaultExpenseAccountId,
  };
}

export function buildDefaultAccountPreferencesByEntity(settings, accounts, entities) {
  const map = {};
  (Array.isArray(entities) ? entities : []).forEach((entity) => {
    const entityId = String(entity?.id || "");
    if (!entityId) {
      return;
    }
    map[entityId] = normalizeDefaultAccountPreferencesForEntity(
      settings,
      accounts,
      entityId
    );
  });
  return map;
}

export function balanceColor(value) {
  const numeric = Number(value ?? 0);
  if (numeric > 0) {
    return "#15803d";
  }
  if (numeric < 0) {
    return "#dc2626";
  }
  return "#334155";
}

export function isProtectedCashOnHandAccount(account) {
  return (
    String(account?.name || "").trim().toLowerCase() === "cash on hand" &&
    String(account?.type || "").trim().toLowerCase() === "cash"
  );
}

export function buildTransactionPayloadFromDraft(draft) {
  return {
    type: draft.type,
    amount: parseAmountInput(draft.amount),
    from_account_id: draft.from_account_id === "" ? null : Number(draft.from_account_id),
    to_account_id: draft.to_account_id === "" ? null : Number(draft.to_account_id),
    category: draft.category.trim() || null,
    note: draft.note.trim() || null,
    created_at: draft.created_at,
  };
}

export function findCompatibleTransferTarget(
  accounts,
  fromAccountId,
  fallbackType = "cash"
) {
  const sourceAccount = (Array.isArray(accounts) ? accounts : []).find(
    (item) => String(item.id) === String(fromAccountId)
  );
  if (!sourceAccount) {
    return "";
  }
  const sameCurrency = (Array.isArray(accounts) ? accounts : []).filter(
    (item) =>
      String(item.id) !== String(fromAccountId) &&
      String(item.currency_code || "PHP").toUpperCase() ===
        String(sourceAccount.currency_code || "PHP").toUpperCase()
  );
  const preferred = sameCurrency.find((item) => item.type === fallbackType);
  if (preferred?.id) {
    return String(preferred.id);
  }
  if (sameCurrency[0]?.id) {
    return String(sameCurrency[0].id);
  }
  return String(
    ((Array.isArray(accounts) ? accounts : []).find(
      (item) => String(item.id) !== String(fromAccountId)
    ) || {}).id || ""
  );
}

export function normalizeTransactionDraftByType(
  draft,
  accounts,
  defaultAccountPreferences,
  nextType = draft.type
) {
  const defaultExpense = preferredAccountSelection(
    accounts,
    defaultAccountPreferences?.default_expense_account_id,
    "cash"
  );
  const defaultIncome = preferredAccountSelection(
    accounts,
    defaultAccountPreferences?.default_income_account_id,
    "bank"
  );
  const defaultCash = defaultAccountSelection(accounts, "cash");
  const defaultBank = defaultAccountSelection(accounts, "bank");

  const next = {
    ...draft,
    type: nextType,
  };
  const validAccountIds = new Set((accounts || []).map((item) => String(item.id)));
  if (next.from_account_id && !validAccountIds.has(String(next.from_account_id))) {
    next.from_account_id = "";
  }
  if (next.to_account_id && !validAccountIds.has(String(next.to_account_id))) {
    next.to_account_id = "";
  }

  if (nextType === "income" || nextType === "initial_balance") {
    next.from_account_id = "";
    if (!next.to_account_id) {
      next.to_account_id = defaultIncome || defaultExpense || defaultCash;
    }
  }

  if (nextType === "expense") {
    next.to_account_id = "";
    if (!next.from_account_id) {
      next.from_account_id = defaultExpense || defaultCash;
    }
  }

  if (nextType === "transfer") {
    if (!next.from_account_id) {
      next.from_account_id = defaultBank || defaultCash;
    }
    if (!next.to_account_id) {
      next.to_account_id = findCompatibleTransferTarget(accounts, next.from_account_id, "cash");
    }
    if (next.from_account_id && next.to_account_id && next.from_account_id === next.to_account_id) {
      next.to_account_id = findCompatibleTransferTarget(accounts, next.from_account_id, "cash");
    }
  }

  return next;
}

export function createBlankTransactionDraft(
  accounts,
  type = "expense",
  defaultAccountPreferences = null
) {
  return normalizeTransactionDraftByType(
    {
      type,
      amount: "",
      from_account_id: "",
      to_account_id: "",
      category: "",
      note: "",
      created_at: todayISO(),
    },
    accounts,
    defaultAccountPreferences,
    type
  );
}

export function toTransactionDraft(item, accounts, defaultAccountPreferences = null) {
  const draft = {
    type: String(item?.type || "expense"),
    amount: formatAmountInput(String(item?.amount ?? "")),
    from_account_id:
      item?.from_account_id === null || item?.from_account_id === undefined
        ? ""
        : String(item.from_account_id),
    to_account_id:
      item?.to_account_id === null || item?.to_account_id === undefined
        ? ""
        : String(item.to_account_id),
    category: String(item?.category || ""),
    note: String(item?.note || ""),
    created_at: String(item?.created_at || todayISO()).slice(0, 10),
  };
  return normalizeTransactionDraftByType(
    draft,
    accounts,
    defaultAccountPreferences,
    draft.type
  );
}

export function createBlankAccountDraft(entityId = "", currencyCode = "PHP") {
  return {
    name: "",
    type: "cash",
    entity_id: entityId ? String(entityId) : "",
    institution_id: "",
    currency_code: String(currencyCode || "PHP"),
    initial_amount: "",
    initial_date: todayISO(),
  };
}

export function toEditAccountDraft(account) {
  return {
    name: String(account?.name || ""),
    type: String(account?.type || "cash"),
    entity_id: String(account?.entity_id || ""),
    institution_id: String(account?.institution_id || account?.institution?.id || ""),
    currency_code: String(account?.currency_code || "PHP"),
    initial_amount: "",
    initial_date: todayISO(),
  };
}

export function institutionsForAccountType(institutions, accountType) {
  const institutionType =
    accountType === "bank" ? "bank" : accountType === "ewallet" ? "e_wallet" : null;
  if (!institutionType) {
    return [];
  }
  return (Array.isArray(institutions) ? institutions : [])
    .filter((item) => String(item?.type || "") === institutionType)
    .sort((left, right) =>
      String(left?.name || "").localeCompare(String(right?.name || ""))
    );
}

export function normalizeAccountDraftByType(draft, institutions, nextType = draft.type) {
  const next = {
    ...draft,
    type: nextType,
  };
  if (nextType === "cash") {
    next.institution_id = "";
    return next;
  }
  const validInstitutionIds = new Set(
    institutionsForAccountType(institutions, nextType).map((item) => String(item.id))
  );
  if (!validInstitutionIds.has(String(next.institution_id || ""))) {
    next.institution_id = "";
  }
  return next;
}

export function summarizeCurrencyTotals(items) {
  const totals = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const currencyCode = String(item?.currency_code || "PHP").trim().toUpperCase() || "PHP";
    const amount = Number(item?.balance ?? 0);
    if (!Number.isFinite(amount)) {
      return;
    }
    totals.set(currencyCode, Number(totals.get(currencyCode) || 0) + amount);
  });
  return Array.from(totals.entries())
    .map(([currency_code, total]) => ({ currency_code, total }))
    .sort((left, right) => left.currency_code.localeCompare(right.currency_code));
}

export function formatAccountOptionLabel(account) {
  const parts = [String(account?.name || "").trim()];
  if (account?.entity_name) {
    parts.push(`(${account.entity_name})`);
  }
  const currencyCode = String(account?.currency_code || "PHP").trim().toUpperCase();
  if (currencyCode) {
    parts.push(`- ${currencyCode}`);
  }
  return parts.filter(Boolean).join(" ");
}

export function createTransferDraft(accounts) {
  const fromAccountId = defaultAccountSelection(accounts, "bank") || "";
  const toAccountId = findCompatibleTransferTarget(accounts, fromAccountId, "cash");
  return {
    from_account_id: String(fromAccountId || ""),
    to_account_id: String(toAccountId || ""),
    amount: "",
    transfer_fee_amount: "",
    mirror_as_income_expense: true,
    expense_category_id: "",
    income_category_id: "",
    date: todayISO(),
    notes: "",
  };
}

export function createBlankEntityDraft(defaultType = "personal") {
  return {
    name: "",
    type: defaultType,
  };
}

export function createDistributionDraft(accounts) {
  return {
    date: todayISO(),
    to_account_id: defaultAccountSelection(accounts, "cash") || "",
    amount: "",
  };
}

export function createBalanceAdjustmentDraft(accountId = "") {
  return {
    to_account_id: accountId ? String(accountId) : "",
    amount: "",
    date: todayISO(),
    note: "",
  };
}
