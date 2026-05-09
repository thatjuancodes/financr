import React from "react";
import Button from "./Button";

export default function BadgeButtonGroup({
  items,
  getKey,
  getLabel,
  onItemClick,
  className = "",
  buttonClassName = "",
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className={`badge-button-group ${className}`.trim()}>
      {items.map((item) => (
        <Button
          key={getKey(item)}
          type="button"
          variant="subtle"
          size="sm"
          className={`badge-button ${buttonClassName}`.trim()}
          onClick={() => onItemClick(item)}
        >
          {getLabel(item)}
        </Button>
      ))}
    </div>
  );
}
