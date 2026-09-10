import {
  Radar,
  CheckCheck,
  EyeOff,
  Settings2,
  LockKeyhole,
  Folder,
} from "lucide-react";
import type { Root } from "../../../../shared/types";
import type { Page } from "../types";

export function Sidebar({
  mobileNav,
  page,
  radarCount,
  closedCount,
  roots,
  navigate,
  onLocation,
}: {
  mobileNav: boolean;
  page: Page;
  radarCount: number;
  closedCount: number;
  roots: Root[];
  navigate: (page: Page) => void;
  onLocation: (id: string) => void;
}) {
  return (
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="sidebar-brand">
        <button
          className="brand-button"
          onClick={() => navigate("radar")}
          aria-label="Unclosed home"
        >
          <span className="brand-dot" />
          <span className="brand-text">Unclosed</span>
        </button>
      </div>

      <div className="sidebar-section-title">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {(
          [
            { id: "radar", name: "Radar", icon: Radar, count: radarCount },
            {
              id: "closed",
              name: "Closed",
              icon: CheckCheck,
              count: closedCount,
            },
            { id: "ignored", name: "Off the Radar", icon: EyeOff },
            { id: "settings", name: "Settings", icon: Settings2 },
          ] as const
        ).map((entry) => (
          <button
            key={entry.id}
            className={`nav-item ${page === entry.id ? "selected" : ""}`}
            aria-current={page === entry.id ? "page" : undefined}
            onClick={() => navigate(entry.id)}
          >
            <entry.icon size={16} />
            <span className="nav-label">{entry.name}</span>
            {"count" in entry && entry.count !== undefined && (
              <span className="nav-count">{entry.count}</span>
            )}
          </button>
        ))}
      </nav>

      {roots.length > 0 && (
        <div className="sidebar-locations">
          <div className="sidebar-section-title">
            <span>LOCATIONS</span>
            <span className="locations-count">{roots.length}</span>
          </div>
          <div className="locations-list">
            {roots.map((root) => (
              <button
                key={root.id}
                className="location-item"
                title={root.path}
                onClick={() => onLocation(root.id)}
              >
                <Folder size={14} className="location-icon" />
                <span className="location-name">{root.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-local-status">
          <LockKeyhole size={13} className="lock-icon" />
          <span>Local · Read-only</span>
        </div>
      </div>
    </aside>
  );
}
