import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import EntitySwitcher from "./EntitySwitcher";
import { useFinanceData } from "@/contexts/FinanceDataContext";

const navLinks = [
  { path: "/", label: "Dashboard", icon: "ri-dashboard-3-line" },
  { path: "/transactions", label: "Transactions", icon: "ri-exchange-dollar-line" },
  { path: "/recurring", label: "Recurring", icon: "ri-repeat-line" },
  { path: "/reporting", label: "Reporting", icon: "ri-file-chart-line" },
  { path: "/forecast", label: "Forecast", icon: "ri-line-chart-line" },
  { path: "/settings", label: "Settings", icon: "ri-sliders-line" },
];

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hiddenByTransactionsFilter, setHiddenByTransactionsFilter] = useState(false);
  const { pendingRecurringItems, selectedEntityId, entities } = useFinanceData();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleTransactionsFilterDockedChange(event: Event) {
      const customEvent = event as CustomEvent<{ docked?: boolean }>;
      setHiddenByTransactionsFilter(
        location.pathname === "/transactions" && Boolean(customEvent.detail?.docked)
      );
    }

    window.addEventListener(
      "transactions-filter-docked-change",
      handleTransactionsFilterDockedChange as EventListener
    );

    if (location.pathname !== "/transactions") {
      setHiddenByTransactionsFilter(false);
    }

    return () => {
      window.removeEventListener(
        "transactions-filter-docked-change",
        handleTransactionsFilterDockedChange as EventListener
      );
    };
  }, [location.pathname]);

  const activeEntity =
    entities.find((entity) => entity.id === selectedEntityId)?.name || "All entities";
  const notificationCount = pendingRecurringItems.length;
  const notificationsActive = location.pathname === "/notifications";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        hiddenByTransactionsFilter ? "-translate-y-full pointer-events-none" : "translate-y-0"
      } ${
        scrolled
          ? "bg-white shadow-nav border-b border-bg-subtle"
          : "bg-transparent"
      }`}
    >
      <div className="px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
              <i className="ri-bank-card-line text-white text-base" />
            </div>
            <div>
              <span className="block font-semibold text-lg tracking-tight text-text">Financr</span>
              <span className="hidden text-2xs text-text-secondary md:block">{activeEntity}</span>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-accent-light text-accent-dark"
                    : "text-text-secondary hover:text-text hover:bg-bg-subtle"
                }`}
              >
                <i className={`${link.icon} text-sm`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/notifications"
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              notificationsActive
                ? "bg-accent-light text-accent-dark"
                : "text-text-secondary hover:bg-bg-subtle hover:text-text"
            }`}
            aria-label={`Notifications${notificationCount ? ` (${notificationCount})` : ""}`}
          >
            <i className="ri-notification-3-line text-lg" />
            {notificationCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-negative px-1 text-[10px] font-semibold leading-4 text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            ) : null}
          </Link>
          <EntitySwitcher />
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <i className="ri-menu-3-line text-text-secondary text-lg" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-bg-subtle px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent-light text-accent-dark"
                    : "text-text-secondary"
                }`}
              >
                <i className={`${link.icon} text-base`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
