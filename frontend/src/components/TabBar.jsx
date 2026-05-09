import React from "react";
import Button from "./ui/Button";
import Tabs from "./ui/Tabs";

export default function TabBar({
  tabs,
  activeView,
  onChange,
  compact = false,
  entityOptions = [],
  selectedEntityId = "",
  onEntityChange = null,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const activeTab = tabs.find((tab) => tab.id === activeView);
  const hasEntitySwitcher =
    typeof onEntityChange === "function" &&
    Array.isArray(entityOptions) &&
    entityOptions.length > 0;

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeView, compact]);

  const entitySwitcher = hasEntitySwitcher ? (
    <label className="tabbar-entity-switcher">
      <select
        value={selectedEntityId}
        onChange={(event) => onEntityChange(event.target.value)}
        aria-label="Select active entity"
      >
        <option value="all">All Entities</option>
        {entityOptions.map((entity) => (
          <option key={`tabbar-entity-${entity.id}`} value={String(entity.id)}>
            {entity.name} ({entity.type})
          </option>
        ))}
      </select>
    </label>
  ) : null;

  if (compact) {
    return (
      <>
        <div className={`mobile-nav${hasEntitySwitcher ? " with-switcher" : ""}`}>
          <div className="mobile-nav-main">
            <Button
              type="button"
              variant="subtle"
              size="md"
              className="hamburger-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </Button>
            <div className="mobile-nav-title">{activeTab?.label ?? "Menu"}</div>
          </div>
          {hasEntitySwitcher && (
            <div className="mobile-nav-switcher">{entitySwitcher}</div>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu-overlay">
            <div className="mobile-menu-header">
              <div className="mobile-menu-title">Menu</div>
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="mobile-menu-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                ×
              </Button>
            </div>

            <div className="mobile-menu-list">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant={activeView === tab.id ? "dark" : "subtle"}
                  size="lg"
                  onClick={() => {
                    onChange(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`mobile-menu-item${
                    activeView === tab.id ? " active" : ""
                  }`}
                >
                  <span className="mobile-menu-item-label">{tab.label}</span>
                  {Number(tab.badge ?? 0) > 0 ? (
                    <span
                      className={`mobile-menu-item-badge${
                        activeView === tab.id ? " active" : ""
                      }`}
                      aria-label={`${tab.badge} items due today`}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </Button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="tabbar-row">
      <Tabs
        tabs={tabs}
        activeId={activeView}
        onChange={onChange}
        className="tabs-inline"
      />
      {hasEntitySwitcher && <div className="tabbar-right">{entitySwitcher}</div>}
    </div>
  );
}
