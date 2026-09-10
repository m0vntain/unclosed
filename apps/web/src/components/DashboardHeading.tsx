import {
  RotateCw,
  Radar,
  ArrowUpRight,
  Clock3,
  ScanLine,
  CheckCheck,
} from "lucide-react";
import type { Root, WorkItem, ScanProgress } from "../../../../shared/types";
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
    <>
      <div className="dashboard-heading">
        <div className="page-heading">
          <div className="eyebrow">
            {page === "radar"
              ? "A LITTLE CLARITY FOR YOUR NEXT STEP"
              : "YOUR WORK, YOUR CALL"}
          </div>
          <h1>
            {page === "radar"
              ? "Find the work you left open."
              : page === "closed"
                ? "A little closure."
                : "Off the Radar"}
          </h1>
          <p>
            {page === "radar"
              ? "The loose ends, quiet projects, and small things worth another look."
              : page === "closed"
                ? "Work you’ve marked closed. Its history stays right here."
                : "Intentionally set aside. Bring anything back when you’re ready."}
          </p>
        </div>
        <button
          className="primary scan-button"
          disabled={busy || !!running || !roots.length}
          onClick={() => void mutate("/scans")}
        >
          <RotateCw size={17} className={running ? "spinning" : ""} />
          {running ? "Sweeping…" : "Scan now"}
        </button>
      </div>
      {page === "radar" && (
        <div className="summary-grid">
          <button
            className="summary-card total"
            onClick={() => setFilter("All loose ends")}
          >
            <span className="summary-icon">
              <Radar size={21} />
            </span>
            <div>
              <span>On your radar</span>
              <strong>
                {radar.length.toString().padStart(2, "0")}
                <small>loose ends</small>
              </strong>
            </div>
            <ArrowUpRight size={17} />
          </button>
          <button className="summary-card" onClick={() => setFilter("Fading")}>
            <span className="summary-icon amber">
              <Clock3 size={21} />
            </span>
            <div>
              <span>Fading</span>
              <strong>
                {fading.length.toString().padStart(2, "0")}
                <small>worth revisiting</small>
              </strong>
            </div>
          </button>
          <button
            className="summary-card"
            onClick={() => setFilter("Still Active")}
          >
            <span className="summary-icon sage">
              <ScanLine size={21} />
            </span>
            <div>
              <span>Still active</span>
              <strong>
                {active.length.toString().padStart(2, "0")}
                <small>in motion</small>
              </strong>
            </div>
          </button>
          <button className="summary-card" onClick={() => navigate("closed")}>
            <span className="summary-icon slate">
              <CheckCheck size={21} />
            </span>
            <div>
              <span>Recently closed</span>
              <strong>
                {closed.length.toString().padStart(2, "0")}
                <small>set to rest</small>
              </strong>
            </div>
          </button>
        </div>
      )}
    </>
  );
}
