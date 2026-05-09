import test from "node:test";
import assert from "node:assert/strict";
import {
  getLifeInsuranceFrequencyMonths,
  getLifeInsuranceNextPremiumDueIso,
  getPendingLifeInsuranceItems,
} from "./insurance.js";

test("life insurance frequency maps to month intervals", () => {
  assert.equal(getLifeInsuranceFrequencyMonths("monthly"), 1);
  assert.equal(getLifeInsuranceFrequencyMonths("quarterly"), 3);
  assert.equal(getLifeInsuranceFrequencyMonths("semi_annual"), 6);
  assert.equal(getLifeInsuranceFrequencyMonths("annual"), 12);
  assert.equal(getLifeInsuranceFrequencyMonths("weekly"), null);
});

test("life insurance next premium due advances from the anchor date", () => {
  const referenceDate = new Date(2026, 3, 27);
  assert.equal(
    getLifeInsuranceNextPremiumDueIso(
      {
        renewal_date: "2026-01-15",
        payment_frequency: "monthly",
        is_active: 1,
      },
      referenceDate
    ),
    "2026-05-15"
  );

  assert.equal(
    getLifeInsuranceNextPremiumDueIso(
      {
        renewal_date: "2026-02-28",
        payment_frequency: "quarterly",
        is_active: true,
      },
      referenceDate
    ),
    "2026-05-28"
  );
});

test("pending life insurance items include today and overdue active records only", () => {
  const referenceDate = new Date(2026, 3, 27);
  const pending = getPendingLifeInsuranceItems(
    [
      {
        id: 1,
        renewal_date: "2026-04-27",
        payment_frequency: "annual",
        is_active: 1,
      },
      {
        id: 2,
        renewal_date: "2026-03-27",
        payment_frequency: "monthly",
        is_active: 1,
      },
      {
        id: 3,
        renewal_date: "2026-05-10",
        payment_frequency: "annual",
        is_active: 1,
      },
      {
        id: 4,
        renewal_date: "2026-04-27",
        payment_frequency: "annual",
        is_active: 0,
      },
    ],
    referenceDate
  );
  assert.deepEqual(
    pending.map((item) => item.id),
    [1, 2]
  );
});
