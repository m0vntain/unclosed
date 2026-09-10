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
      <div className="empty">
        <h2>Couldn’t open this item.</h2>
        <p>{error}</p>
        <button onClick={onBack}>Back to Radar</button>
      </div>
    );
  if (!item) return <div className="empty">Loading evidence…</div>;
  return (
    <>
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Radar
      </button>
      <div className="detail-header">
        <div>
          <div className="eyebrow">
            {item.kind === "folder" ? (
              <Folder size={16} />
            ) : (
              <FileText size={16} />
            )}{" "}
            {item.kind} · {item.fileCount} tracked files
          </div>
          <h1>{item.displayName}</h1>
          <div className="detail-meta">
            <span className={`status ${tone(item)}`}>
              <span />
              {statusLabel(item)}
            </span>
            <span>{item.relativePath}</span>
          </div>
        </div>
        <div className="detail-score">
          <strong>{item.score}</strong>
          <span>Unclosed Score</span>
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
              <Check size={17} /> Mark closed
            </button>
            <button disabled={busy} onClick={() => setSnooze(true)}>
              <Clock3 size={17} /> Snooze
            </button>
            <button
              disabled={busy}
              onClick={() => void action("take-off-radar")}
            >
              <EyeOff size={17} /> Take off radar
            </button>
          </>
        ) : (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void action("restore")}
          >
            <RotateCcw size={17} />
            {item.status === "CLOSED" ? "Reopen" : "Bring back"}
          </button>
        )}
        {item.status === "SNOOZED" && (
          <span>
            Hidden until {new Date(item.snoozedUntil!).toLocaleDateString()}
          </span>
        )}
      </div>
      {!item.available && (
        <div className="notice">
          <Info size={18} />
          This item wasn’t found in the latest sweep. Its previous evidence and
          history are preserved.
        </div>
      )}
      <section className="panel detail-activity">
        <div className="section-heading">
          <h2>Activity, observed.</h2>
          <span>
            {item.history.length} scan{item.history.length === 1 ? "" : "s"}
          </span>
        </div>
        <Activity item={item} large />
        <p>
          {item.lastActivityAt
            ? `Last detected activity ${ago(item.lastActivityAt)}.`
            : `Last file modification ${ago(item.latestModifiedAt)}. The first scan establishes a baseline; it does not establish an active period.`}
        </p>
        <details>
          <summary>
            Inspect scan history <ChevronDown size={14} />
          </summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Scan</th>
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
                      {p.baseline ? " · baseline" : ""}
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
        <section>
          <div className="section-heading">
            <h2>Why this is on your radar</h2>
          </div>
          <p className="section-description">
            The evidence is here. The decision is yours.
          </p>
          {item.signals.length === 0 && (
            <div className="panel">
              No unfinished-work signals in this snapshot.
            </div>
          )}
          {item.signals.map((signal) => (
            <article className="panel evidence" key={signal.type}>
              <div className="section-heading">
                <h3>{signal.title}</h3>
                <span className="evidence-type">
                  {signal.detectorId.replaceAll("-", " ")}
                </span>
              </div>
              <p>{signal.explanation}</p>
              {signal.examples.length > 0 && (
                <ul>
                  {signal.examples.map((example, index) => (
                    <li key={index}>
                      <div className="evidence-path">
                        {example.relativePath}
                        {example.lineNumber ? `:${example.lineNumber}` : ""}
                        {example.sheet
                          ? ` · ${example.sheet}!${example.cell}`
                          : ""}
                      </div>
                      {example.excerpt && (
                        <div className="excerpt">{example.excerpt}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {signal.count > signal.examples.length &&
                signal.examples.length > 0 && (
                  <small>
                    Showing {signal.examples.length} of {signal.count} matches.
                    A maximum of 50 detailed examples is stored per item.
                  </small>
                )}
            </article>
          ))}
        </section>
        <aside>
          <section className="panel score-panel">
            <h3>Score breakdown</h3>
            <p>Evidence weights, capped at 100.</p>
            {item.signals.map((s) => (
              <div className="score-row" key={s.type}>
                <span>{s.title}</span>
                <strong>+{s.weight}</strong>
              </div>
            ))}
            <div className="score-row score-total">
              <strong>Unclosed Score</strong>
              <strong>{item.score}</strong>
            </div>
            <p className="fine-print">
              Age alone adds no points. Filename clues contribute at most 10. A
              score is a sorting aid, never a verdict.
            </p>
          </section>
          <section className="panel">
            <h3>Your decisions</h3>
            {item.dispositionHistory?.length ? (
              item.dispositionHistory.map((event, index) => (
                <div className="decision" key={index}>
                  <strong>
                    {
                      (
                        {
                          CLOSED: "Marked closed",
                          OPEN: "Brought back",
                          IGNORED: "Taken off radar",
                          SNOOZED: "Snoozed",
                        } as Record<string, string>
                      )[event.status]
                    }
                  </strong>
                  <span>{new Date(event.at).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p>No decisions yet. You’re in control.</p>
            )}
          </section>
        </aside>
      </div>
      <details className="panel file-list">
        <summary>
          Tracked files ({item.fileCount}) <ChevronDown size={16} />
        </summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Last modification</th>
              </tr>
            </thead>
            <tbody>
              {item.files?.map((file) => (
                <tr key={file.relativePath}>
                  <td>{file.relativePath}</td>
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
