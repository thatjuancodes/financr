import Button from "./ui/Button";
import { formatAmountInput } from "../utils/format";
import { TRANSACTION_TYPES, formatAccountOptionLabel } from "../utils/accounts";

export default function AccountsLedgerDrawers({
  accounts,
  activeTransactionId,
  balanceAdjustmentDraft,
  balanceAdjustmentDrawerError,
  closeBalanceAdjustmentDrawer,
  closeDistributionDrawer,
  closeTransactionDrawer,
  closeTransferDrawer,
  distributionAmount,
  distributionDate,
  distributionDrawerError,
  distributionToAccountId,
  expenseCategoryOptions,
  handleBalanceAdjustmentSubmit,
  handleDistributionSubmit,
  handleRemoveTransaction,
  handleTransactionDrawerChange,
  handleTransactionDrawerSubmit,
  handleTransferSubmit,
  incomeCategoryOptions,
  isBalanceAdjustmentDrawerOpen,
  isBalanceAdjustmentSubmitting,
  isDistributionDrawerOpen,
  isDistributionSubmitting,
  isTransactionDrawerOpen,
  isTransactionDrawerSubmitting,
  isTransferCrossEntity,
  isTransferCurrencyMismatch,
  isTransferDrawerOpen,
  isTransferSubmitting,
  removingTransactionId,
  setBalanceAdjustmentDraft,
  setDistributionAmount,
  setDistributionDate,
  setDistributionToAccountId,
  setTransferDraft,
  transactionDrawerDraft,
  transactionDrawerError,
  transactionDrawerMode,
  transferDraft,
  transferDrawerError,
  transferFromAccount,
  transferTargetAccounts,
  transferToAccount,
}) {
  return (
    <>
      {isTransactionDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeTransactionDrawer}>
          <aside
            className="side-drawer expense-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={transactionDrawerMode === "edit" ? "Edit transaction" : "Add transaction"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>{transactionDrawerMode === "edit" ? "Edit Transaction" : "Add Transaction"}</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeTransactionDrawer}
                disabled={isTransactionDrawerSubmitting || removingTransactionId !== null}
              >
                Close
              </Button>
            </div>

            <form onSubmit={handleTransactionDrawerSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Type</span>
                <select
                  value={transactionDrawerDraft.type}
                  onChange={(event) => handleTransactionDrawerChange("type", event.target.value)}
                >
                  {TRANSACTION_TYPES.map((item) => (
                    <option key={`drawer-transaction-type-${item.value}`} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transactionDrawerDraft.amount}
                  onChange={(event) => handleTransactionDrawerChange("amount", event.target.value)}
                  required
                />
              </label>

              {(transactionDrawerDraft.type === "expense" ||
                transactionDrawerDraft.type === "transfer") && (
                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">
                    {transactionDrawerDraft.type === "expense"
                      ? "Expense Account"
                      : "From Account"}
                  </span>
                  <select
                    value={transactionDrawerDraft.from_account_id}
                    onChange={(event) =>
                      handleTransactionDrawerChange("from_account_id", event.target.value)
                    }
                    required
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={`drawer-from-account-${account.id}`} value={String(account.id)}>
                        {formatAccountOptionLabel(account)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {(transactionDrawerDraft.type === "income" ||
                transactionDrawerDraft.type === "initial_balance" ||
                transactionDrawerDraft.type === "transfer") && (
                <label className="stack-fields">
                  <span className="subtle-text subtle-text-flush">
                    {transactionDrawerDraft.type === "income"
                      ? "Income Account"
                      : transactionDrawerDraft.type === "initial_balance"
                        ? "Initial Balance Account"
                        : "To Account"}
                  </span>
                  <select
                    value={transactionDrawerDraft.to_account_id}
                    onChange={(event) =>
                      handleTransactionDrawerChange("to_account_id", event.target.value)
                    }
                    required
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={`drawer-to-account-${account.id}`} value={String(account.id)}>
                        {formatAccountOptionLabel(account)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Category (optional)</span>
                <input
                  type="text"
                  value={transactionDrawerDraft.category}
                  onChange={(event) => handleTransactionDrawerChange("category", event.target.value)}
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Note (optional)</span>
                <input
                  type="text"
                  value={transactionDrawerDraft.note}
                  onChange={(event) => handleTransactionDrawerChange("note", event.target.value)}
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={transactionDrawerDraft.created_at}
                  onChange={(event) =>
                    handleTransactionDrawerChange("created_at", event.target.value)
                  }
                  required
                />
              </label>

              {transactionDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {transactionDrawerError}
                </p>
              )}

              <div className="expense-drawer-actions">
                <div className="expense-drawer-right-actions">
                  {transactionDrawerMode === "edit" && activeTransactionId !== null && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveTransaction(activeTransactionId)}
                      disabled={
                        isTransactionDrawerSubmitting ||
                        removingTransactionId === activeTransactionId
                      }
                    >
                      {removingTransactionId === activeTransactionId
                        ? "Removing..."
                        : "Remove"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={closeTransactionDrawer}
                    disabled={isTransactionDrawerSubmitting || removingTransactionId !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isTransactionDrawerSubmitting || removingTransactionId !== null}
                  >
                    {isTransactionDrawerSubmitting
                      ? "Saving..."
                      : transactionDrawerMode === "edit"
                        ? "Save Changes"
                        : "Record Transaction"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}

      {isTransferDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeTransferDrawer}>
          <aside
            className="side-drawer expense-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Add transfer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Add Transfer</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeTransferDrawer}
                disabled={isTransferSubmitting}
              >
                Close
              </Button>
            </div>

            <form onSubmit={handleTransferSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">From Account</span>
                <select
                  value={transferDraft.from_account_id}
                  onChange={(event) =>
                    setTransferDraft((prev) => ({
                      ...prev,
                      from_account_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={`transfer-from-${account.id}`} value={String(account.id)}>
                      {formatAccountOptionLabel(account)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">To Account</span>
                <select
                  value={transferDraft.to_account_id}
                  onChange={(event) =>
                    setTransferDraft((prev) => ({
                      ...prev,
                      to_account_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select account</option>
                  {transferTargetAccounts.map((account) => (
                    <option key={`transfer-to-${account.id}`} value={String(account.id)}>
                      {formatAccountOptionLabel(account)}
                    </option>
                  ))}
                </select>
              </label>

              {isTransferCrossEntity && transferFromAccount && transferToAccount && (
                <p className="subtle-text subtle-text-flush" style={{ color: "#b45309" }}>
                  This will move funds from {transferFromAccount.entity_name || "Entity A"}
                  {" -> "}
                  {` ${transferToAccount.entity_name || "Entity B"}`}
                </p>
              )}
              {isTransferCrossEntity && (
                <>
                  <label className="checkbox-row recurring-transfer-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(transferDraft.mirror_as_income_expense)}
                      onChange={(event) =>
                        setTransferDraft((prev) => ({
                          ...prev,
                          mirror_as_income_expense: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      Also record as expense for source and income for destination
                    </span>
                  </label>
                  <p className="subtle-text subtle-text-flush recurring-transfer-mapping-label">
                    {Boolean(transferDraft.mirror_as_income_expense)
                      ? "Source account records the expense. Destination account records the income."
                      : "Enable the toggle to map the source side as expense and the destination side as income."}
                  </p>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">Source Expense Category</span>
                    <select
                      value={transferDraft.expense_category_id ?? ""}
                      onChange={(event) =>
                        setTransferDraft((prev) => ({
                          ...prev,
                          expense_category_id: event.target.value,
                        }))
                      }
                      disabled={!transferDraft.mirror_as_income_expense}
                    >
                      <option value="">Uncategorized</option>
                      {expenseCategoryOptions.map((item) => (
                        <option key={`transfer-expense-category-${item.id}`} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">
                      Destination Income Category
                    </span>
                    <select
                      value={transferDraft.income_category_id ?? ""}
                      onChange={(event) =>
                        setTransferDraft((prev) => ({
                          ...prev,
                          income_category_id: event.target.value,
                        }))
                      }
                      disabled={!transferDraft.mirror_as_income_expense}
                    >
                      <option value="">Uncategorized</option>
                      {incomeCategoryOptions.map((item) => (
                        <option key={`transfer-income-category-${item.id}`} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {isTransferCurrencyMismatch && transferFromAccount && transferToAccount && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  Transfer currency mismatch: {transferFromAccount.currency_code || "PHP"} vs{" "}
                  {transferToAccount.currency_code || "PHP"}.
                </p>
              )}

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transferDraft.amount}
                  onChange={(event) =>
                    setTransferDraft((prev) => ({
                      ...prev,
                      amount: formatAmountInput(event.target.value),
                    }))
                  }
                  required
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Transfer Fee</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transferDraft.transfer_fee_amount ?? ""}
                  onChange={(event) =>
                    setTransferDraft((prev) => ({
                      ...prev,
                      transfer_fee_amount: formatAmountInput(event.target.value),
                    }))
                  }
                  placeholder="0.00"
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={transferDraft.date}
                  onChange={(event) =>
                    setTransferDraft((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Notes (optional)</span>
                <input
                  type="text"
                  value={transferDraft.notes}
                  onChange={(event) =>
                    setTransferDraft((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>

              {transferDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {transferDrawerError}
                </p>
              )}

              <div className="expense-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={closeTransferDrawer}
                    disabled={isTransferSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isTransferSubmitting}>
                    {isTransferSubmitting ? "Saving..." : "Record Transfer"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}

      {isDistributionDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeDistributionDrawer}>
          <aside
            className="side-drawer debt-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Set initial balance"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Set Initial Balance</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeDistributionDrawer}
                disabled={isDistributionSubmitting}
              >
                Close
              </Button>
            </div>

            <form onSubmit={handleDistributionSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={distributionDate}
                  onChange={(event) => setDistributionDate(event.target.value)}
                  required
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Account</span>
                <select
                  value={distributionToAccountId}
                  onChange={(event) => setDistributionToAccountId(event.target.value)}
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={`distribution-account-${account.id}`} value={String(account.id)}>
                      {formatAccountOptionLabel(account)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Initial balance amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={distributionAmount}
                  onChange={(event) =>
                    setDistributionAmount(formatAmountInput(event.target.value))
                  }
                  required
                />
              </label>

              <p className="subtle-text subtle-text-flush">
                This will create an `initial_balance` transaction on this account.
              </p>

              {distributionDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {distributionDrawerError}
                </p>
              )}

              <div className="debt-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={closeDistributionDrawer}
                    disabled={isDistributionSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isDistributionSubmitting}>
                    {isDistributionSubmitting ? "Saving..." : "Set Initial Balance"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}

      {isBalanceAdjustmentDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeBalanceAdjustmentDrawer}>
          <aside
            className="side-drawer debt-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Balance adjustment"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Balance Adjustment</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeBalanceAdjustmentDrawer}
                disabled={isBalanceAdjustmentSubmitting}
              >
                Close
              </Button>
            </div>

            <form onSubmit={handleBalanceAdjustmentSubmit} className="recurring-drawer-form">
              <p className="subtle-text subtle-text-flush">
                Use this when an account has existing money not yet represented in this system.
              </p>
              <p className="subtle-text subtle-text-flush">
                This will credit the selected account and increase the selected entity current
                balance by the same amount.
              </p>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Account</span>
                <select
                  value={balanceAdjustmentDraft.to_account_id}
                  onChange={(event) =>
                    setBalanceAdjustmentDraft((prev) => ({
                      ...prev,
                      to_account_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={`adjustment-account-${account.id}`} value={String(account.id)}>
                      {formatAccountOptionLabel(account)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={balanceAdjustmentDraft.amount}
                  onChange={(event) =>
                    setBalanceAdjustmentDraft((prev) => ({
                      ...prev,
                      amount: formatAmountInput(event.target.value),
                    }))
                  }
                  required
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Date</span>
                <input
                  type="date"
                  value={balanceAdjustmentDraft.date}
                  onChange={(event) =>
                    setBalanceAdjustmentDraft((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Note (optional)</span>
                <input
                  type="text"
                  value={balanceAdjustmentDraft.note}
                  onChange={(event) =>
                    setBalanceAdjustmentDraft((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                />
              </label>

              {balanceAdjustmentDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {balanceAdjustmentDrawerError}
                </p>
              )}

              <div className="expense-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={closeBalanceAdjustmentDrawer}
                    disabled={isBalanceAdjustmentSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isBalanceAdjustmentSubmitting}>
                    {isBalanceAdjustmentSubmitting ? "Applying..." : "Apply Adjustment"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
