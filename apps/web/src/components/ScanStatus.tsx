import { RotateCw, Radar, Check } from "lucide-react";
import { ago } from "./Activity";
import type { Root, WorkItem, ScanProgress } from "../../../../shared/types";
import type { Page, Mutation } from "../types";
export function ScanStatus({
  scan,
  roots,
  mutate,
}: {
  scan: ScanProgress | null;
  roots: Root[];
  mutate: Mutation;
}) {
  const running = scan?.status === "running";
  return (
    <>
      <div
        className={`scan-strip ${running ? "is-scanning" : ""}`}
        role="status"
      >
        <span className="scan-strip-icon">
          {running ? (
            <RotateCw className="spinning" size={17} />
          ) : scan?.status === "complete" ? (
            <Check size={17} />
          ) : (
            <Radar size={17} />
          )}
        </span>
        <div>
          <strong>
            {running
              ? "Sweeping your folders…"
              : scan?.status === "complete"
                ? "Sweep complete"
                : scan?.status === "failed"
                  ? "Sweep interrupted"
                  : scan?.status === "cancelled"
                    ? "Sweep cancelled"
                    : "Ready when you are"}
          </strong>
          <span>
            {running
              ? `Checking: ${scan.currentItem || "Discovering work items"}`
              : scan?.completedAt
                ? `${scan.itemsScanned} work items checked · ${scan.newItems} newly surfaced · ${scan.changedStates} changed state`
                : `${roots.length} watched location${roots.length === 1 ? "" : "s"} · Start a sweep to find your loose ends`}
          </span>
        </div>
        <div className="scan-strip-right">
          {running ? (
            <>
              <span>
                {scan.itemsScanned} / {scan.itemsDiscovered}
              </span>
              <button
                className="text-button"
                onClick={() => void mutate("/scans/cancel")}
              >
                Cancel
              </button>
            </>
          ) : (
            <span>
              {scan?.completedAt
                ? `Last scan ${ago(scan.completedAt)}`
                : "On-demand scanning"}
            </span>
          )}
        </div>
        {running && (
          <div className="progress-track">
            <div
              style={{
                width: `${scan.itemsDiscovered ? (scan.itemsScanned / scan.itemsDiscovered) * 100 : 0}%`,
              }}
            />
          </div>
        )}
      </div>
      {scan?.error && <div className="notice">{scan.error}</div>}
      {!!scan?.warnings.length && (
        <details className="warnings">
          <summary>
            {scan.warnings.length} scan warning
            {scan.warnings.length === 1 ? "" : "s"}
          </summary>
          <ul>
            {scan.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
