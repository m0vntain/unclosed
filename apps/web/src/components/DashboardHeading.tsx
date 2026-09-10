import { RotateCw, Check } from "lucide-react";
import type { Root, WorkItem } from "../../../../shared/types";
import type { Page, Mutation } from "../types";

export function DashboardHeading({
  page,
  radar,
  fading,
  active,
  closed,
  roots,
  running,
  busy,
  mutate,
  setFilter,
  navigate,
}: {
  page: Page;
  radar: WorkItem[];
  fading: WorkItem[];
  active: WorkItem[];
  closed: WorkItem[];
  roots: Root[];
  running: boolean;
  busy: boolean;
  mutate: Mutation;
  setFilter: (filter: string) => void;
  navigate: (page: Page) => void;
}) {
  return (
    <div className="dashboard-header-container">
      <div className="dashboard-title-row">
        <div>
          <h1 className="page-main-title">
            {page === "radar"
              ? "Radar"
              : page === "closed"
                ? "Closed Items"
                : "Off the Radar"}
          </h1>
          <p className="page-main-desc">
            {page === "radar"
              ? "Tracked loose ends and projects across your mounted folders."
              : page === "closed"
                ? "Work marked closed. History and evidence remain stored."
                : "Excluded items intentionally hidden from your active radar."}
          </p>
        </div>

        <button
          className="scan-btn primary"
          disabled={busy || !!running || !roots.length}
          onClick={() => void mutate("/scans")}
        >
          <RotateCw size={15} className={running ? "spinning" : ""} />
          {running ? "Scanning…" : "Scan now"}
        </button>
      </div>

      {page === "radar" && (
        <div className="metric-pills-bar">
          <button
            type="button"
            className="metric-pill"
            onClick={() => setFilter("All loose ends")}
          >
            <span className="metric-pill-label">All loose ends</span>
            <span className="metric-pill-value">{radar.length}</span>
          </button>
          <button
            type="button"
            className="metric-pill fading"
            onClick={() => setFilter("Fading")}
          >
            <span className="metric-pill-dot amber" />
            <span className="metric-pill-label">Fading</span>
            <span className="metric-pill-value">{fading.length}</span>
          </button>
          <button
            type="button"
            className="metric-pill active"
            onClick={() => setFilter("Still Active")}
          >
            <span className="metric-pill-dot cyan" />
            <span className="metric-pill-label">Still Active</span>
            <span className="metric-pill-value">{active.length}</span>
          </button>
          <button
            type="button"
            className="metric-pill closed"
            onClick={() => navigate("closed")}
          >
            <span className="metric-pill-dot slate" />
            <span className="metric-pill-label">Closed</span>
            <span className="metric-pill-value">{closed.length}</span>
          </button>
        </div>
      )}
    </div>
  );
}
