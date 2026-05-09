import React from "react";

export default function InfoTooltip({
  open,
  onToggle,
  buttonLabel,
  dialogLabel,
  children,
}) {
  return (
    <span className="info-popover">
      <button
        type="button"
        className="info-button"
        aria-label={buttonLabel}
        aria-expanded={open}
        onClick={onToggle}
      >
        i
      </button>
      {open && (
        <span className="info-popup" role="dialog" aria-label={dialogLabel}>
          {children}
        </span>
      )}
    </span>
  );
}
