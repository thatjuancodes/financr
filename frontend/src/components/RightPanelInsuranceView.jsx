import React from "react";
import { formatAmountInput, parseAmountInput } from "../utils/format";
import {
  diffDaysFromToday,
  formatRemainingDaysLabel,
} from "../utils/rightPanel";
import {
  getPendingLifeInsuranceItems,
  getLifeInsuranceNextPremiumDue,
  getLifeInsuranceNextPremiumDueIso,
} from "../utils/insurance";
import Button from "./ui/Button";

const LIFE_INSURANCE_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

function buildEmptyDraft(activeEntityFilterId, entities = []) {
  const firstEntityId = String(entities[0]?.id || "").trim();
  return {
    entity_id: String(activeEntityFilterId || "").trim() || firstEntityId,
    provider: "",
    policy_name: "",
    insured_person: "",
    coverage_amount: "",
    cash_surrender_value: "",
    premium_amount: "",
    payment_frequency: "monthly",
    renewal_date: "",
    notes: "",
    is_active: true,
  };
}

function buildDraftFromItem(item) {
  return {
    entity_id: String(item?.entity_id || "").trim(),
    provider: String(item?.provider || ""),
    policy_name: String(item?.policy_name || ""),
    insured_person: String(item?.insured_person || ""),
    coverage_amount: formatAmountInput(String(item?.coverage_amount ?? "")),
    cash_surrender_value: formatAmountInput(String(item?.cash_surrender_value ?? "")),
    premium_amount: formatAmountInput(String(item?.premium_amount ?? "")),
    payment_frequency: String(item?.payment_frequency || "monthly"),
    renewal_date: String(item?.renewal_date || ""),
    notes: String(item?.notes || ""),
    is_active:
      item?.is_active === true || item?.is_active === 1 || item?.is_active === "1",
  };
}

function normalizePayload(draft) {
  const entityId = String(draft?.entity_id || "").trim();
  const provider = String(draft?.provider || "").trim();
  const policyName = String(draft?.policy_name || "").trim();
  const insuredPerson = String(draft?.insured_person || "").trim();
  const coverageAmountRaw = String(draft?.coverage_amount ?? "").trim();
  const cashSurrenderValueRaw = String(draft?.cash_surrender_value ?? "").trim();
  const premiumAmountRaw = String(draft?.premium_amount ?? "").trim();
  const coverageAmount = parseAmountInput(draft?.coverage_amount ?? 0);
  const cashSurrenderValue = cashSurrenderValueRaw
    ? parseAmountInput(draft?.cash_surrender_value ?? 0)
    : 0;
  const premiumAmount = parseAmountInput(draft?.premium_amount ?? 0);
  const paymentFrequency = String(draft?.payment_frequency || "").trim().toLowerCase();
  const renewalDate = String(draft?.renewal_date || "").trim();
  const notes = String(draft?.notes || "").trim();

  if (
    !entityId ||
    !provider ||
    !policyName ||
    !insuredPerson ||
    !coverageAmountRaw ||
    !premiumAmountRaw ||
    !Number.isFinite(coverageAmount) ||
    coverageAmount < 0 ||
    !Number.isFinite(cashSurrenderValue) ||
    cashSurrenderValue < 0 ||
    !Number.isFinite(premiumAmount) ||
    premiumAmount < 0 ||
    !paymentFrequency
  ) {
    throw new Error(
      "Entity, provider, policy name, insured person, coverage, premium, and frequency are required."
    );
  }

  return {
    entity_id: entityId,
    provider,
    policy_name: policyName,
    insured_person: insuredPerson,
    coverage_amount: coverageAmount,
    cash_surrender_value: cashSurrenderValue,
    premium_amount: premiumAmount,
    payment_frequency: paymentFrequency,
    renewal_date: renewalDate || null,
    notes: notes || null,
    is_active: Boolean(draft?.is_active),
  };
}

export default function RightPanelInsuranceView({
  entities = [],
  activeEntityFilterId = undefined,
  lifeInsurances = [],
  formatMoney,
  onCreateLifeInsurance,
  onUpdateLifeInsurance,
  onDeleteLifeInsurance,
}) {
  const [activeInsuranceId, setActiveInsuranceId] = React.useState(null);
  const [activeInsuranceDraft, setActiveInsuranceDraft] = React.useState(null);
  const [insuranceDrawerError, setInsuranceDrawerError] = React.useState("");
  const [isInsuranceDrawerSubmitting, setIsInsuranceDrawerSubmitting] =
    React.useState(false);
  const [isAddInsuranceDrawerOpen, setIsAddInsuranceDrawerOpen] =
    React.useState(false);
  const [addInsuranceDraft, setAddInsuranceDraft] = React.useState(() =>
    buildEmptyDraft(activeEntityFilterId, entities)
  );
  const [addInsuranceDrawerError, setAddInsuranceDrawerError] =
    React.useState("");
  const [isAddInsuranceDrawerSubmitting, setIsAddInsuranceDrawerSubmitting] =
    React.useState(false);

  const activeInsuranceItem = React.useMemo(() => {
    return (
      (Array.isArray(lifeInsurances) ? lifeInsurances : []).find(
        (item) => item.id === activeInsuranceId
      ) ?? null
    );
  }, [lifeInsurances, activeInsuranceId]);

  const showEntityColumn = !String(activeEntityFilterId || "").trim();
  const lifeInsuranceRows = React.useMemo(() => {
    return (Array.isArray(lifeInsurances) ? lifeInsurances : []).map((item) => {
      const nextPremiumDueDate = getLifeInsuranceNextPremiumDue(item);
      const nextPremiumDue = nextPremiumDueDate
        ? getLifeInsuranceNextPremiumDueIso(item)
        : null;
      const dueInLabel = nextPremiumDueDate
        ? formatRemainingDaysLabel(diffDaysFromToday(nextPremiumDueDate))
        : "-";
      return {
        ...item,
        next_premium_due: nextPremiumDue,
        next_premium_due_label: dueInLabel,
      };
    });
  }, [lifeInsurances]);
  const pendingLifeInsurances = React.useMemo(() => {
    const pendingIds = new Set(
      getPendingLifeInsuranceItems(lifeInsuranceRows).map((item) => item.id)
    );
    return lifeInsuranceRows.filter((item) => pendingIds.has(item.id));
  }, [lifeInsuranceRows]);
  const totalCoverage = React.useMemo(() => {
    return lifeInsuranceRows.reduce(
      (sum, item) => sum + Number(item?.coverage_amount ?? 0),
      0
    );
  }, [lifeInsuranceRows]);
  const totalPremium = React.useMemo(() => {
    return lifeInsuranceRows.reduce(
      (sum, item) => sum + Number(item?.premium_amount ?? 0),
      0
    );
  }, [lifeInsuranceRows]);
  const totalCashSurrenderValue = React.useMemo(() => {
    return lifeInsuranceRows.reduce(
      (sum, item) => sum + Number(item?.cash_surrender_value ?? 0),
      0
    );
  }, [lifeInsuranceRows]);

  React.useEffect(() => {
    if (!activeInsuranceItem) {
      setActiveInsuranceDraft(null);
      return;
    }
    setActiveInsuranceDraft(buildDraftFromItem(activeInsuranceItem));
  }, [activeInsuranceItem]);

  React.useEffect(() => {
    if (!isAddInsuranceDrawerOpen) {
      return;
    }
    setAddInsuranceDraft((prev) => {
      const normalizedEntityId = String(prev?.entity_id || "").trim();
      if (normalizedEntityId) {
        return prev;
      }
      return buildEmptyDraft(activeEntityFilterId, entities);
    });
  }, [activeEntityFilterId, entities, isAddInsuranceDrawerOpen]);

  const updateDraft = (setter) => (field, value) => {
    setter((prev) => ({
      ...prev,
      [field]:
        field === "coverage_amount" ||
        field === "cash_surrender_value" ||
        field === "premium_amount"
          ? formatAmountInput(value)
          : value,
    }));
  };

  const updateActiveDraft = updateDraft(setActiveInsuranceDraft);
  const updateAddDraft = updateDraft(setAddInsuranceDraft);

  const openInsuranceDrawer = (item) => {
    setActiveInsuranceId(item.id);
    setInsuranceDrawerError("");
    setIsInsuranceDrawerSubmitting(false);
  };

  const closeInsuranceDrawer = () => {
    if (isInsuranceDrawerSubmitting) {
      return;
    }
    setActiveInsuranceId(null);
    setInsuranceDrawerError("");
  };

  const openAddInsuranceDrawer = () => {
    setAddInsuranceDraft(buildEmptyDraft(activeEntityFilterId, entities));
    setAddInsuranceDrawerError("");
    setIsAddInsuranceDrawerSubmitting(false);
    setIsAddInsuranceDrawerOpen(true);
  };

  const closeAddInsuranceDrawer = () => {
    if (isAddInsuranceDrawerSubmitting) {
      return;
    }
    setIsAddInsuranceDrawerOpen(false);
    setAddInsuranceDrawerError("");
  };

  const handleInsuranceRowKeyDown = (event, item) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openInsuranceDrawer(item);
    }
  };

  const handleInsuranceDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!activeInsuranceItem || !activeInsuranceDraft || !onUpdateLifeInsurance) {
      return;
    }
    try {
      const payload = normalizePayload(activeInsuranceDraft);
      setInsuranceDrawerError("");
      setIsInsuranceDrawerSubmitting(true);
      await onUpdateLifeInsurance(activeInsuranceItem.id, payload);
      setActiveInsuranceId(null);
    } catch (err) {
      setInsuranceDrawerError(err.message || "Failed to update life insurance.");
    } finally {
      setIsInsuranceDrawerSubmitting(false);
    }
  };

  const handleInsuranceDrawerDelete = async () => {
    if (!activeInsuranceItem || !onDeleteLifeInsurance) {
      return;
    }
    try {
      setInsuranceDrawerError("");
      setIsInsuranceDrawerSubmitting(true);
      await onDeleteLifeInsurance(activeInsuranceItem.id);
      setActiveInsuranceId(null);
    } catch (err) {
      setInsuranceDrawerError(err.message || "Failed to delete life insurance.");
    } finally {
      setIsInsuranceDrawerSubmitting(false);
    }
  };

  const handleAddInsuranceDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!onCreateLifeInsurance) {
      return;
    }
    try {
      const payload = normalizePayload(addInsuranceDraft);
      setAddInsuranceDrawerError("");
      setIsAddInsuranceDrawerSubmitting(true);
      await onCreateLifeInsurance(payload);
      setIsAddInsuranceDrawerOpen(false);
      setAddInsuranceDraft(buildEmptyDraft(activeEntityFilterId, entities));
    } catch (err) {
      setAddInsuranceDrawerError(err.message || "Failed to add life insurance.");
    } finally {
      setIsAddInsuranceDrawerSubmitting(false);
    }
  };

  const renderDrawerForm = ({
    draft,
    updateField,
    error,
    isSubmitting,
    submitLabel,
    onSubmit,
    onDelete = null,
  }) => (
    <form onSubmit={onSubmit} className="recurring-drawer-form">
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Entity</span>
        <select
          value={draft.entity_id}
          onChange={(event) => updateField("entity_id", event.target.value)}
          required
        >
          <option value="">Select entity</option>
          {entities.map((entity) => (
            <option key={`insurance-entity-${entity.id}`} value={String(entity.id)}>
              {entity.name} ({entity.type})
            </option>
          ))}
        </select>
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Provider</span>
        <input
          type="text"
          value={draft.provider}
          onChange={(event) => updateField("provider", event.target.value)}
          required
        />
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Policy Name</span>
        <input
          type="text"
          value={draft.policy_name}
          onChange={(event) => updateField("policy_name", event.target.value)}
          required
        />
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Insured Person</span>
        <input
          type="text"
          value={draft.insured_person}
          onChange={(event) => updateField("insured_person", event.target.value)}
          required
        />
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Coverage Amount</span>
        <input
          type="text"
          inputMode="decimal"
          value={draft.coverage_amount}
          onChange={(event) => updateField("coverage_amount", event.target.value)}
          required
        />
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Cash Surrender Value</span>
        <input
          type="text"
          inputMode="decimal"
          value={draft.cash_surrender_value}
          onChange={(event) =>
            updateField("cash_surrender_value", event.target.value)
          }
          placeholder="Optional for non-VUL policies"
        />
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Premium Amount</span>
        <input
          type="text"
          inputMode="decimal"
          value={draft.premium_amount}
          onChange={(event) => updateField("premium_amount", event.target.value)}
          required
        />
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Payment Frequency</span>
        <select
          value={draft.payment_frequency}
          onChange={(event) => updateField("payment_frequency", event.target.value)}
          required
        >
          {LIFE_INSURANCE_FREQUENCIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Renewal Date</span>
        <input
          type="date"
          value={draft.renewal_date}
          onChange={(event) => updateField("renewal_date", event.target.value)}
        />
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Status</span>
        <select
          value={draft.is_active ? "true" : "false"}
          onChange={(event) =>
            updateField("is_active", event.target.value === "true")
          }
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>
      <label className="stack-fields">
        <span className="subtle-text subtle-text-flush">Notes</span>
        <textarea
          rows={4}
          value={draft.notes}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </label>
      {error && (
        <p className="subtle-text subtle-text-error subtle-text-flush">{error}</p>
      )}
      <div className="category-drawer-actions">
        {typeof onDelete === "function" ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="category-drawer-remove-button"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            Remove
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <section>
        <div className="expense-header-row">
          <h2>Insurance</h2>
          <div className="section-header-actions">
            <Button
              type="button"
              size="sm"
              onClick={openAddInsuranceDrawer}
              disabled={entities.length === 0}
            >
              Add life insurance
            </Button>
          </div>
        </div>
        <div className="filter-row">
          <div className="filters">
            <p className="subtle-text subtle-text-flush">
              Life insurance policies owned by entities.
            </p>
          </div>
          <p className="total-right">
            Coverage: {formatMoney(totalCoverage)} | Cash Value: {formatMoney(totalCashSurrenderValue)} | Premiums: {formatMoney(totalPremium)}
          </p>
        </div>
        <div className="recurring-overview-dues">
          <div className="recurring-pending-section">
            <p className="subtle-text subtle-text-flush recurring-pending-label">
              Due today
            </p>
            {pendingLifeInsurances.length === 0 ? (
              <p className="empty-state">Nothing is due today.</p>
            ) : (
              <div className="table-scroll">
                <table className="table recurring-due-table">
                  <thead>
                    <tr>
                      <th className="cell-left">Due</th>
                      {showEntityColumn ? <th>Entity</th> : null}
                      <th>Provider</th>
                      <th>Policy</th>
                      <th className="cell-right">Premium</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLifeInsurances.map((item) => (
                      <tr key={`life-insurance-pending-${item.id}`}>
                        <td className="cell-left">{item.next_premium_due}</td>
                        {showEntityColumn ? <td>{item.entity_name || "Unknown"}</td> : null}
                        <td>{item.provider}</td>
                        <td>{item.policy_name}</td>
                        <td className="cell-right">{formatMoney(item.premium_amount)}</td>
                        <td>{item.next_premium_due_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {lifeInsuranceRows.length === 0 ? (
          <p className="empty-state">No life insurance policies recorded yet.</p>
        ) : (
          <>
            <p className="subtle-text subtle-text-flush recurring-table-hint">
              Click a row to edit.
            </p>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    {showEntityColumn ? <th className="cell-left">Entity</th> : null}
                    <th>Provider</th>
                    <th>Policy</th>
                    <th>Insured Person</th>
                    <th className="cell-right">Coverage</th>
                    <th className="cell-right">Cash Value</th>
                    <th className="cell-right">Premium</th>
                    <th>Frequency</th>
                    <th>Next Premium Due</th>
                    <th>Due In</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lifeInsuranceRows.map((item) => (
                    <tr
                      key={`life-insurance-${item.id}`}
                      className={
                        item.id === activeInsuranceId ? "expense-row-active" : undefined
                      }
                      onClick={() => openInsuranceDrawer(item)}
                      onKeyDown={(event) => handleInsuranceRowKeyDown(event, item)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Edit life insurance ${item.policy_name}`}
                    >
                      {showEntityColumn ? (
                        <td className="cell-left">{item.entity_name || "Unknown"}</td>
                      ) : null}
                      <td>{item.provider}</td>
                      <td>{item.policy_name}</td>
                      <td>{item.insured_person}</td>
                      <td className="cell-right">{formatMoney(item.coverage_amount)}</td>
                      <td className="cell-right">{formatMoney(item.cash_surrender_value)}</td>
                      <td className="cell-right">{formatMoney(item.premium_amount)}</td>
                      <td>
                        {LIFE_INSURANCE_FREQUENCIES.find(
                          (option) => option.value === item.payment_frequency
                        )?.label || item.payment_frequency}
                      </td>
                      <td>{item.next_premium_due || "N/A"}</td>
                      <td>{item.next_premium_due_label}</td>
                      <td>{Boolean(item.is_active) ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {activeInsuranceItem && activeInsuranceDraft ? (
        <div className="side-drawer-backdrop" onClick={closeInsuranceDrawer}>
          <aside
            className="side-drawer income-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Edit life insurance"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Edit Life Insurance</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeInsuranceDrawer}
                disabled={isInsuranceDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            {renderDrawerForm({
              draft: activeInsuranceDraft,
              updateField: updateActiveDraft,
              error: insuranceDrawerError,
              isSubmitting: isInsuranceDrawerSubmitting,
              submitLabel: "Save Changes",
              onSubmit: handleInsuranceDrawerSubmit,
              onDelete: handleInsuranceDrawerDelete,
            })}
          </aside>
        </div>
      ) : null}

      {isAddInsuranceDrawerOpen ? (
        <div className="side-drawer-backdrop" onClick={closeAddInsuranceDrawer}>
          <aside
            className="side-drawer income-edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Add life insurance"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-drawer-header">
              <h2>Add Life Insurance</h2>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={closeAddInsuranceDrawer}
                disabled={isAddInsuranceDrawerSubmitting}
              >
                Close
              </Button>
            </div>
            {renderDrawerForm({
              draft: addInsuranceDraft,
              updateField: updateAddDraft,
              error: addInsuranceDrawerError,
              isSubmitting: isAddInsuranceDrawerSubmitting,
              submitLabel: "Add Life Insurance",
              onSubmit: handleAddInsuranceDrawerSubmit,
            })}
          </aside>
        </div>
      ) : null}
    </>
  );
}
