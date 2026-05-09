import React from "react";
import RowActionsMenu from "./RowActionsMenu";
import { formatRecurringFrequencyDisplay } from "../utils/rightPanel";
import { getRecurringTransferDirection } from "../utils/recurring";

export default function RecurringTypeTable({
  items,
  title,
  emptyMessage,
  headerContent = null,
  activeRecurringItemId,
  openRecurringDrawer,
  handleRecurringRowKeyDown,
  formatMoney,
  activeEntityFilterId,
  getRecurringTransferName,
  getRecurringTransferCategoryLabel,
  handleRecurringCategoryUpdate,
  incomeCategoryOptions,
  expenseCategoryOptions,
  getIncomeCategoryBadgeStyle,
  getExpenseCategoryBadgeStyle,
}) {
  return (
    <section>
      <div className="recurring-section-header">
        <h3>{title}</h3>
        {headerContent}
      </div>
      {items.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <div className="table-scroll">
          <table className="table recurring-records-table">
            <colgroup>
              <col className="recurring-due-column" />
              <col className="recurring-amount-column" />
              <col className="recurring-name-column" />
              <col className="recurring-category-column" />
              <col className="recurring-frequency-column" />
              <col className="recurring-last-column" />
            </colgroup>
            <thead>
              <tr>
                <th className="cell-left recurring-due-column">Next Due</th>
                <th className="recurring-amount-column">Amount</th>
                <th className="recurring-name-column">Name / Source</th>
                <th className="recurring-category-column">Category</th>
                <th className="recurring-frequency-column">Frequency</th>
                <th className="cell-left recurring-last-column">Last</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const transferDirection =
                  item.type === "transfer"
                    ? getRecurringTransferDirection(item, activeEntityFilterId)
                    : "neutral";
                const transferCategoryStyle =
                  item.type === "transfer" && item.mirror_as_income_expense
                    ? transferDirection === "incoming"
                      ? getIncomeCategoryBadgeStyle(
                          item.income_category_id,
                          item.income_category_name
                        )
                      : transferDirection === "outgoing"
                        ? getExpenseCategoryBadgeStyle(
                            item.expense_category_id,
                            item.expense_category_name
                          )
                        : undefined
                    : undefined;

                return (
                  <tr
                    key={`recurring-${item.id}`}
                    className={`recurring-row${
                      item.id === activeRecurringItemId ? " recurring-row-active" : ""
                    }`}
                    onClick={() => openRecurringDrawer(item.id)}
                    onKeyDown={(event) => handleRecurringRowKeyDown(event, item.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit recurring item ${item.category}`}
                  >
                    <td className="cell-left recurring-due-column">{item.next_due_date}</td>
                    <td className="recurring-amount-column">{formatMoney(item.amount)}</td>
                    <td className="recurring-name-column">
                      {item.type === "transfer"
                        ? `${item.category} · ${getRecurringTransferName(
                            item,
                            activeEntityFilterId
                          )}`
                        : item.category}
                    </td>
                    <td
                      className="expense-category-cell recurring-category-column"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      {item.type === "transfer" ? (
                        <span
                          className="expense-category-badge expense-category-badge-static"
                          style={transferCategoryStyle}
                        >
                          <span className="expense-category-badge-label">
                            {getRecurringTransferCategoryLabel(item, activeEntityFilterId)}
                          </span>
                        </span>
                      ) : (
                        <RowActionsMenu
                          align="left"
                          menuClassName="expense-category-dropdown"
                          itemClassName="expense-category-dropdown-item"
                          actions={[
                            {
                              label: `${
                                item.type === "income"
                                  ? item.income_category_id === null ||
                                    item.income_category_id === undefined
                                    ? "✓ "
                                    : ""
                                  : item.expense_category_id === null ||
                                    item.expense_category_id === undefined
                                    ? "✓ "
                                    : ""
                              }Uncategorized`,
                              onClick: () => handleRecurringCategoryUpdate(item, null),
                            },
                            ...(
                              item.type === "income"
                                ? incomeCategoryOptions
                                : expenseCategoryOptions
                            ).map((categoryOption) => ({
                              label: `${
                                item.type === "income"
                                  ? item.income_category_id === categoryOption.id
                                    ? "✓ "
                                    : ""
                                  : item.expense_category_id === categoryOption.id
                                    ? "✓ "
                                    : ""
                              }${categoryOption.name}`,
                              onClick: () =>
                                handleRecurringCategoryUpdate(item, categoryOption.id),
                            })),
                          ]}
                          renderTrigger={({ open, setOpen, buttonRef }) => (
                            <button
                              ref={buttonRef}
                              type="button"
                              className={`expense-category-badge${open ? " open" : ""}`}
                              style={
                                item.type === "income"
                                  ? getIncomeCategoryBadgeStyle(
                                      item.income_category_id,
                                      item.income_category_name
                                    )
                                  : getExpenseCategoryBadgeStyle(
                                      item.expense_category_id,
                                      item.expense_category_name
                                    )
                              }
                              aria-haspopup="menu"
                              aria-expanded={open}
                              aria-label={`Change recurring category for ${item.category}`}
                              onClick={() => setOpen((prev) => !prev)}
                            >
                              <span className="expense-category-badge-label">
                                {item.type === "income"
                                  ? item.income_category_name || "Uncategorized"
                                  : item.expense_category_name || "Uncategorized"}
                              </span>
                              <span className="expense-category-badge-caret">▾</span>
                            </button>
                          )}
                        />
                      )}
                    </td>
                    <td className="recurring-frequency-column">
                      {formatRecurringFrequencyDisplay(item)}
                    </td>
                    <td className="cell-left recurring-last-column">
                      {item.last_confirmed_date ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
