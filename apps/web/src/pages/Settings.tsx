import {
  Folder,
  LockKeyhole,
  HardDrive,
  ShieldCheck,
  Terminal,
  ArrowUpRight,
} from "lucide-react";
import type { Root } from "../../../../shared/types";
export function Settings({
  roots,
  openIgnored,
}: {
  roots: Root[];
  openIgnored: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">YOUR WORKSPACE</div>
        <h1>Settings</h1>
        <p>A little visibility. A lot of control.</p>
      </div>
      <section className="panel settings-panel">
        <div className="section-heading">
          <h2>Watched locations</h2>
          <span>{roots.length} mounted</span>
        </div>
        <p>Only folders you explicitly mount are included in a sweep.</p>
        {roots.length ? (
          roots.map((root) => (
            <div className="location-row" key={root.id}>
              <span className="file-icon">
                <Folder size={22} />
              </span>
              <div>
                <strong>{root.label}</strong>
                <code>{root.path}</code>
              </div>
              <span className="readonly">
                <LockKeyhole size={13} /> Read only
              </span>
            </div>
          ))
        ) : (
          <p>No read-only folders mounted.</p>
        )}
        <div className="command-note">
          <Terminal size={18} />
          <div>
            <strong>Change your watched folders</strong>
            <p>
              Stop Unclosed, then start it with the folders you want to include.
            </p>
            <code>./unclosed start ~/Documents ~/Projects</code>
            <p className="fine-print">
              Windows: .\unclosed.ps1 start C:\Users\you\Documents
            </p>
          </div>
        </div>
      </section>
      <div className="settings-grid">
        <section className="panel">
          <ShieldCheck size={24} />
          <h3>Private by design</h3>
          <dl>
            <div>
              <dt>Processing</dt>
              <dd>Local only</dd>
            </div>
            <div>
              <dt>File access</dt>
              <dd>Read only</dd>
            </div>
            <div>
              <dt>AI, accounts & telemetry</dt>
              <dd>None</dd>
            </div>
          </dl>
          <p>
            Your files stay local and are mounted read-only. Unclosed cannot
            modify them.
          </p>
        </section>
        <section className="panel">
          <HardDrive size={24} />
          <h3>Your local history</h3>
          <dl>
            <div>
              <dt>Database</dt>
              <dd>
                <code>/data/unclosed.db</code>
              </dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>Docker volume</dd>
            </div>
            <div>
              <dt>Scanning</dt>
              <dd>On demand</dd>
            </div>
          </dl>
          <p>
            Snapshots and your decisions survive restarts. Nothing is written
            into your watched folders.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h3>Off the Radar</h3>
            <p>Revisit items you intentionally put aside.</p>
          </div>
          <button onClick={openIgnored}>
            Browse items <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>What a sweep looks for</h3>
        <p>
          Literal task markers, unchecked Markdown tasks, draft-like filenames,
          conservative spreadsheet gaps, and changes in file metadata. Content
          scanning is limited to 2 MB per file. Other formats still contribute
          to activity.
        </p>
        <p>
          Fading requires changes observed across at least two scan periods,
          seven quiet days, and remaining loose-end evidence. First-scan
          metadata never impersonates observed history.
        </p>
      </section>
    </>
  );
}
