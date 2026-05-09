const CATEGORY_COLOR_SWATCHES = [
  "#FECDD3",
  "#FDA4AF",
  "#FB7185",
  "#F43F5E",
  "#FED7AA",
  "#FDBA74",
  "#FB923C",
  "#F97316",
  "#FEF08A",
  "#FCD34D",
  "#FACC15",
  "#EAB308",
  "#BBF7D0",
  "#86EFAC",
  "#4ADE80",
  "#22C55E",
  "#A5F3FC",
  "#67E8F9",
  "#22D3EE",
  "#06B6D4",
  "#BAE6FD",
  "#7DD3FC",
  "#38BDF8",
  "#0EA5E9",
  "#DDD6FE",
  "#C4B5FD",
  "#A78BFA",
  "#8B5CF6",
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const CATEGORY_ICON = /^ri-[a-z0-9-]+$/;

function normalizeCategoryColor(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (!HEX_COLOR.test(trimmed)) {
    return null;
  }
  return trimmed.toUpperCase();
}

function normalizeCategoryIcon(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (!CATEGORY_ICON.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function hashSeed(seed) {
  const text = String(seed || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickCategoryColor(seed) {
  if (CATEGORY_COLOR_SWATCHES.length === 0) {
    return "#DBEAFE";
  }
  const index = hashSeed(seed) % CATEGORY_COLOR_SWATCHES.length;
  return CATEGORY_COLOR_SWATCHES[index];
}

module.exports = {
  CATEGORY_COLOR_SWATCHES,
  normalizeCategoryColor,
  normalizeCategoryIcon,
  pickCategoryColor,
};
