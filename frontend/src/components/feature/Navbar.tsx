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
  const { selectedEntityId, entities } = useFinanceData();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeEntity =
    entities.find((entity) => entity.id === selectedEntityId)?.name || "All entities";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
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
          <EntitySwitcher />
          <div className="hidden md:flex w-8 h-8 rounded-full bg-accent-light items-center justify-center">
            <span className="text-xs font-semibold text-accent-dark">JD</span>
          </div>
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
