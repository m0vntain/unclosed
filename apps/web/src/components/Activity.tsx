import type { WorkItem } from "../../../../shared/types";
export const ago = (date: string | null) => {
  if (!date) return "Not yet observed";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(date)) / 60000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
};
export function Activity({
  item,
  large = false,
}: {
  item: WorkItem;
  large?: boolean;
}) {
  const history = item.history.slice(-30);
  const max = Math.max(
    1,
    ...history.map((p) => p.changed + p.added + p.removed),
  );
  return (
    <div className={`activity ${large ? "activity-large" : ""}`}>
      <div
        className="activity-bars"
        role="img"
        aria-label={`${history.length} observed scans; ${history.filter((p) => !p.baseline && p.changed + p.added + p.removed > 0).length} with detected changes`}
      >
        {history.map((p, index) => (
          <div
            key={`${p.scanId}-${index}`}
            className={`activity-bar ${p.baseline ? "baseline" : ""}`}
            style={{
              height: `${p.baseline ? 16 : 10 + ((p.changed + p.added + p.removed) / max) * 90}%`,
            }}
            title={`${new Date(p.at).toLocaleString()}: ${p.baseline ? "First-scan baseline; no observed changes yet" : `${p.changed} modified, ${p.added} added, ${p.removed} removed`}`}
          />
        ))}
        {history.length < 2 && (
          <span className="baseline-label">Building your activity history</span>
        )}
      </div>
      {large && (
        <div className="chart-labels">
          <span>
            {history[0]
              ? new Date(history[0].at).toLocaleDateString()
              : "No scans"}
          </span>
          <span>
            Last {history.length} observed scan{history.length === 1 ? "" : "s"}
          </span>
          <span>
            {history.at(-1)
              ? new Date(history.at(-1)!.at).toLocaleDateString()
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}
