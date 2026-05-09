import React from "react";
import { formatAmountInput } from "../utils/format";
import {
  CATEGORY_COLOR_SWATCHES,
  buildCategoryBadgeStyle,
  resolveCategoryColor,
} from "../utils/categoryColors";
import Button from "./ui/Button";

function CategoryColorPicker({ selectedColor, onSelect, prefix }) {
  return (
    <div className="category-color-grid">
      {CATEGORY_COLOR_SWATCHES.map((swatch) => {
        const isSelected = selectedColor === swatch;
        return (
          <button
            key={`${prefix}-${swatch}`}
            type="button"
            className={`category-color-swatch${isSelected ? " selected" : ""}`}
            style={{ backgroundColor: swatch }}
            onClick={() => onSelect(swatch)}
            aria-label={`Use color ${swatch}`}
          />
        );
      })}
    </div>
  );
}

const CATEGORY_ICON_OPTIONS = [
  { value: "", label: "No icon", icon: "ri-shape-line" },
  { value: "ri-home-5-line", label: "Home", icon: "ri-home-5-line" },
  { value: "ri-shopping-bag-3-line", label: "Shopping", icon: "ri-shopping-bag-3-line" },
  { value: "ri-restaurant-2-line", label: "Food", icon: "ri-restaurant-2-line" },
  { value: "ri-goblet-line", label: "Dining", icon: "ri-goblet-line" },
  { value: "ri-bank-card-line", label: "Bills", icon: "ri-bank-card-line" },
  { value: "ri-car-line", label: "Car", icon: "ri-car-line" },
  { value: "ri-bus-line", label: "Transit", icon: "ri-bus-line" },
  { value: "ri-heart-pulse-line", label: "Health", icon: "ri-heart-pulse-line" },
  { value: "ri-medicine-bottle-line", label: "Medical", icon: "ri-medicine-bottle-line" },
  { value: "ri-graduation-cap-line", label: "Education", icon: "ri-graduation-cap-line" },
  { value: "ri-movie-line", label: "Entertainment", icon: "ri-movie-line" },
  { value: "ri-plane-line", label: "Travel", icon: "ri-plane-line" },
  { value: "ri-gift-line", label: "Gift", icon: "ri-gift-line" },
  { value: "ri-briefcase-4-line", label: "Work", icon: "ri-briefcase-4-line" },
  { value: "ri-money-dollar-circle-line", label: "Income", icon: "ri-money-dollar-circle-line" },
  { value: "ri-wallet-3-line", label: "Wallet", icon: "ri-wallet-3-line" },
  { value: "ri-safe-2-line", label: "Savings", icon: "ri-safe-2-line" },
];

function CategoryIconPicker({ selectedIcon, onSelect, prefix }) {
  return (
    <div className="category-icon-grid">
      {CATEGORY_ICON_OPTIONS.map((option) => {
        const isSelected = selectedIcon === option.value;
        return (
          <button
            key={`${prefix}-${option.icon}`}
            type="button"
            className={`category-icon-option${isSelected ? " selected" : ""}`}
            onClick={() => onSelect(option.value)}
            aria-label={`Use icon ${option.label}`}
          >
            <i className={option.icon} aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DrawerShell({
  open,
  onClose,
  title,
  closeDisabled,
  ariaLabel,
  children,
}) {
  if (!open) {
    return null;
  }
  return (
    <div className="side-drawer-backdrop" onClick={onClose}>
      <aside
        className="side-drawer category-edit-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="side-drawer-header">
          <h2>{title}</h2>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            onClick={onClose}
            disabled={closeDisabled}
          >
            Close
          </Button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function InstitutionDrawers(props) {
  const {
    activeBankConfigItem,
    closeBankConfigDrawer,
    isBankDrawerSubmitting,
    handleBankConfigDrawerSubmit,
    activeBankConfigDraft,
    updateBankConfigDraft,
    currency,
    currencyOptions,
    bankDrawerError,
    handleBankConfigDrawerDelete,
    isAddBankDrawerOpen,
    closeAddBankDrawer,
    handleAddBankDrawerSubmit,
    newBankConfigForm,
    setNewBankConfigForm,
  } = props;

  return (
    <>
      <DrawerShell
        open={Boolean(activeBankConfigItem)}
        onClose={closeBankConfigDrawer}
        title="Edit Institution"
        closeDisabled={isBankDrawerSubmitting}
        ariaLabel="Edit institution"
      >
        {activeBankConfigItem && (
          <form onSubmit={handleBankConfigDrawerSubmit} className="recurring-drawer-form">
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Name</span>
              <input
                type="text"
                value={activeBankConfigDraft?.name ?? activeBankConfigItem.name}
                onChange={(event) =>
                  updateBankConfigDraft(activeBankConfigItem.id, "name", event.target.value)
                }
                required
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Type</span>
              <input
                type="text"
                value={activeBankConfigItem.type === "e_wallet" ? "E-wallet" : "Bank"}
                disabled
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Code</span>
              <input
                type="text"
                value={activeBankConfigDraft?.code ?? activeBankConfigItem.code ?? ""}
                onChange={(event) =>
                  updateBankConfigDraft(activeBankConfigItem.id, "code", event.target.value)
                }
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Currency</span>
              <select
                value={
                  activeBankConfigDraft?.currency_code ??
                  activeBankConfigItem.currency_code ??
                  currency
                }
                onChange={(event) =>
                  updateBankConfigDraft(
                    activeBankConfigItem.id,
                    "currency_code",
                    event.target.value
                  )
                }
              >
                {currencyOptions.map((item) => (
                  <option key={`institution-edit-currency-${item}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">SWIFT Code</span>
              <input
                type="text"
                value={activeBankConfigDraft?.swift_code ?? activeBankConfigItem.swift_code ?? ""}
                onChange={(event) =>
                  updateBankConfigDraft(activeBankConfigItem.id, "swift_code", event.target.value)
                }
                disabled={activeBankConfigItem.type === "e_wallet"}
                placeholder={
                  activeBankConfigItem.type === "e_wallet"
                    ? "Not applicable for e-wallets"
                    : ""
                }
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Active</span>
              <select
                value={Boolean(activeBankConfigDraft?.is_active) ? "true" : "false"}
                onChange={(event) =>
                  updateBankConfigDraft(
                    activeBankConfigItem.id,
                    "is_active",
                    event.target.value === "true"
                  )
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            {bankDrawerError && (
              <p className="subtle-text subtle-text-error subtle-text-flush">{bankDrawerError}</p>
            )}
            <div className="category-drawer-actions">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="category-drawer-remove-button"
                onClick={handleBankConfigDrawerDelete}
                disabled={isBankDrawerSubmitting}
              >
                Deactivate
              </Button>
              <Button type="submit" size="sm" disabled={isBankDrawerSubmitting}>
                {isBankDrawerSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DrawerShell>

      <DrawerShell
        open={isAddBankDrawerOpen}
        onClose={closeAddBankDrawer}
        title="Add Institution"
        closeDisabled={isBankDrawerSubmitting}
        ariaLabel="Add institution"
      >
        <form onSubmit={handleAddBankDrawerSubmit} className="recurring-drawer-form">
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Name</span>
            <input
              type="text"
              value={newBankConfigForm.name}
              onChange={(event) =>
                setNewBankConfigForm((prev) => ({
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
              value={newBankConfigForm.type}
              onChange={(event) =>
                setNewBankConfigForm((prev) => ({
                  ...prev,
                  type: event.target.value,
                  swift_code: event.target.value === "e_wallet" ? "" : prev.swift_code,
                }))
              }
            >
              <option value="bank">Bank</option>
              <option value="e_wallet">E-wallet</option>
            </select>
          </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Code</span>
            <input
              type="text"
              value={newBankConfigForm.code}
              onChange={(event) =>
                setNewBankConfigForm((prev) => ({
                  ...prev,
                  code: event.target.value,
                }))
              }
            />
          </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Currency</span>
            <select
              value={newBankConfigForm.currency_code}
              onChange={(event) =>
                setNewBankConfigForm((prev) => ({
                  ...prev,
                  currency_code: event.target.value,
                }))
              }
            >
              {currencyOptions.map((item) => (
                <option key={`institution-add-currency-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">SWIFT Code</span>
            <input
              type="text"
              value={newBankConfigForm.swift_code}
              onChange={(event) =>
                setNewBankConfigForm((prev) => ({
                  ...prev,
                  swift_code: event.target.value,
                }))
              }
              disabled={newBankConfigForm.type === "e_wallet"}
              placeholder={
                newBankConfigForm.type === "e_wallet"
                  ? "Not applicable for e-wallets"
                  : ""
              }
            />
          </label>
          {bankDrawerError && (
            <p className="subtle-text subtle-text-error subtle-text-flush">{bankDrawerError}</p>
          )}
          <div className="category-drawer-actions">
            <Button type="submit" size="sm" disabled={isBankDrawerSubmitting}>
              {isBankDrawerSubmitting ? "Adding..." : "Add Institution"}
            </Button>
          </div>
        </form>
      </DrawerShell>
    </>
  );
}

function CategoryPreview({ name, color, icon, fallbackLabel, colorKey }) {
  return (
    <p className="subtle-text subtle-text-flush">
      Preview:
      <span
        className="category-chip category-chip-preview"
        style={buildCategoryBadgeStyle(resolveCategoryColor(color, colorKey))}
      >
        {icon ? <i className={`${icon} category-chip-icon`} aria-hidden="true" /> : null}
        <span className="category-chip-label">{name.trim() || fallbackLabel}</span>
      </span>
    </p>
  );
}

export function DebtStatementDrawers(props) {
  const {
    activeLoanOriginConfigItem,
    activeLoanOriginConfigDraft,
    closeLoanOriginConfigDrawer,
    isLoanOriginDrawerSubmitting,
    handleLoanOriginConfigDrawerSubmit,
    updateLoanOriginConfigDraft,
    loanOriginDrawerError,
    handleDeleteLoanOriginConfig,
    isAddLoanOriginDrawerOpen,
    closeAddLoanOriginDrawer,
    handleAddLoanOriginDrawerSubmit,
    newLoanOriginForm,
    setNewLoanOriginForm,
  } = props;

  return (
    <>
      <DrawerShell
        open={Boolean(activeLoanOriginConfigItem)}
        onClose={closeLoanOriginConfigDrawer}
        title="Edit Debt Statement"
        closeDisabled={isLoanOriginDrawerSubmitting}
        ariaLabel="Edit debt statement"
      >
        {activeLoanOriginConfigItem && (
          <form onSubmit={handleLoanOriginConfigDrawerSubmit} className="recurring-drawer-form">
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Loan Origin</span>
              <input
                type="text"
                value={activeLoanOriginConfigDraft?.loan_origin ?? activeLoanOriginConfigItem.loan_origin}
                onChange={(event) =>
                  updateLoanOriginConfigDraft(
                    activeLoanOriginConfigItem.loan_origin,
                    "loan_origin",
                    event.target.value
                  )
                }
                required
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Statement Day</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1-31"
                value={
                  activeLoanOriginConfigDraft?.statement_day ??
                  String(activeLoanOriginConfigItem.statement_day ?? "")
                }
                onChange={(event) =>
                  updateLoanOriginConfigDraft(
                    activeLoanOriginConfigItem.loan_origin,
                    "statement_day",
                    event.target.value
                  )
                }
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Due Day</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1-31"
                value={
                  activeLoanOriginConfigDraft?.due_day ??
                  String(activeLoanOriginConfigItem.due_day ?? "")
                }
                onChange={(event) =>
                  updateLoanOriginConfigDraft(
                    activeLoanOriginConfigItem.loan_origin,
                    "due_day",
                    event.target.value
                  )
                }
              />
            </label>
            {loanOriginDrawerError && (
              <p className="subtle-text subtle-text-error subtle-text-flush">
                {loanOriginDrawerError}
              </p>
            )}
            <div className="category-drawer-actions">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="category-drawer-remove-button"
                onClick={() =>
                  handleDeleteLoanOriginConfig?.(
                    activeLoanOriginConfigItem.loan_origin,
                    Number(activeLoanOriginConfigItem.debt_count ?? 0)
                  )
                }
                disabled={isLoanOriginDrawerSubmitting}
              >
                Remove
              </Button>
              <Button type="submit" size="sm" disabled={isLoanOriginDrawerSubmitting}>
                {isLoanOriginDrawerSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DrawerShell>

      <DrawerShell
        open={isAddLoanOriginDrawerOpen}
        onClose={closeAddLoanOriginDrawer}
        title="Add Debt Statement"
        closeDisabled={isLoanOriginDrawerSubmitting}
        ariaLabel="Add debt statement"
      >
        <form onSubmit={handleAddLoanOriginDrawerSubmit} className="recurring-drawer-form">
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Loan Origin</span>
            <input
              type="text"
              value={newLoanOriginForm.loan_origin}
              onChange={(event) =>
                setNewLoanOriginForm((prev) => ({
                  ...prev,
                  loan_origin: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Statement Day</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1-31"
              value={newLoanOriginForm.statement_day}
              onChange={(event) =>
                setNewLoanOriginForm((prev) => ({
                  ...prev,
                  statement_day: event.target.value.replace(/[^\d]/g, "").slice(0, 2),
                }))
              }
            />
          </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Due Day</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1-31"
              value={newLoanOriginForm.due_day}
              onChange={(event) =>
                setNewLoanOriginForm((prev) => ({
                  ...prev,
                  due_day: event.target.value.replace(/[^\d]/g, "").slice(0, 2),
                }))
              }
            />
          </label>
          {loanOriginDrawerError && (
            <p className="subtle-text subtle-text-error subtle-text-flush">
              {loanOriginDrawerError}
            </p>
          )}
          <div className="category-drawer-actions">
            <Button type="submit" size="sm" disabled={isLoanOriginDrawerSubmitting}>
              {isLoanOriginDrawerSubmitting ? "Adding..." : "Add Debt Statement"}
            </Button>
          </div>
        </form>
      </DrawerShell>
    </>
  );
}

export function ExpenseCategoryDrawers(props) {
  const {
    activeCategoryItem,
    closeCategoryDrawer,
    isCategoryDrawerSubmitting,
    handleCategoryDrawerSubmit,
    activeCategoryDraft,
    updateCategoryDraft,
    categoryDrawerError,
    handleCategoryDrawerDelete,
    isAddCategoryDrawerOpen,
    closeAddCategoryDrawer,
    isAddCategoryDrawerSubmitting,
    addCategoryDrawerError,
    handleAddCategoryDrawerSubmit,
    addCategoryDraft,
    setAddCategoryDraft,
  } = props;

  return (
    <>
      <DrawerShell
        open={Boolean(activeCategoryItem)}
        onClose={closeCategoryDrawer}
        title="Edit Expense Category"
        closeDisabled={isCategoryDrawerSubmitting}
        ariaLabel="Edit expense category"
      >
        {activeCategoryItem && (
          <form onSubmit={handleCategoryDrawerSubmit} className="recurring-drawer-form">
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Name</span>
              <input
                type="text"
                value={activeCategoryDraft?.name ?? activeCategoryItem.name}
                onChange={(event) =>
                  updateCategoryDraft(activeCategoryItem.id, "name", event.target.value)
                }
                required
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Color</span>
              <CategoryColorPicker
                selectedColor={resolveCategoryColor(
                  activeCategoryDraft?.color,
                  `${activeCategoryItem.id}:${activeCategoryDraft?.name ?? activeCategoryItem.name}`
                )}
                onSelect={(swatch) =>
                  updateCategoryDraft(activeCategoryItem.id, "color", swatch)
                }
                prefix="expense-category-swatch"
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Icon</span>
              <CategoryIconPicker
                selectedIcon={activeCategoryDraft?.icon ?? ""}
                onSelect={(icon) =>
                  updateCategoryDraft(activeCategoryItem.id, "icon", icon)
                }
                prefix="expense-category-icon"
              />
            </label>
            <CategoryPreview
              name={activeCategoryDraft?.name || activeCategoryItem.name}
              color={activeCategoryDraft?.color}
              icon={activeCategoryDraft?.icon || activeCategoryItem.icon}
              fallbackLabel="Expense Category"
              colorKey={`${activeCategoryItem.id}:${activeCategoryDraft?.name ?? activeCategoryItem.name}`}
            />
            {categoryDrawerError && (
              <p className="subtle-text subtle-text-error subtle-text-flush">{categoryDrawerError}</p>
            )}
            <div className="category-drawer-actions">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="category-drawer-remove-button"
                onClick={handleCategoryDrawerDelete}
                disabled={isCategoryDrawerSubmitting}
              >
                Remove
              </Button>
              <Button type="submit" size="sm" disabled={isCategoryDrawerSubmitting}>
                {isCategoryDrawerSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DrawerShell>

      <DrawerShell
        open={isAddCategoryDrawerOpen}
        onClose={closeAddCategoryDrawer}
        title="Add Expense Category"
        closeDisabled={isAddCategoryDrawerSubmitting}
        ariaLabel="Add expense category"
      >
        <form onSubmit={handleAddCategoryDrawerSubmit} className="recurring-drawer-form">
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Name</span>
            <input
              type="text"
              value={addCategoryDraft.name}
              onChange={(event) =>
                setAddCategoryDraft((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Color</span>
              <CategoryColorPicker
                selectedColor={resolveCategoryColor(
                  addCategoryDraft.color,
                  `new-expense:${addCategoryDraft.name}`
                )}
              onSelect={(swatch) =>
                setAddCategoryDraft((prev) => ({
                  ...prev,
                  color: swatch,
                }))
              }
                prefix="new-category-swatch"
              />
            </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Icon</span>
            <CategoryIconPicker
              selectedIcon={addCategoryDraft.icon ?? ""}
              onSelect={(icon) =>
                setAddCategoryDraft((prev) => ({
                  ...prev,
                  icon,
                }))
              }
              prefix="new-category-icon"
            />
          </label>
          <CategoryPreview
            name={addCategoryDraft.name}
            color={addCategoryDraft.color}
            icon={addCategoryDraft.icon}
            fallbackLabel="Expense Category"
            colorKey={`new-expense:${addCategoryDraft.name}`}
          />
          {addCategoryDrawerError && (
            <p className="subtle-text subtle-text-error subtle-text-flush">
              {addCategoryDrawerError}
            </p>
          )}
          <div className="category-drawer-actions">
            <Button type="submit" size="sm" disabled={isAddCategoryDrawerSubmitting}>
              {isAddCategoryDrawerSubmitting ? "Adding..." : "Add Expense Category"}
            </Button>
          </div>
        </form>
      </DrawerShell>
    </>
  );
}

export function IncomeCategoryDrawers(props) {
  const {
    activeIncomeCategoryItem,
    closeIncomeCategoryDrawer,
    isIncomeCategoryDrawerSubmitting,
    handleIncomeCategoryDrawerSubmit,
    activeIncomeCategoryDraft,
    updateIncomeCategoryDraft,
    incomeCategoryDrawerError,
    handleIncomeCategoryDrawerDelete,
    isAddIncomeCategoryDrawerOpen,
    closeAddIncomeCategoryDrawer,
    isAddIncomeCategoryDrawerSubmitting,
    addIncomeCategoryDrawerError,
    handleAddIncomeCategoryDrawerSubmit,
    addIncomeCategoryDraft,
    setAddIncomeCategoryDraft,
  } = props;

  return (
    <>
      <DrawerShell
        open={Boolean(activeIncomeCategoryItem)}
        onClose={closeIncomeCategoryDrawer}
        title="Edit Income Category"
        closeDisabled={isIncomeCategoryDrawerSubmitting}
        ariaLabel="Edit income category"
      >
        {activeIncomeCategoryItem && (
          <form onSubmit={handleIncomeCategoryDrawerSubmit} className="recurring-drawer-form">
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Name</span>
              <input
                type="text"
                value={activeIncomeCategoryDraft?.name ?? activeIncomeCategoryItem.name}
                onChange={(event) =>
                  updateIncomeCategoryDraft(
                    activeIncomeCategoryItem.id,
                    "name",
                    event.target.value
                  )
                }
                required
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Color</span>
              <CategoryColorPicker
                selectedColor={resolveCategoryColor(
                  activeIncomeCategoryDraft?.color,
                  `income:${activeIncomeCategoryItem.id}:${activeIncomeCategoryDraft?.name ?? activeIncomeCategoryItem.name}`
                )}
                onSelect={(swatch) =>
                  updateIncomeCategoryDraft(activeIncomeCategoryItem.id, "color", swatch)
                }
                prefix="income-category-swatch"
              />
            </label>
            <label className="stack-fields">
              <span className="subtle-text subtle-text-flush">Icon</span>
              <CategoryIconPicker
                selectedIcon={activeIncomeCategoryDraft?.icon ?? ""}
                onSelect={(icon) =>
                  updateIncomeCategoryDraft(activeIncomeCategoryItem.id, "icon", icon)
                }
                prefix="income-category-icon"
              />
            </label>
            <CategoryPreview
              name={activeIncomeCategoryDraft?.name || activeIncomeCategoryItem.name}
              color={activeIncomeCategoryDraft?.color}
              icon={activeIncomeCategoryDraft?.icon || activeIncomeCategoryItem.icon}
              fallbackLabel="Income Category"
              colorKey={`income:${activeIncomeCategoryItem.id}:${activeIncomeCategoryDraft?.name ?? activeIncomeCategoryItem.name}`}
            />
            {incomeCategoryDrawerError && (
              <p className="subtle-text subtle-text-error subtle-text-flush">
                {incomeCategoryDrawerError}
              </p>
            )}
            <div className="category-drawer-actions">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="category-drawer-remove-button"
                onClick={handleIncomeCategoryDrawerDelete}
                disabled={isIncomeCategoryDrawerSubmitting}
              >
                Remove
              </Button>
              <Button type="submit" size="sm" disabled={isIncomeCategoryDrawerSubmitting}>
                {isIncomeCategoryDrawerSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DrawerShell>

      <DrawerShell
        open={isAddIncomeCategoryDrawerOpen}
        onClose={closeAddIncomeCategoryDrawer}
        title="Add Income Category"
        closeDisabled={isAddIncomeCategoryDrawerSubmitting}
        ariaLabel="Add income category"
      >
        <form onSubmit={handleAddIncomeCategoryDrawerSubmit} className="recurring-drawer-form">
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Name</span>
            <input
              type="text"
              value={addIncomeCategoryDraft.name}
              onChange={(event) =>
                setAddIncomeCategoryDraft((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Color</span>
              <CategoryColorPicker
                selectedColor={resolveCategoryColor(
                  addIncomeCategoryDraft.color,
                  `new-income:${addIncomeCategoryDraft.name}`
                )}
              onSelect={(swatch) =>
                setAddIncomeCategoryDraft((prev) => ({
                  ...prev,
                  color: swatch,
                }))
              }
                prefix="new-income-category-swatch"
              />
            </label>
          <label className="stack-fields">
            <span className="subtle-text subtle-text-flush">Icon</span>
            <CategoryIconPicker
              selectedIcon={addIncomeCategoryDraft.icon ?? ""}
              onSelect={(icon) =>
                setAddIncomeCategoryDraft((prev) => ({
                  ...prev,
                  icon,
                }))
              }
              prefix="new-income-category-icon"
            />
          </label>
          <CategoryPreview
            name={addIncomeCategoryDraft.name}
            color={addIncomeCategoryDraft.color}
            icon={addIncomeCategoryDraft.icon}
            fallbackLabel="Income Category"
            colorKey={`new-income:${addIncomeCategoryDraft.name}`}
          />
          {addIncomeCategoryDrawerError && (
            <p className="subtle-text subtle-text-error subtle-text-flush">
              {addIncomeCategoryDrawerError}
            </p>
          )}
          <div className="category-drawer-actions">
            <Button type="submit" size="sm" disabled={isAddIncomeCategoryDrawerSubmitting}>
              {isAddIncomeCategoryDrawerSubmitting ? "Adding..." : "Add Income Category"}
            </Button>
          </div>
        </form>
      </DrawerShell>
    </>
  );
}

export function SuggestionDrawer(props) {
  const {
    activeSuggestionItem,
    isAddSuggestionDrawerOpen,
    closeSuggestionDrawer,
    isSuggestionDrawerSubmitting,
    handleSuggestionDrawerSubmit,
    addSuggestionDraft,
    setAddSuggestionDraft,
    activeSuggestionDraft,
    updateSuggestionDraft,
    expenseCategoryOptions,
    suggestionDrawerError,
    activeSuggestionIsSelectedForEncoding,
    handleSuggestionSelectionToggle,
    handleSuggestionDrawerDelete,
    suggestionKey,
  } = props;

  return (
    <DrawerShell
      open={Boolean(activeSuggestionItem || isAddSuggestionDrawerOpen)}
      onClose={closeSuggestionDrawer}
      title={isAddSuggestionDrawerOpen ? "Add Suggestion" : "Edit Suggestion"}
      closeDisabled={isSuggestionDrawerSubmitting}
      ariaLabel={isAddSuggestionDrawerOpen ? "Add suggestion" : "Edit suggestion"}
    >
      <form onSubmit={handleSuggestionDrawerSubmit} className="recurring-drawer-form">
        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Name</span>
          <input
            type="text"
            value={
              isAddSuggestionDrawerOpen
                ? addSuggestionDraft.category
                : activeSuggestionDraft?.category ?? activeSuggestionItem?.category ?? ""
            }
            onChange={(event) => {
              if (isAddSuggestionDrawerOpen) {
                setAddSuggestionDraft((prev) => ({
                  ...prev,
                  category: event.target.value,
                }));
                return;
              }
              if (!activeSuggestionItem) {
                return;
              }
              updateSuggestionDraft(
                suggestionKey(activeSuggestionItem),
                "category",
                event.target.value
              );
            }}
            required
          />
        </label>
        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Expense Category</span>
          <select
            value={
              isAddSuggestionDrawerOpen
                ? addSuggestionDraft.expense_category_id
                : activeSuggestionDraft?.expense_category_id ?? ""
            }
            onChange={(event) => {
              if (isAddSuggestionDrawerOpen) {
                setAddSuggestionDraft((prev) => ({
                  ...prev,
                  expense_category_id: event.target.value,
                }));
                return;
              }
              if (!activeSuggestionItem) {
                return;
              }
              updateSuggestionDraft(
                suggestionKey(activeSuggestionItem),
                "expense_category_id",
                event.target.value
              );
            }}
          >
            <option value="">Uncategorized</option>
            {expenseCategoryOptions.map((category) => (
              <option key={`suggestion-category-${category.id}`} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="stack-fields">
          <span className="subtle-text subtle-text-flush">Last Amount</span>
          <input
            type="text"
            inputMode="decimal"
            value={
              isAddSuggestionDrawerOpen
                ? addSuggestionDraft.last_amount
                : activeSuggestionDraft?.last_amount ?? ""
            }
            onChange={(event) => {
              if (isAddSuggestionDrawerOpen) {
                setAddSuggestionDraft((prev) => ({
                  ...prev,
                  last_amount: formatAmountInput(event.target.value),
                }));
                return;
              }
              if (!activeSuggestionItem) {
                return;
              }
              updateSuggestionDraft(
                suggestionKey(activeSuggestionItem),
                "last_amount",
                event.target.value
              );
            }}
            placeholder="0.00"
          />
        </label>
        {suggestionDrawerError && (
          <p className="subtle-text subtle-text-error subtle-text-flush">
            {suggestionDrawerError}
          </p>
        )}
        <div className="category-drawer-actions">
          {!isAddSuggestionDrawerOpen && (
            <Button
              type="button"
              variant={activeSuggestionIsSelectedForEncoding ? "primary" : "subtle"}
              size="sm"
              onClick={handleSuggestionSelectionToggle}
              disabled={isSuggestionDrawerSubmitting}
            >
              {activeSuggestionIsSelectedForEncoding
                ? "Chosen for Encoding"
                : "Choose Suggestion"}
            </Button>
          )}
          {!isAddSuggestionDrawerOpen && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="category-drawer-remove-button"
              onClick={handleSuggestionDrawerDelete}
              disabled={isSuggestionDrawerSubmitting}
            >
              Remove
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSuggestionDrawerSubmitting}>
            {isSuggestionDrawerSubmitting
              ? "Saving..."
              : isAddSuggestionDrawerOpen
                ? "Add Suggestion"
                : "Save Changes"}
          </Button>
        </div>
      </form>
    </DrawerShell>
  );
}
