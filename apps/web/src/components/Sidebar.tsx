import {
  Radar,
  CheckCheck,
  EyeOff,
  Settings2,
  LockKeyhole,
  ArrowUpRight,
  Folder,
  CircleHelp,
} from "lucide-react";
import type { Root, WorkItem, ScanProgress } from "../../../../shared/types";
import type { Page, Mutation } from "../types";
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
    <>
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("radar")}
          aria-label="Unclosed home"
        >
          <span className="brand-mark" />
          Unclosed<span className="brand-period">.</span>
        </button>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
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
              className={page === entry.id ? "selected" : ""}
              aria-current={page === entry.id ? "page" : undefined}
              onClick={() => navigate(entry.id)}
            >
              <entry.icon size={19} />
              <span>{entry.name}</span>
              {"count" in entry && (
                <span className="nav-count">{entry.count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-locations">
          <div className="workspace-label">
            WATCHED LOCATIONS <span>{roots.length}</span>
          </div>
          {roots.map((root) => (
            <button
              key={root.id}
              onClick={() => {
                onLocation(root.id);
              }}
            >
              <Folder size={16} />
              <span>{root.label}</span>
              <LockKeyhole size={12} />
            </button>
          ))}
          <button
            className="manage-locations"
            onClick={() => navigate("settings")}
          >
            Manage locations <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-icon">
              <LockKeyhole size={17} />
            </span>
            <strong>Just you and your files.</strong>
            <p>
              Local only. Read only.
              <br />
              Always in your control.
            </p>
            <span className="local-indicator">
              <i /> No cloud connection
            </span>
          </div>
          <button className="about-link" onClick={() => navigate("settings")}>
            <CircleHelp size={15} /> How Unclosed works{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="version">
            UNCLOSED <span>v1.0 · Local workspace</span>
          </div>
        </div>
      </aside>
    </>
  );
}
