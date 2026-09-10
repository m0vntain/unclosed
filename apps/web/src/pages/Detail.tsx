import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  EyeOff,
  RotateCcw,
  Folder,
  FileText,
  ChevronDown,
  Info,
} from "lucide-react";
import type { WorkItem } from "../../../../shared/types";
import { api } from "../api/client";
import { Activity, ago } from "../components/Activity";
import { statusLabel, tone } from "../components/WorkCard";
import { SnoozeDialog } from "../components/SnoozeDialog";

type DetailItem = WorkItem & {
  dispositionHistory?: {
    status: string;
    at: string;
    snoozedUntil: string | null;
  }[];
};

export function Detail({
  id,
  version,
  onBack,
  mutate,
  busy,
}: {
  id: string;
  version: string;
  onBack: () => void;
  mutate: (path: string, body?: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const [item, setItem] = useState<DetailItem | null>(null);
  const [error, setError] = useState("");
  const [snooze, setSnooze] = useState(false);

  useEffect(() => {
    let live = true;
    api<DetailItem>(`/work-items/${id}`)
      .then((data) => {
        if (live) setItem(data);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, version]);

  const action = async (name: string, body?: unknown) => {
    const ok = await mutate(`/work-items/${id}/${name}`, body);
    if (ok) setItem(await api<DetailItem>(`/work-items/${id}`));
    return ok;
  };

  if (error)
    return (
      <div className="empty-state">
        <h2>Unable to load item.</h2>
        <p>{error}</p>
        <button className="primary" onClick={onBack}>Back to Radar</button>
      </div>
    );

  if (!item) return <div className="empty-state">Loading item details…</div>;

  return (
    <>
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={15} /> Back to Radar
      </button>

      <div className="detail-header">
        <div>
          <div className="detail-type-tag">
            {item.kind === "folder" ? (
              <Folder size={14} />
            ) : (
              <FileText size={14} />
            )}{" "}
            <span>{item.kind.toUpperCase()} · {item.fileCount} tracked file{item.fileCount === 1 ? "" : "s"}</span>
          </div>
          <h1 className="detail-title">{item.displayName}</h1>
          <div className="detail-meta">
            <span className={`status-pill ${tone(item)}`}>
              <span className="status-dot" />
              {statusLabel(item)}
            </span>
            <span className="detail-path">{item.relativePath}</span>
          </div>
        </div>

        <div className="detail-score-box">
          <span className="score-value">{item.score}</span>
          <span className="score-label">Score</span>
        </div>
      </div>

      <div className="detail-actions">
        {item.status === "OPEN" ? (
          <>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void action("close")}
            >
              <Check size={16} /> Mark closed
            </button>
            <button disabled={busy} onClick={() => setSnooze(true)}>
              <Clock3 size={16} /> Snooze
            </button>
            <button
              disabled={busy}
              onClick={() => void action("take-off-radar")}
            >
              <EyeOff size={16} /> Take off radar
            </button>
          </>
        ) : (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void action("restore")}
          >
            <RotateCcw size={16} />
            {item.status === "CLOSED" ? "Reopen item" : "Restore to radar"}
          </button>
        )}
        {item.status === "SNOOZED" && (
          <span className="snoozed-notice">
            Snoozed until {new Date(item.snoozedUntil!).toLocaleDateString()}
          </span>
        )}
      </div>

      {!item.available && (
        <div className="warning-banner">
          <Info size={16} />
          <span>This item was not found in the latest scan. Existing history and evidence are preserved.</span>
        </div>
      )}

      <section className="panel detail-activity">
        <div className="section-heading">
          <h2>Activity Timeline</h2>
          <span>
            {item.history.length} scan{item.history.length === 1 ? "" : "s"} observed
          </span>
        </div>
        <Activity item={item} large />
        <p className="activity-caption">
          {item.lastActivityAt
            ? `Last activity detected ${ago(item.lastActivityAt)}.`
            : `Last file modification ${ago(item.latestModifiedAt)}.`}
        </p>

        <details className="history-details">
          <summary>
            <span>Scan history log</span>
            <ChevronDown size={14} />
          </summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Scan Timestamp</th>
                  <th>Modified</th>
                  <th>Added</th>
                  <th>Removed</th>
                </tr>
              </thead>
              <tbody>
                {item.history.slice(-30).map((p) => (
                  <tr key={p.scanId}>
                    <td>
                      {new Date(p.at).toLocaleString()}
                      {p.baseline ? " (baseline)" : ""}
                    </td>
                    <td>{p.baseline ? "—" : p.changed}</td>
                    <td>{p.baseline ? "—" : p.added}</td>
                    <td>{p.baseline ? "—" : p.removed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <div className="detail-columns">
        <section className="evidence-column">
          <div className="section-heading">
            <h2>Detected Signals</h2>
            <span>{item.signals.length} signal{item.signals.length === 1 ? "" : "s"}</span>
          </div>

          {item.signals.length === 0 && (
            <div className="panel empty-signals">
              No loose ends or pending markers detected in this snapshot.
            </div>
          )}

          {item.signals.map((signal) => (
            <article className="panel evidence" key={signal.type}>
              <div className="evidence-header">
                <h3>{signal.title}</h3>
                <span className="evidence-badge">
                  {signal.detectorId.replaceAll("-", " ")}
                </span>
              </div>
              <p className="evidence-desc">{signal.explanation}</p>
              {signal.examples.length > 0 && (
                <ul className="evidence-list">
                  {signal.examples.map((example, index) => (
                    <li key={index}>
                      <div className="evidence-path">
                        <code>{example.relativePath}</code>
                        {example.lineNumber ? <span className="line-num">:{example.lineNumber}</span> : ""}
                        {example.sheet ? (
                          <span className="sheet-ref"> · {example.sheet}!{example.cell}</span>
                        ) : ""}
                      </div>
                      {example.excerpt && (
                        <pre className="evidence-code">{example.excerpt}</pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {signal.count > signal.examples.length &&
                signal.examples.length > 0 && (
                  <small className="evidence-limit">
                    Showing {signal.examples.length} of {signal.count} matches.
                  </small>
                )}
            </article>
          ))}
        </section>

        <aside className="sidebar-column">
          <section className="panel score-panel">
            <h3>Score Breakdown</h3>
            <p className="panel-sub">Calculated signal weights (max 100).</p>
            <div className="score-breakdown-list">
              {item.signals.map((s) => (
                <div className="score-row" key={s.type}>
                  <span className="score-signal-title">{s.title}</span>
                  <span className="score-signal-weight">+{s.weight}</span>
                </div>
              ))}
            </div>
            <div className="score-total-row">
              <strong>Total Score</strong>
              <strong>{item.score}</strong>
            </div>
          </section>

          <section className="panel">
            <h3>History & State</h3>
            {item.dispositionHistory?.length ? (
              <div className="decision-list">
                {item.dispositionHistory.map((event, index) => (
                  <div className="decision-item" key={index}>
                    <strong>
                      {
                        (
                          {
                            CLOSED: "Marked closed",
                            OPEN: "Restored",
                            IGNORED: "Taken off radar",
                            SNOOZED: "Snoozed",
                          } as Record<string, string>
                        )[event.status] || event.status
                      }
                    </strong>
                    <span>{new Date(event.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="panel-empty-text">No state changes recorded.</p>
            )}
          </section>
        </aside>
      </div>

      <details className="panel file-list-panel">
        <summary className="file-list-summary">
          <span>Tracked Files ({item.fileCount})</span>
          <ChevronDown size={15} />
        </summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>File Path</th>
                <th>Size</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              {item.files?.map((file) => (
                <tr key={file.relativePath}>
                  <td><code>{file.relativePath}</code></td>
                  <td>
                    {file.size < 1024
                      ? `${file.size} B`
                      : `${(file.size / 1024).toFixed(1)} KB`}
                  </td>
                  <td>{new Date(file.mtime).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {snooze && (
        <SnoozeDialog
          name={item.displayName}
          onClose={() => setSnooze(false)}
          onSnooze={(until) => action("snooze", { until })}
        />
      )}
    </>
  );
}
