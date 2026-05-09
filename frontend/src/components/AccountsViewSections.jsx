import Button from "./ui/Button";
import RowActionsMenu from "./RowActionsMenu";
import { buildCategoryBadgeStyle } from "../utils/categoryColors";

export function AccountsEntitiesSection({
  accounts,
  accountDrawerMode,
  activeAccountId,
  defaultAccountError,
  defaultAccountPreferencesByEntity,
  entities,
  entityAccountGroups,
  formatCurrencySummary,
  formatMoneyForCurrency,
  handleRemoveAccount,
  handleRemoveEntity,
  handleSetAccountAsDefault,
  isProtectedCashOnHandAccount,
  openAddAccountDrawer,
  openAddEntityDrawer,
  openBalanceAdjustmentDrawer,
  openDistributionDrawer,
  openEditAccountDrawer,
  openEditEntityDrawer,
  openInitialBalanceTransactionDrawer,
  removingEntityId,
  toggleEntityGroup,
  totalBalance,
  balanceColor,
}) {
  return (
    <section>
      <div className="income-header-row">
        <h2>Accounts</h2>
        <div className="section-header-actions">
          <Button type="button" size="sm" variant="subtle" onClick={openAddEntityDrawer}>
            Add Entity
          </Button>
          <Button type="button" size="sm" onClick={openAddAccountDrawer}>
            Add Account
          </Button>
        </div>
      </div>

      <div className="balance-badges accounts-overview-badges">
        <article className="balance-badge balance-badge-secondary">
          <span className="balance-badge-label">Accounts Total</span>
          <p className="balance-badge-value">{formatCurrencySummary(totalBalance)}</p>
        </article>
        <article className="balance-badge balance-badge-light">
          <span className="balance-badge-label">Entities</span>
          <p className="balance-badge-value">{entities.length}</p>
        </article>
        <article className="balance-badge balance-badge-primary">
          <span className="balance-badge-label">Accounts</span>
          <p className="balance-badge-value">{accounts.length}</p>
        </article>
      </div>
      {totalBalance.length > 0 && (
        <div className="balance-badges accounts-overview-badges">
          {totalBalance.map((item) => (
            <article
              key={`accounts-total-${item.currency_code}`}
              className="balance-badge balance-badge-light"
            >
              <span className="balance-badge-label">{item.currency_code} Total</span>
              <p className="balance-badge-value">
                {formatMoneyForCurrency(item.total, item.currency_code)}
              </p>
            </article>
          ))}
        </div>
      )}
      <p className="subtle-text subtle-text-flush accounts-groups-toolbar">
        All accounts shown together, grouped by entity.
      </p>
      {defaultAccountError && (
        <p className="subtle-text subtle-text-error subtle-text-flush">
          {defaultAccountError}
        </p>
      )}

      {entityAccountGroups.length === 0 ? (
        <p className="empty-state">No entities yet.</p>
      ) : (
        <div className="accounts-entity-groups">
          {entityAccountGroups.map((group) => (
            <article key={`accounts-group-${group.entity.id}`} className="accounts-entity-group">
              <div
                className="accounts-entity-header"
                role="button"
                tabIndex={0}
                onClick={() => toggleEntityGroup(group.entity.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleEntityGroup(group.entity.id);
                  }
                }}
                aria-expanded={!group.isCollapsed}
                aria-controls={`accounts-group-panel-${group.entity.id}`}
              >
                <div className="accounts-entity-heading">
                  <strong>{group.entity.name}</strong>
                  <span className="accounts-entity-heading-meta">{group.entity.type}</span>
                </div>
                <div className="accounts-entity-meta">
                  <div className="accounts-entity-stat">
                    <span className="subtle-text subtle-text-flush">Total Balance</span>
                    <strong>{formatCurrencySummary(group.totalBalanceSummary)}</strong>
                  </div>
                  <div className="accounts-entity-stat">
                    <span className="subtle-text subtle-text-flush">Accounts</span>
                    <strong>{group.accountCount}</strong>
                  </div>
                  <div
                    className="accounts-entity-menu"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <RowActionsMenu
                      actions={[
                        {
                          label: "Edit Entity",
                          onClick: () => openEditEntityDrawer(group.entity.id),
                        },
                        {
                          label:
                            removingEntityId === group.entity.id ? "Removing..." : "Remove",
                          onClick: () => handleRemoveEntity(group.entity.id),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {!group.isCollapsed && (
                <div id={`accounts-group-panel-${group.entity.id}`}>
                  {group.accounts.length === 0 ? (
                    <div className="accounts-entity-empty">
                      <p className="empty-state">No accounts yet.</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => openAddAccountDrawer(group.entity.id)}
                      >
                        Add Account
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="subtle-text subtle-text-flush recurring-table-hint">
                        Click a row to edit.
                      </p>
                      <div className="table-scroll">
                        <table className="table">
                          <thead>
                            <tr>
                              <th className="cell-left">Account Name</th>
                              <th>Type</th>
                              <th className="cell-left">Institution</th>
                              <th>Currency</th>
                              <th className="cell-right">Balance</th>
                              <th className="cell-actions" />
                            </tr>
                          </thead>
                          <tbody>
                            {group.accounts.map((account) => {
                              const entityDefaults =
                                defaultAccountPreferencesByEntity?.[
                                  String(account.entity_id || "")
                                ] || {};
                              const isExpenseDefault =
                                String(entityDefaults.default_expense_account_id) ===
                                String(account.id);
                              const isIncomeDefault =
                                String(entityDefaults.default_income_account_id) ===
                                String(account.id);
                              return (
                                <tr
                                  key={`account-${account.id}`}
                                  className={`income-row${
                                    account.id === activeAccountId &&
                                    accountDrawerMode === "edit"
                                      ? " income-row-active"
                                      : ""
                                  }`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openEditAccountDrawer(account.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      openEditAccountDrawer(account.id);
                                    }
                                  }}
                                  aria-label={`Edit account ${account.name}`}
                                >
                                  <td className="cell-left">
                                    <div className="account-name-cell">
                                      <span>{account.name}</span>
                                      <div className="account-default-badge-list">
                                        {isExpenseDefault && (
                                          <span className="account-default-badge account-default-badge-expense">
                                            Expense Default
                                          </span>
                                        )}
                                        {isIncomeDefault && (
                                          <span className="account-default-badge account-default-badge-income">
                                            Income Default
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td>{account.type}</td>
                                  <td className="cell-left">
                                    {account.type === "cash"
                                      ? "-"
                                      : account.institution?.name || "Unlinked"}
                                  </td>
                                  <td>{account.currency_code || "PHP"}</td>
                                  <td
                                    className="cell-right"
                                    style={{
                                      color: balanceColor(account.balance),
                                      fontWeight: 700,
                                    }}
                                  >
                                    {formatMoneyForCurrency(
                                      account.balance,
                                      account.currency_code
                                    )}
                                  </td>
                                  <td
                                    className="cell-actions"
                                    onClick={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => event.stopPropagation()}
                                  >
                                    <RowActionsMenu
                                      actions={[
                                        {
                                          label: isExpenseDefault
                                            ? "Expense Default (Current)"
                                            : "Set as Expense Default",
                                          onClick: () =>
                                            handleSetAccountAsDefault("expense", account.id),
                                        },
                                        {
                                          label: isIncomeDefault
                                            ? "Income Default (Current)"
                                            : "Set as Income Default",
                                          onClick: () =>
                                            handleSetAccountAsDefault("income", account.id),
                                        },
                                        {
                                          label: "Edit",
                                          onClick: () => openEditAccountDrawer(account.id),
                                        },
                                        {
                                          label: "Set Initial Balance",
                                          onClick: () =>
                                            openInitialBalanceTransactionDrawer(account.id),
                                        },
                                        {
                                          label: "Balance Adjustment",
                                          onClick: () =>
                                            openBalanceAdjustmentDrawer(account.id),
                                        },
                                        {
                                          label: "Distribute Here",
                                          onClick: () => openDistributionDrawer(account.id),
                                        },
                                        ...(!isProtectedCashOnHandAccount(account)
                                          ? [
                                              {
                                                label: "Remove",
                                                onClick: () =>
                                                  handleRemoveAccount(account.id),
                                              },
                                            ]
                                          : []),
                                      ]}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AccountsTransfersSection({
  formatMoneyForCurrency,
  handleRemoveTransfer,
  isLoading,
  openTransferDrawer,
  removingTransferId,
  setTransferFilters,
  transferFilters,
  transfers,
}) {
  return (
    <section>
      <div className="expense-header-row">
        <h2>Transfers</h2>
        <div className="section-header-actions">
          <Button type="button" size="sm" onClick={openTransferDrawer}>
            Add Transfer
          </Button>
        </div>
      </div>

      <p className="subtle-text subtle-text-flush">Showing all entity involvement.</p>

      <div className="filter-row">
        <div className="filters">
          <input
            type="date"
            value={transferFilters.date_from}
            onChange={(event) =>
              setTransferFilters((prev) => ({ ...prev, date_from: event.target.value }))
            }
          />
          <input
            type="date"
            value={transferFilters.date_to}
            onChange={(event) =>
              setTransferFilters((prev) => ({ ...prev, date_to: event.target.value }))
            }
          />
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={() => setTransferFilters({ date_from: "", date_to: "" })}
          >
            Clear
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">Loading transfers...</p>
      ) : transfers.length === 0 ? (
        <p className="empty-state">No transfers found.</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th className="cell-left">Date</th>
                <th>From</th>
                <th>To</th>
                <th className="cell-right">Amount</th>
                <th>Notes</th>
                <th className="cell-actions" />
              </tr>
            </thead>
            <tbody>
              {transfers.map((item) => (
                <tr key={`transfer-${item.id}`} className="expense-row">
                  <td className="cell-left">{String(item.date || "").slice(0, 10)}</td>
                  <td>
                    {item.from_account_name || "-"}
                    {item.from_entity_name ? ` (${item.from_entity_name})` : ""}
                  </td>
                  <td>
                    {item.to_account_name || "-"}
                    {item.to_entity_name ? ` (${item.to_entity_name})` : ""}
                  </td>
                  <td className="cell-right">
                    {formatMoneyForCurrency(item.amount, item.currency_code)}
                  </td>
                  <td>{item.notes || "-"}</td>
                  <td className="cell-actions">
                    <RowActionsMenu
                      actions={[
                        {
                          label:
                            String(removingTransferId) === String(item.id)
                              ? "Removing..."
                              : "Remove",
                          onClick: () => handleRemoveTransfer(item.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AccountsTransactionsSection({
  accounts,
  activeTransactionId,
  filters,
  formatMoneyForCurrency,
  getTransactionCategoryColor,
  handleRemoveTransaction,
  isLoading,
  openAddTransactionDrawer,
  openEditTransactionDrawer,
  removingTransactionId,
  setFilters,
  transactions,
  transactionDrawerMode,
  transactionTypes,
}) {
  return (
    <section>
      <div className="expense-header-row">
        <h2>Transactions</h2>
        <div className="section-header-actions">
          <Button type="button" size="sm" onClick={openAddTransactionDrawer}>
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="filter-row">
        <div className="filters">
          <select
            value={filters.account_id}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, account_id: event.target.value }))
            }
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={`filter-account-${account.id}`} value={String(account.id)}>
                {account.entity_name ? `${account.name} (${account.entity_name})` : account.name}
              </option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, type: event.target.value }))
            }
          >
            <option value="">All types</option>
            {transactionTypes.map((item) => (
              <option key={`filter-type-${item.value}`} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, date_from: event.target.value }))
            }
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, date_to: event.target.value }))
            }
          />

          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={() =>
              setFilters({ account_id: "", type: "", date_from: "", date_to: "" })
            }
          >
            Clear
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">Loading transactions...</p>
      ) : transactions.length === 0 ? (
        <p className="empty-state">No transactions found.</p>
      ) : (
        <>
          <p className="subtle-text subtle-text-flush recurring-table-hint">
            Click a row to edit.
          </p>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th className="cell-left">Date</th>
                  <th>Type</th>
                  <th className="cell-right">Amount</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th className="cell-actions" />
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => {
                  const categoryColor = getTransactionCategoryColor(item);
                  const canEditTransaction = String(item?.source_type || "transaction") === "transaction";
                  return (
                    <tr
                      key={`transaction-${item.id}`}
                      className={`expense-row${
                        item.id === activeTransactionId && transactionDrawerMode === "edit"
                          ? " expense-row-active"
                          : ""
                      }`}
                      role={canEditTransaction ? "button" : undefined}
                      tabIndex={canEditTransaction ? 0 : undefined}
                      onClick={() => {
                        if (canEditTransaction) {
                          openEditTransactionDrawer(item.id);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          canEditTransaction &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          openEditTransactionDrawer(item.id);
                        }
                      }}
                      aria-label={
                        canEditTransaction
                          ? `Edit ${item.type} transaction`
                          : `${item.type} ledger entry`
                      }
                    >
                      <td className="cell-left">{String(item.created_at || "").slice(0, 10)}</td>
                      <td>{item.type}</td>
                      <td className="cell-right">
                        {formatMoneyForCurrency(item.amount, item.currency_code)}
                      </td>
                      <td>{item.from_account_name || "-"}</td>
                      <td>{item.to_account_name || "-"}</td>
                      <td>
                        {item.category ? (
                          <span
                            className="category-inline-badge"
                            style={
                              categoryColor
                                ? buildCategoryBadgeStyle(categoryColor)
                                : undefined
                            }
                          >
                            {item.category}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{item.note || "-"}</td>
                      <td
                        className="cell-actions"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {canEditTransaction ? (
                          <RowActionsMenu
                            actions={[
                              {
                                label: "Edit",
                                onClick: () => openEditTransactionDrawer(item.id),
                              },
                              {
                                label:
                                  removingTransactionId === item.id ? "Removing..." : "Remove",
                                onClick: () => handleRemoveTransaction(item.id),
                              },
                            ]}
                          />
                        ) : (
                          <span className="subtle-text">Managed from list</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
