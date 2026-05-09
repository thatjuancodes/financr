const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const LIFE_INSURANCE_FREQUENCY_MONTHS = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

function parseIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function startOfDay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatIsoDate(date) {
  const normalized = startOfDay(date);
  if (!normalized) {
    return null;
  }
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsPreservingDay(date, months) {
  const normalized = startOfDay(date);
  if (!normalized || !Number.isInteger(months)) {
    return null;
  }
  const originalDay = normalized.getDate();
  const next = new Date(
    normalized.getFullYear(),
    normalized.getMonth() + months,
    1
  );
  const lastDayOfMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0
  ).getDate();
  next.setDate(Math.min(originalDay, lastDayOfMonth));
  return next;
}

function isActiveLifeInsurance(item) {
  return (
    item?.is_active === true ||
    item?.is_active === 1 ||
    item?.is_active === "1"
  );
}

export function getLifeInsuranceFrequencyMonths(frequency) {
  return LIFE_INSURANCE_FREQUENCY_MONTHS[String(frequency || "").trim().toLowerCase()] || null;
}

export function getLifeInsuranceNextPremiumDue(item, referenceDate = new Date()) {
  if (!isActiveLifeInsurance(item)) {
    return null;
  }
  const anchorDate = parseIsoDate(String(item?.renewal_date || "").trim());
  const intervalMonths = getLifeInsuranceFrequencyMonths(item?.payment_frequency);
  const today = startOfDay(referenceDate);
  if (!anchorDate || !intervalMonths || !today) {
    return null;
  }

  let dueDate = anchorDate;
  let guard = 0;
  while (dueDate < today && guard < 240) {
    const next = addMonthsPreservingDay(dueDate, intervalMonths);
    if (!next) {
      return null;
    }
    dueDate = next;
    guard += 1;
  }

  return dueDate;
}

export function getLifeInsuranceNextPremiumDueIso(item, referenceDate = new Date()) {
  return formatIsoDate(getLifeInsuranceNextPremiumDue(item, referenceDate));
}

export function getPendingLifeInsuranceItems(items = [], referenceDate = new Date()) {
  const today = formatIsoDate(referenceDate);
  if (!today) {
    return [];
  }
  return (Array.isArray(items) ? items : []).filter((item) => {
    const dueDate = getLifeInsuranceNextPremiumDueIso(item, referenceDate);
    return dueDate && dueDate <= today;
  });
}
