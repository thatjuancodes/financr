export const todayISO = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
export const currentMonthKey = () => todayISO().slice(0, 7);

export const monthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
};

export const formatAmountInput = (value) => {
  if (!value) return "";
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return cleaned;

  const negative = cleaned.startsWith("-");
  const withoutSign = negative ? cleaned.slice(1) : cleaned;
  const [intPartRaw, decPartRaw] = withoutSign.split(".");
  const intPart = intPartRaw.replace(/^0+(?=\d)/, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decPart = decPartRaw !== undefined ? decPartRaw.slice(0, 2) : "";
  const combined = decPartRaw !== undefined ? `${grouped}.${decPart}` : grouped;
  return negative ? `-${combined}` : combined;
};

export const parseAmountInput = (value) => Number(String(value).replace(/,/g, ""));
