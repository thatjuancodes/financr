import React from "react";

function getSortGlyph(active, direction) {
  if (!active) {
    return "↕";
  }
  return direction === "asc" ? "↑" : "↓";
}

export default function SortIconButton({
  active = false,
  direction = "desc",
  ariaLabel,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`sort-icon-button${active ? " active" : ""}`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {getSortGlyph(active, direction)}
    </button>
  );
}
