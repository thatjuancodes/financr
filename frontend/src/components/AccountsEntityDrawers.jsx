import Button from "./ui/Button";
import { formatAmountInput } from "../utils/format";
import {
  ACCOUNT_TYPES,
  ENTITY_TYPE_OPTIONS,
  normalizeAccountDraftByType,
} from "../utils/accounts";

export default function AccountsEntityDrawers({
  accountDrawerDraft,
  accountDrawerError,
  accountDrawerMode,
  accountInstitutionOptions,
  activeAccountItem,
  activeEntityId,
  closeAccountDrawer,
  closeBalanceAdjustmentDrawer,
  closeEntityDrawer,
  currency,
  currencyOptions,
  entities,
  entityDrawerDraft,
  entityDrawerError,
  entityDrawerMode,
  formatMoneyForCurrency,
  handleAccountDrawerSubmit,
  handleEntityDrawerSubmit,
  handleRemoveAccount,
  handleRemoveEntity,
  institutions,
  isAccountDrawerOpen,
  isAccountDrawerSubmitting,
  isEntityDrawerOpen,
  isEntitySubmitting,
  isProtectedCashOnHandAccount,
  openBalanceAdjustmentDrawer,
  openInitialBalanceTransactionDrawer,
  removingAccountId,
  removingEntityId,
  selectedAccountInstitution,
  setAccountDrawerDraft,
  setEntityDrawerDraft,
}) {
  return (
    <>
      {isAccountDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeAccountDrawer}>
          <aside
            className="side-drawer category-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={accountDrawerMode === "edit" ? "Edit account" : "Add account"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>{accountDrawerMode === "edit" ? "Edit Account" : "Add Account"}</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeAccountDrawer}
                disabled={isAccountDrawerSubmitting || removingAccountId !== null}
              >
                Close
              </Button>
            </div>

            <form onSubmit={handleAccountDrawerSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Name</span>
                <input
                  type="text"
                  value={accountDrawerDraft.name}
                  onChange={(event) =>
                    setAccountDrawerDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Type</span>
                <select
                  value={accountDrawerDraft.type}
                  onChange={(event) =>
                    setAccountDrawerDraft((prev) =>
                      normalizeAccountDraftByType(prev, institutions, event.target.value)
                    )
                  }
                >
                  {ACCOUNT_TYPES.map((item) => (
                    <option key={`drawer-account-type-${item.value}`} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {(accountDrawerDraft.type === "bank" ||
                accountDrawerDraft.type === "ewallet") && (
                <>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">Institution</span>
                    <select
                      value={accountDrawerDraft.institution_id}
                      onChange={(event) =>
                        setAccountDrawerDraft((prev) => {
                          const nextInstitutionId = event.target.value;
                          const nextInstitution =
                            accountInstitutionOptions.find(
                              (item) => String(item.id) === String(nextInstitutionId)
                            ) || null;
                          return {
                            ...prev,
                            institution_id: nextInstitutionId,
                            currency_code:
                              nextInstitution?.currency_code || prev.currency_code || currency,
                          };
                        })
                      }
                    >
                      <option value="">
                        {accountDrawerDraft.type === "bank"
                          ? "Select bank"
                          : "Select e-wallet"}
                      </option>
                      {accountInstitutionOptions.map((institution) => (
                        <option
                          key={`drawer-account-institution-${institution.id}`}
                          value={String(institution.id)}
                        >
                          {institution.code
                            ? `${institution.name} (${institution.code})`
                            : institution.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {accountInstitutionOptions.length === 0 && (
                    <p className="subtle-text subtle-text-flush">
                      No matching institutions yet. Add them in Configuration.
                    </p>
                  )}
                </>
              )}

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Currency</span>
                <select
                  value={accountDrawerDraft.currency_code}
                  onChange={(event) =>
                    setAccountDrawerDraft((prev) => ({
                      ...prev,
                      currency_code: event.target.value,
                    }))
                  }
                  required
                >
                  {currencyOptions.map((item) => (
                    <option key={`drawer-account-currency-${item}`} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {selectedAccountInstitution?.currency_code &&
                  selectedAccountInstitution.currency_code !== accountDrawerDraft.currency_code && (
                    <span className="subtle-text subtle-text-flush">
                      Institution default: {selectedAccountInstitution.currency_code}
                    </span>
                  )}
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Entity</span>
                <select
                  value={accountDrawerDraft.entity_id}
                  onChange={(event) =>
                    setAccountDrawerDraft((prev) => ({
                      ...prev,
                      entity_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select entity</option>
                  {entities.map((entity) => (
                    <option key={`drawer-account-entity-${entity.id}`} value={String(entity.id)}>
                      {entity.name} ({entity.type})
                    </option>
                  ))}
                </select>
              </label>

              {accountDrawerMode === "add" ? (
                <>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">
                      Initial balance (optional, {accountDrawerDraft.currency_code})
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={accountDrawerDraft.initial_amount}
                      onChange={(event) =>
                        setAccountDrawerDraft((prev) => ({
                          ...prev,
                          initial_amount: formatAmountInput(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className="stack-fields">
                    <span className="subtle-text subtle-text-flush">Initial balance date</span>
                    <input
                      type="date"
                      value={accountDrawerDraft.initial_date}
                      onChange={(event) =>
                        setAccountDrawerDraft((prev) => ({
                          ...prev,
                          initial_date: event.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              ) : (
                activeAccountItem && (
                  <>
                    <p className="subtle-text subtle-text-flush">
                      Current balance:{" "}
                      <strong>
                        {formatMoneyForCurrency(
                          activeAccountItem.balance,
                          activeAccountItem.currency_code
                        )}
                      </strong>
                    </p>
                    <div className="expense-drawer-right-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          openInitialBalanceTransactionDrawer(activeAccountItem.id)
                        }
                        disabled={isAccountDrawerSubmitting || removingAccountId !== null}
                      >
                        Set Initial Balance
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          closeAccountDrawer();
                          openBalanceAdjustmentDrawer(activeAccountItem.id);
                        }}
                        disabled={isAccountDrawerSubmitting || removingAccountId !== null}
                      >
                        Balance Adjustment
                      </Button>
                      {!isProtectedCashOnHandAccount(activeAccountItem) && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveAccount(activeAccountItem.id)}
                          disabled={
                            isAccountDrawerSubmitting ||
                            removingAccountId === activeAccountItem.id
                          }
                        >
                          {removingAccountId === activeAccountItem.id
                            ? "Removing..."
                            : "Remove Account"}
                        </Button>
                      )}
                    </div>
                  </>
                )
              )}

              {accountDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {accountDrawerError}
                </p>
              )}

              <div className="category-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={closeAccountDrawer}
                    disabled={isAccountDrawerSubmitting || removingAccountId !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isAccountDrawerSubmitting || removingAccountId !== null}
                  >
                    {isAccountDrawerSubmitting
                      ? "Saving..."
                      : accountDrawerMode === "edit"
                        ? "Save Changes"
                        : "Create Account"}
                  </Button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}

      {isEntityDrawerOpen && (
        <div className="side-drawer-backdrop" onClick={closeEntityDrawer}>
          <aside
            className="side-drawer category-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={entityDrawerMode === "edit" ? "Edit entity" : "Add entity"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>{entityDrawerMode === "edit" ? "Edit Entity" : "Add Entity"}</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeEntityDrawer}
                disabled={isEntitySubmitting || removingEntityId !== null}
              >
                Close
              </Button>
            </div>

            <form onSubmit={handleEntityDrawerSubmit} className="recurring-drawer-form">
              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Name</span>
                <input
                  type="text"
                  value={entityDrawerDraft.name}
                  onChange={(event) =>
                    setEntityDrawerDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="stack-fields">
                <span className="subtle-text subtle-text-flush">Type</span>
                <select
                  value={entityDrawerDraft.type}
                  onChange={(event) =>
                    setEntityDrawerDraft((prev) => ({
                      ...prev,
                      type: event.target.value,
                    }))
                  }
                  required
                >
                  {ENTITY_TYPE_OPTIONS.map((item) => (
                    <option key={`entity-type-${item.value}`} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {entityDrawerMode === "edit" && activeEntityId && (
                <div className="expense-drawer-right-actions">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveEntity(activeEntityId)}
                    disabled={isEntitySubmitting || removingEntityId === activeEntityId}
                  >
                    {removingEntityId === activeEntityId ? "Removing..." : "Remove Entity"}
                  </Button>
                </div>
              )}

              {entityDrawerError && (
                <p className="subtle-text subtle-text-error subtle-text-flush">
                  {entityDrawerError}
                </p>
              )}

              <div className="category-drawer-actions">
                <div className="expense-drawer-right-actions">
                  <Button
                    type="button"
                    variant="subtle"
                    size="sm"
                    onClick={closeEntityDrawer}
                    disabled={isEntitySubmitting || removingEntityId !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isEntitySubmitting || removingEntityId !== null}
                  >
                    {isEntitySubmitting
                      ? "Saving..."
                      : entityDrawerMode === "edit"
                        ? "Save Changes"
                        : "Create Entity"}
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
