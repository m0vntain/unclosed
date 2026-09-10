import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { schema } from "./schema.js";
import type { Candidate } from "../scanner/discovery.js";
import { category } from "../scanner/scoring.js";
import type {
  ActivityState,
  Disposition,
  FileRecord,
  Period,
  ScanProgress,
  Signal,
  WorkItem,
} from "../../../../shared/types.js";

interface Snapshot {
  id: number;
  work_item_id: string;
  scan_id: number;
  score: number;
  activity_state: ActivityState;
  latest_modified_at: string | null;
  last_activity_at: string | null;
  file_count: number;
  period_json: string;
  created_at: string;
}
interface DispositionRow {
  status: Disposition;
  snoozed_until: string | null;
  closed_snapshot_id: number | null;
  closed_at: string | null;
  reopened: number;
}
interface ItemRow {
  id: string;
  kind: "file" | "folder";
  scan_root: string;
  relative_path: string;
  display_name: string;
  extension: string;
  created_at: string;
  last_seen_at: string;
  available: number;
}
export const idleProgress = (): ScanProgress => ({
  id: null,
  status: "idle",
  itemsScanned: 0,
  itemsDiscovered: 0,
  currentItem: "",
  startedAt: null,
  completedAt: null,
  warnings: [],
  newItems: 0,
  changedStates: 0,
});

export class Repository {
  db: Database.Database;
  constructor(public filename: string) {
    if (filename !== ":memory:")
      mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(schema);
  }
  close() {
    this.db.close();
  }
  startScan(now: string) {
    const progress = {
      ...idleProgress(),
      status: "running" as const,
      startedAt: now,
    };
    const id = Number(
      this.db
        .prepare("INSERT INTO scans (started_at,progress_json) VALUES (?,?)")
        .run(now, JSON.stringify(progress)).lastInsertRowid,
    );
    progress.id = id;
    this.saveProgress(progress);
    return progress;
  }
  saveProgress(progress: ScanProgress) {
    this.db
      .prepare("UPDATE scans SET completed_at=?,progress_json=? WHERE id=?")
      .run(progress.completedAt, JSON.stringify(progress), progress.id);
  }
  latestScan(): ScanProgress {
    const row = this.db
      .prepare("SELECT progress_json FROM scans ORDER BY id DESC LIMIT 1")
      .get() as { progress_json: string } | undefined;
    return row ? JSON.parse(row.progress_json) : idleProgress();
  }
  latestSnapshot(id: string): Snapshot | undefined {
    return this.db
      .prepare(
        "SELECT * FROM work_item_snapshots WHERE work_item_id=? ORDER BY id DESC LIMIT 1",
      )
      .get(id) as Snapshot | undefined;
  }
  files(snapshotId: number): FileRecord[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM file_snapshots WHERE snapshot_id=? ORDER BY relative_path",
        )
        .all(snapshotId) as {
        relative_path: string;
        extension: string;
        size: number;
        mtime: number;
        signals_json: string;
      }[]
    ).map((row) => ({
      relativePath: row.relative_path,
      extension: row.extension,
      size: row.size,
      mtime: row.mtime,
      signals: JSON.parse(row.signals_json),
    }));
  }
  history(id: string): Period[] {
    return (
      this.db
        .prepare(
          "SELECT period_json FROM work_item_snapshots WHERE work_item_id=? ORDER BY id",
        )
        .all(id) as { period_json: string }[]
    ).map((row) => JSON.parse(row.period_json));
  }
  disposition(id: string): DispositionRow {
    return (
      (this.db
        .prepare("SELECT * FROM dispositions WHERE work_item_id=?")
        .get(id) as DispositionRow) ?? {
        status: "OPEN",
        snoozed_until: null,
        closed_snapshot_id: null,
        closed_at: null,
        reopened: 0,
      }
    );
  }
  saveItem(
    candidate: Candidate,
    scanId: number,
    now: string,
    files: FileRecord[],
    period: Period,
    result: {
      score: number;
      signals: Signal[];
      state: ActivityState;
      latestModifiedAt: string | null;
      lastActivityAt: string | null;
    },
    reopen: boolean,
  ) {
    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO work_items VALUES (?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET last_seen_at=excluded.last_seen_at,available=1`,
        )
        .run(
          candidate.id,
          candidate.kind,
          candidate.root.id,
          candidate.relativePath,
          candidate.displayName,
          candidate.extension,
          now,
          now,
        );
      const snapshotId = Number(
        this.db
          .prepare(
            `INSERT INTO work_item_snapshots (work_item_id,scan_id,score,activity_state,latest_modified_at,last_activity_at,file_count,period_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
          )
          .run(
            candidate.id,
            scanId,
            result.score,
            result.state,
            result.latestModifiedAt,
            result.lastActivityAt,
            files.length,
            JSON.stringify(period),
            now,
          ).lastInsertRowid,
      );
      const insertFile = this.db.prepare(
        "INSERT INTO file_snapshots VALUES (?,?,?,?,?,?)",
      );
      for (const file of files)
        insertFile.run(
          snapshotId,
          file.relativePath,
          file.extension,
          file.size,
          file.mtime,
          JSON.stringify(file.signals),
        );
      const insertSignal = this.db.prepare(
        "INSERT INTO signals (snapshot_id,signal_json) VALUES (?,?)",
      );
      for (const s of result.signals)
        insertSignal.run(snapshotId, JSON.stringify(s));
      if (reopen) {
        this.db
          .prepare(
            "UPDATE dispositions SET status='OPEN',reopened=1,updated_at=? WHERE work_item_id=?",
          )
          .run(now, candidate.id);
        this.db
          .prepare(
            "INSERT INTO disposition_history (work_item_id,status,snapshot_id,created_at) VALUES (?,'OPEN',?,?)",
          )
          .run(candidate.id, snapshotId, now);
      }
    })();
  }
  setDisposition(
    id: string,
    status: Disposition,
    until: string | null = null,
    now = new Date().toISOString(),
  ) {
    const snapshot = this.latestSnapshot(id);
    if (!snapshot) return false;
    const prior = this.disposition(id);
    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO dispositions (work_item_id,status,snoozed_until,closed_snapshot_id,closed_at,reopened,updated_at) VALUES (?,?,?,?,?,0,?)
        ON CONFLICT(work_item_id) DO UPDATE SET status=excluded.status,snoozed_until=excluded.snoozed_until,closed_snapshot_id=excluded.closed_snapshot_id,closed_at=excluded.closed_at,reopened=0,updated_at=excluded.updated_at`,
        )
        .run(
          id,
          status,
          until,
          status === "CLOSED" ? snapshot.id : prior.closed_snapshot_id,
          status === "CLOSED" ? now : prior.closed_at,
          now,
        );
      this.db
        .prepare(
          "INSERT INTO disposition_history (work_item_id,status,snapshot_id,snoozed_until,created_at) VALUES (?,?,?,?,?)",
        )
        .run(id, status, snapshot.id, until, now);
    })();
    return true;
  }
  expireSnoozes(now = new Date().toISOString()) {
    const rows = this.db
      .prepare(
        "SELECT work_item_id FROM dispositions WHERE status='SNOOZED' AND snoozed_until<=?",
      )
      .all(now) as { work_item_id: string }[];
    for (const row of rows)
      this.setDisposition(row.work_item_id, "OPEN", null, now);
  }
  item(id: string, details = false): WorkItem | null {
    const row = this.db
      .prepare("SELECT * FROM work_items WHERE id=?")
      .get(id) as ItemRow | undefined;
    const snapshot = this.latestSnapshot(id);
    if (!row || !snapshot) return null;
    const d = this.disposition(id);
    const signals = (
      this.db
        .prepare(
          "SELECT signal_json FROM signals WHERE snapshot_id=? ORDER BY id",
        )
        .all(snapshot.id) as { signal_json: string }[]
    ).map((s) => JSON.parse(s.signal_json) as Signal);
    // A user restoring or closing an item acknowledges the previous changed-after-close signal.
    const visibleSignals = d.reopened
      ? signals
      : signals.filter((s) => s.type !== "reopened");
    const score = Math.min(
      100,
      visibleSignals.reduce((sum, s) => sum + s.weight, 0),
    );
    return {
      id: row.id,
      kind: row.kind,
      scanRoot: row.scan_root,
      relativePath: row.relative_path,
      displayName: row.display_name,
      extension: row.extension,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      available: !!row.available,
      status: d.status,
      snoozedUntil: d.snoozed_until,
      closedAt: d.closed_at,
      reopened: !!d.reopened,
      score,
      signals: visibleSignals,
      activityState: snapshot.activity_state,
      category: category(
        d.status,
        snapshot.activity_state,
        score,
        visibleSignals,
      ),
      latestModifiedAt: snapshot.latest_modified_at,
      lastActivityAt: snapshot.last_activity_at,
      fileCount: snapshot.file_count,
      history: this.history(id),
      ...(details
        ? { files: this.files(snapshot.id).map((f) => ({ ...f, signals: [] })) }
        : {}),
    };
  }
  items(roots?: string[]): WorkItem[] {
    this.expireSnoozes();
    const rows = this.db
      .prepare("SELECT id,scan_root FROM work_items")
      .all() as { id: string; scan_root: string }[];
    return rows
      .filter((row) => !roots || roots.includes(row.scan_root))
      .map((row) => this.item(row.id))
      .filter((item): item is WorkItem => item !== null)
      .sort(
        (a, b) =>
          b.score - a.score || a.displayName.localeCompare(b.displayName),
      );
  }
  markMissing(roots: string[], seen: string[]) {
    const set = new Set(seen);
    const rows = this.db
      .prepare("SELECT id,scan_root FROM work_items")
      .all() as { id: string; scan_root: string }[];
    const update = this.db.prepare(
      "UPDATE work_items SET available=0 WHERE id=?",
    );
    this.db.transaction(() => {
      for (const row of rows)
        if (roots.includes(row.scan_root) && !set.has(row.id))
          update.run(row.id);
    })();
  }
}
