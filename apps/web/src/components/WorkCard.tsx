import {
  ArrowUpRight,
  Folder,
  FileText,
  Table2,
  CheckSquare2,
  Flag,
  Clock3,
} from "lucide-react";
import { Activity, ago } from "./Activity";
import type { WorkItem } from "../../../../shared/types";
export const tone = (item: WorkItem) =>
  item.status === "CLOSED"
    ? "closed"
    : item.category === "Fading"
      ? "fading"
      : item.activityState === "ACTIVE" && !item.reopened
        ? "active"
        : "attention";
export const statusLabel = (item: WorkItem) =>
  item.status === "CLOSED"
    ? "Closed"
    : item.status === "IGNORED"
      ? "Off the Radar"
      : item.status === "SNOOZED"
        ? "Snoozed"
        : item.reopened
          ? "Changed after closing"
          : item.category === "Fading"
            ? "Fading"
            : item.activityState === "ACTIVE"
              ? "Active"
              : "Quiet";
export function WorkCard({
  item,
  location,
  onOpen,
}: {
  item: WorkItem;
  location: string;
  onOpen: (id: string) => void;
}) {
  const Icon =
    item.extension === ".csv" || item.extension === ".xlsx"
      ? Table2
      : item.kind === "folder"
        ? Folder
        : FileText;
  const evidence = item.signals
    .filter((s) => !["activity", "momentum"].includes(s.type))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);
  return (
    <article className={`work-card ${tone(item)}`}>
      <div className="card-top">
        <span
          className={`file-icon ${Icon === Table2 ? "green" : Icon === FileText ? "pink" : ""}`}
        >
          <Icon size={23} />
        </span>
        <span className={`status ${tone(item)}`}>
          <span /> {statusLabel(item)}
        </span>
        <span
          className="score"
          title="Unclosed Score · inspect the breakdown in details"
        >
          {item.score}
        </span>
      </div>
      <h3>
        <button onClick={() => onOpen(item.id)}>{item.displayName}</button>
      </h3>
      <p className="card-path">
        {location} <span>/</span>{" "}
        {item.kind === "folder"
          ? `${item.fileCount} file${item.fileCount === 1 ? "" : "s"}`
          : item.extension.replace(".", "").toUpperCase() + " file"}
      </p>
      <Activity item={item} />
      <div className="last-activity">
        <Clock3 size={13} />
        {item.lastActivityAt
          ? `Activity detected ${ago(item.lastActivityAt)}`
          : `Last file modification ${ago(item.latestModifiedAt)}`}
      </div>
      <ul className="card-signals">
        {evidence.map((signal) => (
          <li key={signal.type}>
            {signal.type === "checklist" ? (
              <CheckSquare2 size={15} />
            ) : signal.type.startsWith("sheet") ? (
              <Table2 size={15} />
            ) : (
              <Flag size={15} />
            )}
            <span>{signal.title}</span>
          </li>
        ))}
      </ul>
      {!item.available && (
        <p className="unavailable">Not found in the latest sweep</p>
      )}
      <div className="card-footer">
        <span>
          {item.history.length === 1
            ? "First-scan evidence"
            : `${item.history.length} scans observed`}
        </span>
        <button onClick={() => onOpen(item.id)}>
          Take a look <ArrowUpRight size={16} />
        </button>
      </div>
    </article>
  );
}
