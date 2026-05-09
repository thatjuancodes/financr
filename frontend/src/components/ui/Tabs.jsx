import React from "react";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Tabs({
  tabs,
  activeId,
  onChange,
  className = "",
  buttonClassName = "",
}) {
  return (
    <div className={joinClasses("tabs", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={joinClasses(
              "tab-button",
              isActive ? "active" : "",
              buttonClassName
            )}
          >
            <span className="tab-button-label">{tab.label}</span>
            {Number(tab.badge ?? 0) > 0 ? (
              <span
                className={`tab-button-badge${isActive ? " active" : ""}`}
                aria-label={`${tab.badge} items due today`}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
