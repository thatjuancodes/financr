export const CATEGORY_COLOR_SWATCHES = [
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
const TEXT_DARK = "#111827";
const TEXT_LIGHT = "#FFFFFF";
const DARK_BACKGROUND_LUMINANCE_THRESHOLD = 0.42;

export function normalizeCategoryColor(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed || !HEX_COLOR.test(trimmed)) {
    return null;
  }
  return trimmed.toUpperCase();
}

function hashCategorySeed(seed) {
  const text = String(seed || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function pickCategoryColor(seed) {
  const index = hashCategorySeed(seed) % CATEGORY_COLOR_SWATCHES.length;
  return CATEGORY_COLOR_SWATCHES[index];
}

export function resolveCategoryColor(value, seed) {
  return normalizeCategoryColor(value) || pickCategoryColor(seed);
}

function relativeLuminance(color) {
  const normalized = normalizeCategoryColor(color);
  if (!normalized) {
    return 1;
  }
  const hex = normalized.slice(1);
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    if (value <= 0.03928) {
      return value / 12.92;
    }
    return ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(colorA, colorB) {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function buildCategoryBadgeStyle(color) {
  const backgroundLuminance = relativeLuminance(color);
  const contrastWithWhite = contrastRatio(color, TEXT_LIGHT);
  const contrastWithDark = contrastRatio(color, TEXT_DARK);
  const useWhiteText =
    backgroundLuminance <= DARK_BACKGROUND_LUMINANCE_THRESHOLD ||
    contrastWithWhite >= contrastWithDark;
  return {
    backgroundColor: color,
    borderColor: useWhiteText
      ? "rgba(255, 255, 255, 0.38)"
      : "rgba(15, 23, 42, 0.2)",
    color: useWhiteText ? TEXT_LIGHT : "var(--color-dark)",
  };
}
