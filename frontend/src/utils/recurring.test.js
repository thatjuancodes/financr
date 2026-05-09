import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRecurringDayInput,
  normalizeSemiMonthlyDays,
  recurringFrequencyOptionsForType,
  recurringMonthlyAmount,
  getRecurringTransferDirection,
  getRecurringTransferName,
  getRecurringTransferCategoryLabel,
  calculateRecurringPerspectiveTotals,
} from "./recurring.js";

test("normalizeRecurringDayInput keeps 2 digits only", () => {
  assert.equal(normalizeRecurringDayInput("a1b25"), "12");
});

test("normalizeSemiMonthlyDays sorts valid days", () => {
  assert.deepEqual(normalizeSemiMonthlyDays("30", "15"), {
    valid: true,
    day1: 15,
    day2: 30,
  });
});

test("income frequency options include semi-monthly, expense no", () => {
  assert.ok(recurringFrequencyOptionsForType("income").includes("semi_monthly"));
  assert.ok(!recurringFrequencyOptionsForType("expense").includes("semi_monthly"));
});

test("recurringMonthlyAmount converts weekly to avg month", () => {
  assert.equal(recurringMonthlyAmount({ amount: 5000, frequency: "weekly" }), 5000 * (52 / 12));
});

test("transfer perspective labels use entity side", () => {
  const item = {
    type: "transfer",
    from_account_entity_id: "family",
    to_account_entity_id: "personal",
    from_account_name: "PNB",
    to_account_name: "BPI",
    mirror_as_income_expense: true,
    expense_category_name: "Allowance Out",
    income_category_name: "Allowance In",
  };
  assert.equal(getRecurringTransferDirection(item, "family"), "outgoing");
  assert.equal(getRecurringTransferDirection(item, "personal"), "incoming");
  assert.equal(getRecurringTransferName(item, "family"), "To BPI");
  assert.equal(getRecurringTransferName(item, "personal"), "From PNB");
  assert.equal(getRecurringTransferCategoryLabel(item, "family"), "Allowance Out");
  assert.equal(getRecurringTransferCategoryLabel(item, "personal"), "Allowance In");
});

test("transfer perspective totals count only relevant side", () => {
  const totals = calculateRecurringPerspectiveTotals(
    [
      {
        type: "transfer",
        amount: 5000,
        frequency: "weekly",
        from_account_entity_id: "family",
        to_account_entity_id: "personal",
      },
    ],
    "personal"
  );
  assert.equal(totals.income.weekly, 5000);
  assert.equal(totals.expense.weekly, 0);
});
