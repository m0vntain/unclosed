import {
  Folder,
  FileText,
  Table2,
  CheckSquare2,
  Flag,
  Clock3,
  ArrowUpRight,
} from "lucide-react";
import { ago } from "./Activity";
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

  const primarySignals = item.signals
    .filter((s) => !["activity", "momentum"].includes(s.type))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2);

  return (
    <article
      className={`work-card ${tone(item)}`}
      onClick={() => onOpen(item.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item.id);
        }
      }}
    >
      <div className="card-top">
        <span className="card-type-icon">
          <Icon size={18} />
        </span>
        <span className={`status-pill ${tone(item)}`}>
          <span className="status-dot" />
          {statusLabel(item)}
        </span>
        <span
          className="score-badge"
          title="Unclosed Score · inspect breakdown in details"
        >
          {item.score}
        </span>
      </div>

      <div className="card-main">
        <h3 className="card-title">
          <span>{item.displayName}</span>
        </h3>
        <p className="card-path">
          <span>{location}</span>
          <span className="separator">/</span>
          <span>{item.relativePath}</span>
        </p>
      </div>

      {primarySignals.length > 0 && (
        <div className="card-signals-compact">
          {primarySignals.map((signal) => (
            <span className="signal-chip" key={signal.type} title={signal.explanation}>
              {signal.type === "checklist" ? (
                <CheckSquare2 size={13} />
              ) : signal.type.startsWith("sheet") ? (
                <Table2 size={13} />
              ) : (
                <Flag size={13} />
              )}
              <span>{signal.title}</span>
            </span>
          ))}
        </div>
      )}

      <div className="card-footer-compact">
        <span className="card-time">
          <Clock3 size={13} />
          {item.lastActivityAt
            ? ago(item.lastActivityAt)
            : ago(item.latestModifiedAt)}
        </span>
        <span className="card-open-hint">
          Open <ArrowUpRight size={14} />
        </span>
      </div>
    </article>
  );
}
