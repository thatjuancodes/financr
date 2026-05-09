import React, { useRef, useState } from "react";
import Card from "@/components/base/Card";
import { Link } from "react-router-dom";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { ALL_ENTITIES_ID } from "@/lib/finance";

export default function EntitySwitcher() {
  const [open, setOpen] = useState(false);
  const { entities, selectedEntityId, setSelectedEntityId } = useFinanceData();
  const ref = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const options = [
    { id: ALL_ENTITIES_ID, name: "All entities", type: "overview" },
    ...entities,
  ];
  const active = options.find((entity) => entity.id === selectedEntityId) || options[0];

  function buildAvatar(name: string) {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg hover:bg-bg-subtle transition-colors px-2 py-1.5"
      >
        <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center">
          <span className="text-xs font-semibold text-accent-dark">{buildAvatar(active.name)}</span>
        </div>
        <span className="hidden md:inline text-sm font-medium text-text">{active.name}</span>
        <i className={`ri-arrow-down-s-line text-text-secondary text-sm transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <Card className="absolute right-0 top-full mt-2 w-64 p-2 shadow-card-hover z-50">
          <p className="text-2xs uppercase tracking-wide text-text-muted font-medium px-2 py-1.5">
            Switch Entity
          </p>
          <div className="space-y-0.5">
            {entities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => {
                  setSelectedEntityId(entity.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                  selectedEntityId === entity.id
                    ? "bg-accent-light text-accent-dark"
                    : "hover:bg-bg-subtle text-text"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedEntityId === entity.id
                      ? "bg-accent text-white"
                      : "bg-accent-light text-accent-dark"
                  }`}
                >
                  <span className="text-xs font-semibold">{buildAvatar(entity.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entity.name}</p>
                  <p className="text-2xs text-text-secondary capitalize">{entity.type}</p>
                </div>
                {selectedEntityId === entity.id && (
                  <i className="ri-check-line text-accent text-sm flex-shrink-0" />
                )}
              </button>
            ))}
            <button
              onClick={() => {
                setSelectedEntityId(ALL_ENTITIES_ID);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                selectedEntityId === ALL_ENTITIES_ID
                  ? "bg-accent-light text-accent-dark"
                  : "hover:bg-bg-subtle text-text"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedEntityId === ALL_ENTITIES_ID
                    ? "bg-accent text-white"
                    : "bg-accent-light text-accent-dark"
                }`}
              >
                <i className="ri-stack-line text-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">All entities</p>
                <p className="text-2xs text-text-secondary capitalize">Combined view</p>
              </div>
              {selectedEntityId === ALL_ENTITIES_ID ? (
                <i className="ri-check-line text-accent text-sm flex-shrink-0" />
              ) : null}
            </button>
          </div>

          <div className="border-t border-bg-subtle my-2" />

          <Link
            to="/settings?tab=accounts"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-bg-subtle transition-colors text-text"
          >
            <div className="w-7 h-7 rounded-full bg-bg-subtle flex items-center justify-center flex-shrink-0">
              <i className="ri-settings-4-line text-text-secondary text-xs" />
            </div>
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </Card>
      )}
    </div>
  );
}
