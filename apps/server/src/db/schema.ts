export const schema = `
CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO migrations VALUES (1);
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY, started_at TEXT NOT NULL, completed_at TEXT, progress_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, scan_root TEXT NOT NULL, relative_path TEXT NOT NULL,
  display_name TEXT NOT NULL, extension TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS work_item_snapshots (
  id INTEGER PRIMARY KEY, work_item_id TEXT NOT NULL REFERENCES work_items(id), scan_id INTEGER NOT NULL REFERENCES scans(id),
  score INTEGER NOT NULL, activity_state TEXT NOT NULL, latest_modified_at TEXT, last_activity_at TEXT,
  file_count INTEGER NOT NULL, period_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS snapshot_item ON work_item_snapshots(work_item_id, id DESC);
CREATE TABLE IF NOT EXISTS file_snapshots (
  snapshot_id INTEGER NOT NULL REFERENCES work_item_snapshots(id), relative_path TEXT NOT NULL,
  extension TEXT NOT NULL, size INTEGER NOT NULL, mtime REAL NOT NULL, signals_json TEXT NOT NULL,
  PRIMARY KEY(snapshot_id, relative_path)
);
CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY, snapshot_id INTEGER NOT NULL REFERENCES work_item_snapshots(id), signal_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS signal_snapshot ON signals(snapshot_id);
CREATE TABLE IF NOT EXISTS dispositions (
  work_item_id TEXT PRIMARY KEY REFERENCES work_items(id), status TEXT NOT NULL DEFAULT 'OPEN',
  snoozed_until TEXT, closed_snapshot_id INTEGER, closed_at TEXT, reopened INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS disposition_history (
  id INTEGER PRIMARY KEY, work_item_id TEXT NOT NULL REFERENCES work_items(id), status TEXT NOT NULL,
  snapshot_id INTEGER, snoozed_until TEXT, created_at TEXT NOT NULL
);
`;
