import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { resolveCategoryColor } from "../utils/categoryColors";
import Banner from "./ui/Banner";
import AccountsViewDrawers from "./AccountsViewDrawers";
import {
  AccountsEntitiesSection,
  AccountsTransactionsSection,
  AccountsTransfersSection,
} from "./AccountsViewSections";
import { formatAmountInput, parseAmountInput, todayISO } from "../utils/format";
import {
  ACCOUNT_CURRENCY_OPTIONS,
  ACCOUNT_TYPES,
  ENTITY_TYPE_OPTIONS,
  TRANSACTION_TYPES,
  balanceColor,
  buildTransactionPayloadFromDraft,
  createBalanceAdjustmentDraft,
  createBlankAccountDraft,
  createBlankEntityDraft,
  createBlankTransactionDraft,
  createDistributionDraft,
  createTransferDraft,
  buildDefaultAccountPreferencesByEntity,
  formatAccountOptionLabel,
  institutionsForAccountType,
  isProtectedCashOnHandAccount,
  normalizeAccountDraftByType,
  normalizeDefaultAccountPreferencesForEntity,
  normalizeTransactionDraftByType,
  summarizeCurrencyTotals,
  toEditAccountDraft,
  toTransactionDraft,
} from "../utils/accounts";

export default function AccountsView({
  formatMoney,
  selectedEntityId: globalSelectedEntityId = null,
  onSelectedEntityIdChange = null,
  onEntitiesChange = null,
  institutions = [],
  expenseCategoryOptions = [],
  incomeCategoryOptions = [],
  currency = "PHP",
  currencyOptions = ACCOUNT_CURRENCY_OPTIONS,
}) {
  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(() =>
    String(globalSelectedEntityId || "")
  );
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [settingsSnapshot, setSettingsSnapshot] = useState(null);
  const [defaultAccountPreferencesByEntity, setDefaultAccountPreferencesByEntity] =
    useState({});

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [defaultAccountError, setDefaultAccountError] = useState("");
  const [isDefaultAccountSubmitting, setIsDefaultAccountSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    account_id: "",
    type: "",
    date_from: "",
    date_to: "",
  });

  const [accountDrawerMode, setAccountDrawerMode] = useState(null);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [accountDrawerDraft, setAccountDrawerDraft] = useState(
    createBlankAccountDraft("", currency)
  );
  const [accountDrawerError, setAccountDrawerError] = useState("");
  const [isAccountDrawerSubmitting, setIsAccountDrawerSubmitting] = useState(false);
  const [removingAccountId, setRemovingAccountId] = useState(null);

  const [transactionDrawerMode, setTransactionDrawerMode] = useState(null);
  const [activeTransactionId, setActiveTransactionId] = useState(null);
  const [transactionDrawerDraft, setTransactionDrawerDraft] = useState(
    createBlankTransactionDraft([], "expense", null)
  );
  const [transactionDrawerError, setTransactionDrawerError] = useState("");
  const [isTransactionDrawerSubmitting, setIsTransactionDrawerSubmitting] =
    useState(false);
  const [removingTransactionId, setRemovingTransactionId] = useState(null);

  const [isDistributionDrawerOpen, setIsDistributionDrawerOpen] = useState(false);
  const [distributionDate, setDistributionDate] = useState(todayISO());
  const [distributionToAccountId, setDistributionToAccountId] = useState("");
  const [distributionAmount, setDistributionAmount] = useState("");
  const [distributionDrawerError, setDistributionDrawerError] = useState("");
  const [isDistributionSubmitting, setIsDistributionSubmitting] = useState(false);

  const [isBalanceAdjustmentDrawerOpen, setIsBalanceAdjustmentDrawerOpen] = useState(false);
  const [balanceAdjustmentDraft, setBalanceAdjustmentDraft] = useState(
    createBalanceAdjustmentDraft("")
  );
  const [balanceAdjustmentDrawerError, setBalanceAdjustmentDrawerError] = useState("");
  const [isBalanceAdjustmentSubmitting, setIsBalanceAdjustmentSubmitting] = useState(false);
  const [transferFilters, setTransferFilters] = useState({
    date_from: "",
    date_to: "",
  });
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);
  const [transferDraft, setTransferDraft] = useState(createTransferDraft([]));
  const [transferDrawerError, setTransferDrawerError] = useState("");
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);
  const [removingTransferId, setRemovingTransferId] = useState(null);
  const [entityDrawerMode, setEntityDrawerMode] = useState(null);
  const [activeEntityId, setActiveEntityId] = useState(null);
  const [entityDrawerDraft, setEntityDrawerDraft] = useState(
    createBlankEntityDraft("business")
  );
  const [entityDrawerError, setEntityDrawerError] = useState("");
  const [isEntitySubmitting, setIsEntitySubmitting] = useState(false);
  const [removingEntityId, setRemovingEntityId] = useState(null);
  const [collapsedEntityIds, setCollapsedEntityIds] = useState({});

  const didInitialLoadRef = useRef(false);
  const selectedEntityIdRef = useRef(String(globalSelectedEntityId || ""));
  const globalSelectedEntityIdRef = useRef(String(globalSelectedEntityId || ""));
  const onSelectedEntityIdChangeRef = useRef(onSelectedEntityIdChange);
  const onEntitiesChangeRef = useRef(onEntitiesChange);

  useEffect(() => {
    selectedEntityIdRef.current = selectedEntityId;
  }, [selectedEntityId]);

  useEffect(() => {
    onSelectedEntityIdChangeRef.current = onSelectedEntityIdChange;
  }, [onSelectedEntityIdChange]);

  useEffect(() => {
    onEntitiesChangeRef.current = onEntitiesChange;
  }, [onEntitiesChange]);

  useEffect(() => {
    if (globalSelectedEntityId === null || globalSelectedEntityId === undefined) {
      return;
    }
    const normalized = String(globalSelectedEntityId || "");
    globalSelectedEntityIdRef.current = normalized;
    setSelectedEntityId((prev) => (prev === normalized ? prev : normalized));
  }, [globalSelectedEntityId]);

  const handleSelectedEntityChange = useCallback((nextValue) => {
    const normalized = String(nextValue || "");
    setSelectedEntityId(normalized);
    const callback = onSelectedEntityIdChangeRef.current;
    if (typeof callback === "function") {
      callback(normalized);
    }
  }, []);

  const formatMoneyForCurrency = useCallback(
    (value, currencyCode = currency) => {
      const resolvedCurrency =
        String(currencyCode || currency || "PHP").trim().toUpperCase() || "PHP";
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: resolvedCurrency,
      }).format(Number(value ?? 0));
    },
    [currency]
  );

  const formatCurrencySummary = useCallback(
    (summary) => {
      const rows = Array.isArray(summary) ? summary : [];
      if (rows.length === 0) {
        return formatMoneyForCurrency(0, currency);
      }
      return rows
        .map((item) => formatMoneyForCurrency(item.total, item.currency_code))
        .join(" • ");
    },
    [currency, formatMoneyForCurrency]
  );

  const totalBalance = useMemo(() => summarizeCurrencyTotals(accounts), [accounts]);

  const activeAccountItem = useMemo(() => {
    if (activeAccountId === null) {
      return null;
    }
    return accounts.find((item) => item.id === activeAccountId) || null;
  }, [accounts, activeAccountId]);

  const accountInstitutionOptions = useMemo(() => {
    return institutionsForAccountType(institutions, accountDrawerDraft.type);
  }, [institutions, accountDrawerDraft.type]);

  const selectedAccountInstitution = useMemo(() => {
    return (
      accountInstitutionOptions.find(
        (item) => String(item.id) === String(accountDrawerDraft.institution_id || "")
      ) || null
    );
  }, [accountDrawerDraft.institution_id, accountInstitutionOptions]);

  const filteredAccounts = useMemo(() => {
    return accounts;
  }, [accounts]);

  const accountById = useMemo(() => {
    return new Map(accounts.map((item) => [String(item.id), item]));
  }, [accounts]);

  const expenseCategoryColorByName = useMemo(() => {
    const map = new Map();
    expenseCategoryOptions.forEach((item) => {
      const name = String(item?.name || "").trim();
      if (!name) {
        return;
      }
      map.set(name, resolveCategoryColor(item.color, `expense:${item.id}:${name}`));
    });
    return map;
  }, [expenseCategoryOptions]);

  const incomeCategoryColorByName = useMemo(() => {
    const map = new Map();
    incomeCategoryOptions.forEach((item) => {
      const name = String(item?.name || "").trim();
      if (!name) {
        return;
      }
      map.set(name, resolveCategoryColor(item.color, `income:${item.id}:${name}`));
    });
    return map;
  }, [incomeCategoryOptions]);

  const getTransactionCategoryColor = useCallback(
    (item) => {
      const categoryName = String(item?.category || "").trim();
      if (!categoryName) {
        return null;
      }

      if (item?.type === "income") {
        return (
          incomeCategoryColorByName.get(categoryName) ||
          resolveCategoryColor(null, `income:${categoryName}`)
        );
      }

      if (item?.type === "expense" || item?.type === "debt") {
        return (
          expenseCategoryColorByName.get(categoryName) ||
          resolveCategoryColor(null, `expense:${categoryName}`)
        );
      }

      if (item?.type === "transfer") {
        const normalizedSelectedEntityId = String(selectedEntityId || "").trim();
        if (
          normalizedSelectedEntityId &&
          String(item?.from_entity_id || "") === normalizedSelectedEntityId
        ) {
          return (
            expenseCategoryColorByName.get(categoryName) ||
            resolveCategoryColor(null, `expense:${categoryName}`)
          );
        }
        if (
          normalizedSelectedEntityId &&
          String(item?.to_entity_id || "") === normalizedSelectedEntityId
        ) {
          return (
            incomeCategoryColorByName.get(categoryName) ||
            resolveCategoryColor(null, `income:${categoryName}`)
          );
        }
        return (
          expenseCategoryColorByName.get(categoryName) ||
          incomeCategoryColorByName.get(categoryName) ||
          resolveCategoryColor(null, `transfer:${categoryName}`)
        );
      }

      return resolveCategoryColor(null, `transaction:${categoryName}`);
    },
    [
      expenseCategoryColorByName,
      incomeCategoryColorByName,
      selectedEntityId,
    ]
  );

  const transferFromAccount = useMemo(() => {
    return accountById.get(String(transferDraft.from_account_id || "")) || null;
  }, [accountById, transferDraft.from_account_id]);

  const transferToAccount = useMemo(() => {
    return accountById.get(String(transferDraft.to_account_id || "")) || null;
  }, [accountById, transferDraft.to_account_id]);

  const transferTargetAccounts = useMemo(() => {
    if (!transferFromAccount) {
      return accounts;
    }
    return accounts.filter(
      (account) =>
        String(account.id) !== String(transferFromAccount.id) &&
        String(account.currency_code || "PHP").toUpperCase() ===
          String(transferFromAccount.currency_code || "PHP").toUpperCase()
    );
  }, [accounts, transferFromAccount]);

  const isTransferCrossEntity = useMemo(() => {
    if (!transferFromAccount || !transferToAccount) {
      return false;
    }
    return String(transferFromAccount.entity_id) !== String(transferToAccount.entity_id);
  }, [transferFromAccount, transferToAccount]);

  const isTransferCurrencyMismatch = useMemo(() => {
    if (!transferFromAccount || !transferToAccount) {
      return false;
    }
    return String(transferFromAccount.currency_code || "PHP").toUpperCase() !==
      String(transferToAccount.currency_code || "PHP").toUpperCase();
  }, [transferFromAccount, transferToAccount]);

  const accountCountByEntityId = useMemo(() => {
    const map = new Map();
    accounts.forEach((item) => {
      const key = String(item?.entity_id || "");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [accounts]);

  const currentDefaultAccountPreferences = useMemo(() => {
    return normalizeDefaultAccountPreferencesForEntity(
      settingsSnapshot,
      accounts,
      selectedEntityId
    );
  }, [settingsSnapshot, accounts, selectedEntityId]);

  const preferredEntityIdForNewAccount = useMemo(() => {
    const hasSelectedEntity = entities.some(
      (item) => String(item.id) === String(selectedEntityId)
    );
    if (hasSelectedEntity) {
      return String(selectedEntityId);
    }
    const personalEntity = entities.find((item) => item.type === "personal");
    return String(personalEntity?.id || entities[0]?.id || "");
  }, [entities, selectedEntityId]);

  const entityAccountGroups = useMemo(() => {
    return entities.map((entity) => {
      const entityAccounts = accounts
        .filter((item) => String(item?.entity_id || "") === String(entity.id))
        .slice()
        .sort((left, right) => {
          const balanceDiff = Number(right?.balance ?? 0) - Number(left?.balance ?? 0);
          if (Math.abs(balanceDiff) > 0.0001) {
            return balanceDiff;
          }
          return String(left?.name || "").localeCompare(String(right?.name || ""));
        });
      return {
        entity,
        accounts: entityAccounts,
        totalBalanceSummary: summarizeCurrencyTotals(entityAccounts),
        accountCount: entityAccounts.length,
        isCollapsed: !!collapsedEntityIds[String(entity.id)],
      };
    });
  }, [accounts, collapsedEntityIds, entities]);

  const refreshAccountsAndBalance = useCallback(async () => {
    const currentSelectedEntityId = String(selectedEntityIdRef.current || "");
    const [entityRows, accountRows, settings] = await Promise.all([
      api.getEntities(),
      api.getAccounts(),
      api.getSettings(),
    ]);
    const normalizedEntities = Array.isArray(entityRows) ? entityRows : [];
    const normalizedAccounts = Array.isArray(accountRows) ? accountRows : [];
    setEntities(normalizedEntities);
    setAccounts(normalizedAccounts);
    setSettingsSnapshot(settings || null);
    const entitiesCallback = onEntitiesChangeRef.current;
    if (typeof entitiesCallback === "function") {
      entitiesCallback(normalizedEntities);
    }
    const hasCurrentSelection = normalizedEntities.some(
      (item) => String(item.id) === currentSelectedEntityId
    );
    const personal = normalizedEntities.find((item) => item.type === "personal");
    const nextSelectedEntityId = hasCurrentSelection
      ? currentSelectedEntityId
      : String(personal?.id || normalizedEntities[0]?.id || "");
    if (nextSelectedEntityId !== currentSelectedEntityId) {
      setSelectedEntityId(nextSelectedEntityId);
      const selectedEntityCallback = onSelectedEntityIdChangeRef.current;
      if (typeof selectedEntityCallback === "function") {
        selectedEntityCallback(nextSelectedEntityId);
      }
    }
    setDefaultAccountPreferencesByEntity(
      buildDefaultAccountPreferencesByEntity(
        settings,
        normalizedAccounts,
        normalizedEntities
      )
    );
  }, []);

  const refreshTransactions = useCallback(async () => {
    const rows = await api.getTransactions({
      account_id: filters.account_id || undefined,
      type: filters.type || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    });
    setTransactions(Array.isArray(rows) ? rows : []);
  }, [filters]);

  const refreshTransfers = useCallback(async () => {
    const rows = await api.getTransfers({
      date_from: transferFilters.date_from || undefined,
      date_to: transferFilters.date_to || undefined,
    });
    setTransfers(Array.isArray(rows) ? rows : []);
  }, [transferFilters.date_from, transferFilters.date_to]);

  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([
      refreshAccountsAndBalance(),
      refreshTransactions(),
      refreshTransfers(),
    ]);
  }, [refreshAccountsAndBalance, refreshTransactions, refreshTransfers]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([refreshAccountsAndBalance(), refreshTransactions(), refreshTransfers()])
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load account data");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          didInitialLoadRef.current = true;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshAccountsAndBalance]);

  useEffect(() => {
    if (!didInitialLoadRef.current) {
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([refreshTransactions(), refreshTransfers()])
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load transactions");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTransactions, refreshTransfers]);

  useEffect(() => {
    if (!filters.account_id) {
      return;
    }
    const exists = filteredAccounts.some(
      (item) => String(item.id) === String(filters.account_id)
    );
    if (!exists) {
      setFilters((prev) => ({ ...prev, account_id: "" }));
    }
  }, [filters.account_id, filteredAccounts]);

  useEffect(() => {
    setAccountDrawerDraft((prev) => {
      const next = normalizeAccountDraftByType(prev, institutions, prev.type);
      if (
        next.type === prev.type &&
        next.entity_id === prev.entity_id &&
        next.institution_id === prev.institution_id &&
        next.currency_code === prev.currency_code
      ) {
        return prev;
      }
      return next;
    });
  }, [institutions]);

  const closeAccountDrawer = () => {
    setAccountDrawerMode(null);
    setActiveAccountId(null);
    setAccountDrawerError("");
    setAccountDrawerDraft(createBlankAccountDraft(preferredEntityIdForNewAccount, currency));
  };

  const openAddAccountDrawer = (entityId = preferredEntityIdForNewAccount) => {
    setError("");
    setNotice("");
    setAccountDrawerError("");
    setAccountDrawerMode("add");
    setActiveAccountId(null);
    setAccountDrawerDraft(
      normalizeAccountDraftByType(
        createBlankAccountDraft(entityId, currency),
        institutions,
        "cash"
      )
    );
  };

  const openEditAccountDrawer = (accountId) => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account) {
      return;
    }
    setError("");
    setNotice("");
    setAccountDrawerError("");
    setAccountDrawerMode("edit");
    setActiveAccountId(accountId);
    setAccountDrawerDraft(
      normalizeAccountDraftByType(toEditAccountDraft(account), institutions, account.type)
    );
  };

  const handleRemoveAccount = async (accountId) => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account) {
      return;
    }
    if (isProtectedCashOnHandAccount(account)) {
      setAccountDrawerError("Cash on Hand account cannot be removed.");
      setError("Cash on Hand account cannot be removed.");
      return;
    }

    const confirmed = window.confirm(
      `Remove account "${account.name}"? Current balance ${formatMoneyForCurrency(
        account.balance,
        account.currency_code
      )}.`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setAccountDrawerError("");
    setRemovingAccountId(accountId);
    try {
      const result = await api.deleteAccount(accountId);
      if (String(filters.account_id) === String(accountId)) {
        setFilters((prev) => ({ ...prev, account_id: "" }));
      }
      await refreshAfterMutation();
      closeAccountDrawer();
      setNotice("Account removed.");
    } catch (err) {
      const message = err.message || "Failed to remove account";
      setAccountDrawerError(message);
      setError(message);
    } finally {
      setRemovingAccountId(null);
    }
  };

  const handleAccountDrawerSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setAccountDrawerError("");
    setIsAccountDrawerSubmitting(true);

    try {
      const entityId = String(accountDrawerDraft.entity_id || "").trim();
      const institutionId = String(accountDrawerDraft.institution_id || "").trim();
      const isInstitutionAccount =
        accountDrawerDraft.type === "bank" || accountDrawerDraft.type === "ewallet";
      const existingInstitutionId = String(
        activeAccountItem?.institution_id || activeAccountItem?.institution?.id || ""
      ).trim();
      const isLegacyInstitutionOptional =
        accountDrawerMode === "edit" &&
        isInstitutionAccount &&
        String(activeAccountItem?.type || "").trim() === String(accountDrawerDraft.type || "").trim() &&
        !existingInstitutionId &&
        !institutionId;
      if (!entityId) {
        throw new Error("Select an entity.");
      }
      if (accountDrawerDraft.type === "cash" && institutionId) {
        throw new Error("Cash accounts cannot have an institution.");
      }
      if (isInstitutionAccount && !institutionId && !isLegacyInstitutionOptional) {
        throw new Error("Select an institution.");
      }

      if (accountDrawerMode === "edit" && activeAccountId !== null) {
        await api.updateAccount(activeAccountId, {
          name: accountDrawerDraft.name.trim(),
          type: accountDrawerDraft.type,
          entity_id: entityId,
          institution_id: institutionId || null,
          currency_code: accountDrawerDraft.currency_code,
        });
        await refreshAfterMutation();
        setNotice("Account updated.");
        closeAccountDrawer();
        return;
      }

      const created = await api.createAccount({
        name: accountDrawerDraft.name.trim(),
        type: accountDrawerDraft.type,
        entity_id: entityId,
        institution_id: institutionId || null,
        currency_code: accountDrawerDraft.currency_code,
      });

      const initialAmount = Number(parseAmountInput(accountDrawerDraft.initial_amount || "0"));
      if (Number.isFinite(initialAmount) && initialAmount > 0) {
        await api.createTransaction({
          type: "initial_balance",
          amount: initialAmount,
          to_account_id: created.id,
          category: null,
          note: "Initial balance on account creation",
          created_at: accountDrawerDraft.initial_date || todayISO(),
        });
      }

      await refreshAfterMutation();
      setNotice(
        initialAmount > 0
          ? `Account created with ${formatMoneyForCurrency(
              initialAmount,
              accountDrawerDraft.currency_code
            )} initial balance.`
          : "Account created."
      );
      closeAccountDrawer();
    } catch (err) {
      setAccountDrawerError(err.message || "Failed to save account");
    } finally {
      setIsAccountDrawerSubmitting(false);
    }
  };

  const closeEntityDrawer = () => {
    setEntityDrawerMode(null);
    setActiveEntityId(null);
    setEntityDrawerError("");
    setEntityDrawerDraft(createBlankEntityDraft("business"));
  };

  const openAddEntityDrawer = () => {
    setError("");
    setNotice("");
    setEntityDrawerError("");
    setEntityDrawerMode("add");
    setActiveEntityId(null);
    setEntityDrawerDraft(createBlankEntityDraft("business"));
  };

  const openEditEntityDrawer = (entityId) => {
    const entity = entities.find((item) => String(item.id) === String(entityId));
    if (!entity) {
      return;
    }
    setError("");
    setNotice("");
    setEntityDrawerError("");
    setEntityDrawerMode("edit");
    setActiveEntityId(entity.id);
    setEntityDrawerDraft({
      name: String(entity.name || ""),
      type: String(entity.type || "business"),
    });
  };

  const handleEntityDrawerSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setEntityDrawerError("");
    setIsEntitySubmitting(true);
    try {
      const payload = {
        name: String(entityDrawerDraft.name || "").trim(),
        type: String(entityDrawerDraft.type || "").trim().toLowerCase(),
      };
      if (!payload.name || !payload.type) {
        throw new Error("Name and type are required.");
      }

      if (entityDrawerMode === "edit" && activeEntityId) {
        await api.updateEntity(activeEntityId, payload);
        await refreshAfterMutation();
        setNotice("Entity updated.");
        closeEntityDrawer();
        return;
      }

      await api.createEntity(payload);
      await refreshAfterMutation();
      setNotice("Entity created.");
      closeEntityDrawer();
    } catch (err) {
      setEntityDrawerError(err.message || "Failed to save entity");
    } finally {
      setIsEntitySubmitting(false);
    }
  };

  const handleRemoveEntity = async (entityId) => {
    if (removingEntityId !== null) {
      return;
    }
    const entity = entities.find((item) => String(item.id) === String(entityId));
    if (!entity) {
      return;
    }
    const accountCount = Number(accountCountByEntityId.get(String(entity.id)) || 0);
    const confirmed = window.confirm(
      `Remove entity \"${entity.name}\" (${entity.type})?` +
        (accountCount > 0
          ? ` It currently has ${accountCount} account${accountCount === 1 ? "" : "s"}.`
          : "")
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setEntityDrawerError("");
    setRemovingEntityId(entityId);
    try {
      await api.deleteEntity(entityId);
      await refreshAfterMutation();
      if (String(activeEntityId || "") === String(entityId)) {
        closeEntityDrawer();
      }
      setNotice("Entity removed.");
    } catch (err) {
      const message = err.message || "Failed to remove entity";
      setError(message);
      setEntityDrawerError(message);
    } finally {
      setRemovingEntityId(null);
    }
  };

  const closeTransactionDrawer = () => {
    setTransactionDrawerMode(null);
    setActiveTransactionId(null);
    setTransactionDrawerError("");
    setTransactionDrawerDraft(
      createBlankTransactionDraft(accounts, "expense", currentDefaultAccountPreferences)
    );
  };

  const openAddTransactionDrawer = () => {
    if (accounts.length === 0) {
      setError("Create at least one account first.");
      return;
    }
    setError("");
    setNotice("");
    setTransactionDrawerError("");
    setTransactionDrawerMode("add");
    setActiveTransactionId(null);
    setTransactionDrawerDraft(
      createBlankTransactionDraft(
        accounts,
        "expense",
        currentDefaultAccountPreferences
      )
    );
  };

  const openInitialBalanceTransactionDrawer = (accountId) => {
    const hasAccount = accounts.some((item) => item.id === accountId);
    if (!hasAccount) {
      return;
    }
    closeAccountDrawer();
    openDistributionDrawer(accountId);
  };

  const openEditTransactionDrawer = (transactionId) => {
    const item = transactions.find((row) => row.id === transactionId);
    if (!item) {
      return;
    }
    setError("");
    setNotice("");
    setTransactionDrawerError("");
    setTransactionDrawerMode("edit");
    setActiveTransactionId(transactionId);
    setTransactionDrawerDraft(
      toTransactionDraft(item, accounts, currentDefaultAccountPreferences)
    );
  };

  const handleTransactionDrawerChange = (field, value) => {
    setTransactionDrawerDraft((prev) => {
      if (field === "amount") {
        return { ...prev, amount: formatAmountInput(value) };
      }
      if (field === "type") {
        return normalizeTransactionDraftByType(
          {
            ...prev,
            type: value,
          },
          accounts,
          currentDefaultAccountPreferences,
          value
        );
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleTransactionDrawerSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setTransactionDrawerError("");
    setIsTransactionDrawerSubmitting(true);

    try {
      const payload = buildTransactionPayloadFromDraft(transactionDrawerDraft);
      if (payload.type === "transfer" && payload.from_account_id === payload.to_account_id) {
        throw new Error("Transfer must use two different accounts.");
      }
      const isInitialBalanceEntry =
        transactionDrawerMode !== "edit" &&
        payload.type === "initial_balance";
      if (isInitialBalanceEntry && payload.to_account_id === null) {
        throw new Error("Initial balance must target an account.");
      }

      if (transactionDrawerMode === "edit" && activeTransactionId !== null) {
        await api.updateTransaction(activeTransactionId, payload);
      } else {
        await api.createTransaction(payload);
      }

      await refreshAfterMutation();
      setNotice(transactionDrawerMode === "edit" ? "Transaction updated." : "Transaction recorded.");
      closeTransactionDrawer();
    } catch (err) {
      setTransactionDrawerError(err.message || "Failed to save transaction");
    } finally {
      setIsTransactionDrawerSubmitting(false);
    }
  };

  const handleRemoveTransaction = async (transactionId) => {
    if (removingTransactionId !== null) {
      return;
    }
    const item = transactions.find((row) => row.id === transactionId);
    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${item.type} transaction (${formatMoneyForCurrency(
        item.amount,
        item.currency_code
      )}) on ${String(item.created_at || "").slice(0, 10)}?`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setTransactionDrawerError("");
    setRemovingTransactionId(transactionId);
    try {
      await api.deleteTransaction(transactionId);
      await refreshAfterMutation();
      if (activeTransactionId === transactionId) {
        closeTransactionDrawer();
      }
      setNotice("Transaction removed.");
    } catch (err) {
      const message = err.message || "Failed to remove transaction";
      setError(message);
      setTransactionDrawerError(message);
    } finally {
      setRemovingTransactionId(null);
    }
  };

  const openTransferDrawer = () => {
    if (accounts.length < 2) {
      setError("At least two accounts are required to transfer.");
      return;
    }
    setError("");
    setNotice("");
    setTransferDrawerError("");
    setTransferDraft(createTransferDraft(accounts));
    setIsTransferDrawerOpen(true);
  };

  const closeTransferDrawer = () => {
    setIsTransferDrawerOpen(false);
    setTransferDrawerError("");
    setTransferDraft(createTransferDraft(accounts));
  };

  const handleTransferSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setTransferDrawerError("");
    setIsTransferSubmitting(true);

    try {
      const fromAccountId = Number(transferDraft.from_account_id);
      const toAccountId = Number(transferDraft.to_account_id);
      const amount = Number(parseAmountInput(transferDraft.amount || "0"));
      const transferFeeAmount = Number(
        parseAmountInput(transferDraft.transfer_fee_amount || "0")
      );
      if (!Number.isInteger(fromAccountId) || fromAccountId <= 0) {
        throw new Error("Select a source account.");
      }
      if (!Number.isInteger(toAccountId) || toAccountId <= 0) {
        throw new Error("Select a destination account.");
      }
      if (fromAccountId === toAccountId) {
        throw new Error("Transfer must use two different accounts.");
      }
      if (isTransferCurrencyMismatch) {
        throw new Error("Transfer requires accounts with the same currency.");
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid transfer amount.");
      }
      if (!Number.isFinite(transferFeeAmount) || transferFeeAmount < 0) {
        throw new Error("Enter a valid transfer fee.");
      }
      if (!transferDraft.date) {
        throw new Error("Transfer date is required.");
      }
      const mirrorAsIncomeExpense =
        isTransferCrossEntity && Boolean(transferDraft.mirror_as_income_expense);

      await api.createTransfer({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        transfer_fee_amount: transferFeeAmount,
        mirror_as_income_expense: mirrorAsIncomeExpense,
        expense_category_id: mirrorAsIncomeExpense
          ? transferDraft.expense_category_id || null
          : null,
        income_category_id: mirrorAsIncomeExpense
          ? transferDraft.income_category_id || null
          : null,
        date: transferDraft.date,
        notes: transferDraft.notes.trim() || null,
      });
      await refreshAfterMutation();
      setNotice("Transfer recorded.");
      closeTransferDrawer();
    } catch (err) {
      setTransferDrawerError(err.message || "Failed to create transfer");
    } finally {
      setIsTransferSubmitting(false);
    }
  };

  const handleRemoveTransfer = async (transferId) => {
    if (removingTransferId !== null) {
      return;
    }
    const transfer = transfers.find((item) => String(item.id) === String(transferId));
    if (!transfer) {
      return;
    }

    const confirmed = window.confirm(
      `Remove transfer (${formatMoneyForCurrency(
        transfer.amount,
        transfer.currency_code
      )}) on ${String(transfer.date || "").slice(0, 10)}?`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setTransferDrawerError("");
    setRemovingTransferId(String(transferId));
    try {
      await api.deleteTransfer(transferId, {
        source_type: transfer.source_type || undefined,
      });
      await refreshAfterMutation();
      setNotice("Transfer removed.");
    } catch (err) {
      const message = err.message || "Failed to remove transfer";
      setError(message);
      setTransferDrawerError(message);
    } finally {
      setRemovingTransferId(null);
    }
  };

  const closeDistributionDrawer = () => {
    setIsDistributionDrawerOpen(false);
    setDistributionDrawerError("");
  };

  const openDistributionDrawer = (preselectedAccountId = null) => {
    if (accounts.length === 0) {
      setError("Create at least one account first.");
      return;
    }
    setError("");
    setNotice("");
    setDistributionDrawerError("");
    const draft = createDistributionDraft(accounts);
    setDistributionDate(draft.date);
    setDistributionToAccountId(
      preselectedAccountId !== null ? String(preselectedAccountId) : draft.to_account_id
    );
    setDistributionAmount(draft.amount);
    setIsDistributionDrawerOpen(true);
  };

  const handleDistributionSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setDistributionDrawerError("");
    setIsDistributionSubmitting(true);

    try {
      const toAccountId = Number(distributionToAccountId);
      if (!Number.isInteger(toAccountId) || toAccountId <= 0) {
        throw new Error("Select an account.");
      }

      const amount = Number(parseAmountInput(distributionAmount));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid amount.");
      }

      if (!distributionDate) {
        throw new Error("Date is required.");
      }

      await api.createTransaction({
        type: "initial_balance",
        amount,
        to_account_id: toAccountId,
        category: null,
        note: "Initial balance",
        created_at: distributionDate,
      });

      await refreshAfterMutation();
      const targetAccount = accountById.get(String(toAccountId));
      setNotice(
        `Initial balance set to ${formatMoneyForCurrency(
          amount,
          targetAccount?.currency_code
        )}.`
      );
      closeDistributionDrawer();
    } catch (err) {
      setDistributionDrawerError(err.message || "Failed to set initial balance");
    } finally {
      setIsDistributionSubmitting(false);
    }
  };

  const closeBalanceAdjustmentDrawer = () => {
    setIsBalanceAdjustmentDrawerOpen(false);
    setBalanceAdjustmentDrawerError("");
    setBalanceAdjustmentDraft(createBalanceAdjustmentDraft(""));
  };

  const openBalanceAdjustmentDrawer = (accountId = null) => {
    if (accounts.length === 0) {
      setError("Create at least one account first.");
      return;
    }
    const targetAccountId =
      accountId !== null && accounts.some((item) => String(item.id) === String(accountId))
        ? String(accountId)
        : defaultAccountSelection(accounts, "cash");
    setError("");
    setNotice("");
    setBalanceAdjustmentDrawerError("");
    setBalanceAdjustmentDraft(createBalanceAdjustmentDraft(targetAccountId));
    setIsBalanceAdjustmentDrawerOpen(true);
  };

  const handleBalanceAdjustmentSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBalanceAdjustmentDrawerError("");
    setIsBalanceAdjustmentSubmitting(true);

    try {
      const toAccountId = Number(balanceAdjustmentDraft.to_account_id);
      if (!Number.isInteger(toAccountId) || toAccountId <= 0) {
        throw new Error("Select an account for balance adjustment.");
      }

      const amount = Number(parseAmountInput(balanceAdjustmentDraft.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid amount.");
      }

      if (!balanceAdjustmentDraft.date) {
        throw new Error("Adjustment date is required.");
      }

      await api.createTransaction({
        type: "income",
        amount,
        to_account_id: toAccountId,
        category: "balance_adjustment",
        note: balanceAdjustmentDraft.note.trim() || "Balance adjustment",
        created_at: balanceAdjustmentDraft.date,
      });

      await refreshAfterMutation();
      const targetAccount = accountById.get(String(toAccountId));
      setNotice(
        `Balance adjusted by ${formatMoneyForCurrency(
          amount,
          targetAccount?.currency_code
        )}.`
      );
      closeBalanceAdjustmentDrawer();
    } catch (err) {
      setBalanceAdjustmentDrawerError(err.message || "Failed to apply balance adjustment");
    } finally {
      setIsBalanceAdjustmentSubmitting(false);
    }
  };

  const handleSetAccountAsDefault = async (kind, accountId) => {
    if (isDefaultAccountSubmitting) {
      return;
    }
    const account = accounts.find((item) => String(item.id) === String(accountId));
    if (!account) {
      return;
    }
    setError("");
    setNotice("");
    setDefaultAccountError("");
    setIsDefaultAccountSubmitting(true);

    try {
      const settingsField =
        kind === "income" ? "default_income_account_id" : "default_expense_account_id";
      const nextAccountId = Number(accountId);
      const entityDefaults =
        defaultAccountPreferencesByEntity[String(account.entity_id)] ||
        currentDefaultAccountPreferences;
      const currentDefaultAccountId = Number(entityDefaults?.[settingsField]);
      if (!Number.isInteger(nextAccountId) || nextAccountId <= 0) {
        throw new Error("Invalid account selection.");
      }
      if (currentDefaultAccountId === nextAccountId) {
        setNotice(
          `${account.name} is already the default ${
            kind === "income" ? "income" : "expense"
          } account for ${account.entity_name || "this entity"}.`
        );
        return;
      }

      const settings = await api.setDefaultAccounts({
        entity_id: account.entity_id,
        [settingsField]: nextAccountId,
      });
      setSettingsSnapshot(settings || null);
      const normalizedDefaultsByEntity = buildDefaultAccountPreferencesByEntity(
        settings,
        accounts,
        entities
      );
      setDefaultAccountPreferencesByEntity(normalizedDefaultsByEntity);
      setTransactionDrawerDraft((prev) =>
        normalizeTransactionDraftByType(
          prev,
          accounts,
          normalizedDefaultsByEntity[String(selectedEntityId)] ||
            currentDefaultAccountPreferences,
          prev.type
        )
      );
      setNotice(
        `${account.name} set as default ${
          kind === "income" ? "income" : "expense"
        } account for ${account.entity_name || "this entity"}.`
      );
    } catch (err) {
      setDefaultAccountError(err.message || "Failed to update default accounts");
    } finally {
      setIsDefaultAccountSubmitting(false);
    }
  };

  const toggleEntityGroup = (entityId) => {
    setCollapsedEntityIds((prev) => ({
      ...prev,
      [String(entityId)]: !prev[String(entityId)],
    }));
  };

  const isAccountDrawerOpen = accountDrawerMode === "add" || accountDrawerMode === "edit";
  const isEntityDrawerOpen = entityDrawerMode === "add" || entityDrawerMode === "edit";
  const isTransactionDrawerOpen =
    transactionDrawerMode === "add" || transactionDrawerMode === "edit";

  return (
    <>
      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <AccountsEntitiesSection
        accounts={accounts}
        accountDrawerMode={accountDrawerMode}
        activeAccountId={activeAccountId}
        balanceColor={balanceColor}
        defaultAccountError={defaultAccountError}
        defaultAccountPreferencesByEntity={defaultAccountPreferencesByEntity}
        entities={entities}
        entityAccountGroups={entityAccountGroups}
        formatCurrencySummary={formatCurrencySummary}
        formatMoneyForCurrency={formatMoneyForCurrency}
        handleRemoveAccount={handleRemoveAccount}
        handleRemoveEntity={handleRemoveEntity}
        handleSetAccountAsDefault={handleSetAccountAsDefault}
        isProtectedCashOnHandAccount={isProtectedCashOnHandAccount}
        openAddAccountDrawer={openAddAccountDrawer}
        openAddEntityDrawer={openAddEntityDrawer}
        openBalanceAdjustmentDrawer={openBalanceAdjustmentDrawer}
        openDistributionDrawer={openDistributionDrawer}
        openEditAccountDrawer={openEditAccountDrawer}
        openEditEntityDrawer={openEditEntityDrawer}
        openInitialBalanceTransactionDrawer={openInitialBalanceTransactionDrawer}
        removingEntityId={removingEntityId}
        toggleEntityGroup={toggleEntityGroup}
        totalBalance={totalBalance}
      />

      <AccountsTransfersSection
        formatMoneyForCurrency={formatMoneyForCurrency}
        handleRemoveTransfer={handleRemoveTransfer}
        isLoading={isLoading}
        openTransferDrawer={openTransferDrawer}
        removingTransferId={removingTransferId}
        setTransferFilters={setTransferFilters}
        transferFilters={transferFilters}
        transfers={transfers}
      />

        <AccountsTransactionsSection
          accounts={accounts}
          activeTransactionId={activeTransactionId}
          filters={filters}
          formatMoneyForCurrency={formatMoneyForCurrency}
          getTransactionCategoryColor={getTransactionCategoryColor}
          handleRemoveTransaction={handleRemoveTransaction}
          isLoading={isLoading}
          openAddTransactionDrawer={openAddTransactionDrawer}
        openEditTransactionDrawer={openEditTransactionDrawer}
        removingTransactionId={removingTransactionId}
        setFilters={setFilters}
        transactions={transactions}
        transactionDrawerMode={transactionDrawerMode}
        transactionTypes={TRANSACTION_TYPES}
      />

      <AccountsViewDrawers
        accounts={accounts}
        accountDrawerDraft={accountDrawerDraft}
        accountDrawerError={accountDrawerError}
        accountDrawerMode={accountDrawerMode}
        accountInstitutionOptions={accountInstitutionOptions}
        activeAccountItem={activeAccountItem}
        activeEntityId={activeEntityId}
        activeTransactionId={activeTransactionId}
        balanceAdjustmentDraft={balanceAdjustmentDraft}
        balanceAdjustmentDrawerError={balanceAdjustmentDrawerError}
        closeAccountDrawer={closeAccountDrawer}
        closeBalanceAdjustmentDrawer={closeBalanceAdjustmentDrawer}
        closeDistributionDrawer={closeDistributionDrawer}
        closeEntityDrawer={closeEntityDrawer}
        closeTransactionDrawer={closeTransactionDrawer}
        closeTransferDrawer={closeTransferDrawer}
        currency={currency}
        currencyOptions={currencyOptions}
        distributionAmount={distributionAmount}
        distributionDate={distributionDate}
        distributionDrawerError={distributionDrawerError}
        distributionToAccountId={distributionToAccountId}
        entities={entities}
        entityDrawerDraft={entityDrawerDraft}
        entityDrawerError={entityDrawerError}
        entityDrawerMode={entityDrawerMode}
        expenseCategoryOptions={expenseCategoryOptions}
        formatMoneyForCurrency={formatMoneyForCurrency}
        handleAccountDrawerSubmit={handleAccountDrawerSubmit}
        handleBalanceAdjustmentSubmit={handleBalanceAdjustmentSubmit}
        handleDistributionSubmit={handleDistributionSubmit}
        handleEntityDrawerSubmit={handleEntityDrawerSubmit}
        handleRemoveAccount={handleRemoveAccount}
        handleRemoveEntity={handleRemoveEntity}
        handleRemoveTransaction={handleRemoveTransaction}
        handleTransactionDrawerChange={handleTransactionDrawerChange}
        handleTransactionDrawerSubmit={handleTransactionDrawerSubmit}
        handleTransferSubmit={handleTransferSubmit}
        incomeCategoryOptions={incomeCategoryOptions}
        institutions={institutions}
        isAccountDrawerOpen={isAccountDrawerOpen}
        isAccountDrawerSubmitting={isAccountDrawerSubmitting}
        isBalanceAdjustmentDrawerOpen={isBalanceAdjustmentDrawerOpen}
        isBalanceAdjustmentSubmitting={isBalanceAdjustmentSubmitting}
        isDistributionDrawerOpen={isDistributionDrawerOpen}
        isDistributionSubmitting={isDistributionSubmitting}
        isEntityDrawerOpen={isEntityDrawerOpen}
        isEntitySubmitting={isEntitySubmitting}
        isProtectedCashOnHandAccount={isProtectedCashOnHandAccount}
        isTransactionDrawerOpen={isTransactionDrawerOpen}
        isTransactionDrawerSubmitting={isTransactionDrawerSubmitting}
        isTransferCrossEntity={isTransferCrossEntity}
        isTransferCurrencyMismatch={isTransferCurrencyMismatch}
        isTransferDrawerOpen={isTransferDrawerOpen}
        isTransferSubmitting={isTransferSubmitting}
        openBalanceAdjustmentDrawer={openBalanceAdjustmentDrawer}
        openInitialBalanceTransactionDrawer={openInitialBalanceTransactionDrawer}
        removingAccountId={removingAccountId}
        removingEntityId={removingEntityId}
        removingTransactionId={removingTransactionId}
        selectedAccountInstitution={selectedAccountInstitution}
        setAccountDrawerDraft={setAccountDrawerDraft}
        setBalanceAdjustmentDraft={setBalanceAdjustmentDraft}
        setDistributionAmount={setDistributionAmount}
        setDistributionDate={setDistributionDate}
        setDistributionToAccountId={setDistributionToAccountId}
        setEntityDrawerDraft={setEntityDrawerDraft}
        setTransferDraft={setTransferDraft}
        transactionDrawerDraft={transactionDrawerDraft}
        transactionDrawerError={transactionDrawerError}
        transactionDrawerMode={transactionDrawerMode}
        transferDraft={transferDraft}
        transferDrawerError={transferDrawerError}
        transferFromAccount={transferFromAccount}
        transferTargetAccounts={transferTargetAccounts}
        transferToAccount={transferToAccount}
      />
    </>
  );
}
