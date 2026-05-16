import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "@/components/base/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useFinanceData } from "@/contexts/FinanceDataContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ALL_ENTITIES_ID } from "@/lib/finance";

export default function HouseholdSwitcher() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { entities, selectedEntityId, setSelectedEntityId } = useFinanceData();
  const { activeWorkspaceId, switchWorkspace, workspaces } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [entitiesOpen, setEntitiesOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEntitiesOpen(false);
    }
  }, [open]);

  if (workspaces.length === 0) {
    return null;
  }

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];
  const entityOptions = [
    { id: ALL_ENTITIES_ID, name: "All entities", type: "combined view" },
    ...entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
    })),
  ];

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative hidden md:flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 rounded-xl border border-bg-subtle bg-white px-4 py-2.5 text-left shadow-card transition hover:border-accent/30 hover:bg-bg-subtle"
      >
        <p className="max-w-[13rem] truncate text-sm font-semibold text-text">
          {activeWorkspace?.name || "Workspace"}
        </p>
        <i
          className={`ri-arrow-down-s-line text-text-secondary transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <Card className="absolute right-0 top-full z-50 mt-2 w-[20rem] p-2 shadow-card-hover">
          <div className="px-2 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Space
            </p>
            <p className="mt-1 text-sm font-semibold text-text">
              {activeWorkspace?.name || "Workspace"}
            </p>
          </div>

          <div className="my-2 border-t border-bg-subtle" />

          <div className="px-2 py-1">
            <p className="text-2xs font-medium uppercase tracking-wide text-text-muted">
              Switch Space
            </p>
          </div>
          <div className="space-y-0.5">
            {workspaces.map((workspace) => {
              const active = workspace.id === activeWorkspaceId;
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    switchWorkspace(workspace.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-accent-light text-accent-dark"
                      : "text-text hover:bg-bg-subtle"
                  }`}
                >
                  <span className="truncate font-medium">{workspace.name}</span>
                  {active ? <i className="ri-check-line text-sm" /> : null}
                </button>
              );
            })}
          </div>

          <div className="my-2 border-t border-bg-subtle" />

          <button
            type="button"
            onClick={() => setEntitiesOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-bg-subtle"
          >
            <div>
              <p className="text-2xs font-medium uppercase tracking-wide text-text-muted">
                Switch Entity
              </p>
              <p className="mt-1 truncate text-sm font-medium text-text">
                {entityOptions.find((entity) => entity.id === selectedEntityId)?.name ||
                  "All entities"}
              </p>
            </div>
            <i
              className={`ri-arrow-down-s-line text-base text-text-secondary transition-transform ${
                entitiesOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {entitiesOpen ? (
            <div className="mt-1 space-y-0.5">
              {entityOptions.map((entity) => {
                const active = entity.id === selectedEntityId;
                return (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => {
                      setSelectedEntityId(entity.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                      active
                        ? "bg-accent-light text-accent-dark"
                        : "text-text hover:bg-bg-subtle"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{entity.name}</p>
                      <p className="truncate text-2xs capitalize text-text-secondary">
                        {entity.type}
                      </p>
                    </div>
                    {active ? <i className="ri-check-line text-sm" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="my-2 border-t border-bg-subtle" />

          <div className="space-y-0.5">
            <Link
              to="/household"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-bg-subtle"
            >
              <i className="ri-home-heart-line text-base text-text-secondary" />
              <span>Space Settings</span>
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-bg-subtle"
            >
              <i className="ri-sliders-line text-base text-text-secondary" />
              <span>Settings</span>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-bg-subtle"
            >
              <i className="ri-logout-box-r-line text-base text-text-secondary" />
              <span>Log out</span>
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
