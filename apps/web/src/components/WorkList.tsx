import {
  Folder,
  FileText,
  Table2,
  CheckSquare2,
  Flag,
  Clock3,
  ArrowUpRight,
} from "lucide-react";
import type { WorkItem } from "../../../../shared/types";
import { ago } from "./Activity";
import { statusLabel, tone } from "./WorkCard";

export function WorkList({
  items,
  roots,
  onOpen,
}: {
  items: WorkItem[];
  roots: { id: string; label: string }[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="work-list-container" role="table" aria-label="Work items">
      <div className="work-list-header" role="row">
        <span className="col-status" role="columnheader">Status</span>
        <span className="col-name" role="columnheader">Item</span>
        <span className="col-signal" role="columnheader">Key Signal</span>
        <span className="col-location" role="columnheader">Location</span>
        <span className="col-time" role="columnheader">Activity</span>
        <span className="col-score" role="columnheader">Score</span>
        <span className="col-action" role="columnheader"><span className="sr-only">Actions</span></span>
      </div>
      <div className="work-list-body" role="rowgroup">
        {items.map((item) => {
          const Icon =
            item.extension === ".csv" || item.extension === ".xlsx"
              ? Table2
              : item.kind === "folder"
                ? Folder
                : FileText;

          const locationLabel =
            roots.find((r) => r.id === item.scanRoot)?.label ?? "Workspace";

          const primarySignal = item.signals
            .filter((s) => !["activity", "momentum"].includes(s.type))
            .sort((a, b) => b.weight - a.weight)[0];

          return (
            <div
              key={item.id}
              className={`work-list-row ${tone(item)}`}
              role="row"
              tabIndex={0}
              onClick={() => onOpen(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(item.id);
                }
              }}
            >
              <div className="col-status" role="cell">
                <span className={`status-pill ${tone(item)}`}>
                  <span className="status-dot" />
                  {statusLabel(item)}
                </span>
              </div>

              <div className="col-name" role="cell">
                <span className="item-icon">
                  <Icon size={16} />
                </span>
                <div className="item-details">
                  <strong className="item-title">{item.displayName}</strong>
                  <span className="item-path">{item.relativePath}</span>
                </div>
              </div>

              <div className="col-signal" role="cell">
                {primarySignal ? (
                  <span className="signal-chip" title={primarySignal.explanation}>
                    {primarySignal.type === "checklist" ? (
                      <CheckSquare2 size={13} />
                    ) : primarySignal.type.startsWith("sheet") ? (
                      <Table2 size={13} />
                    ) : (
                      <Flag size={13} />
                    )}
                    <span>{primarySignal.title}</span>
                  </span>
                ) : (
                  <span className="signal-chip subtle">No loose ends</span>
                )}
              </div>

              <div className="col-location" role="cell">
                <span className="location-pill">{locationLabel}</span>
              </div>

              <div className="col-time" role="cell">
                <Clock3 size={13} />
                <span>
                  {item.lastActivityAt
                    ? ago(item.lastActivityAt)
                    : ago(item.latestModifiedAt)}
                </span>
              </div>

              <div className="col-score" role="cell">
                <span className="score-badge" title="Unclosed Score">
                  {item.score}
                </span>
              </div>

              <div className="col-action" role="cell">
                <span className="row-arrow">
                  <ArrowUpRight size={15} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
