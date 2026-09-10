export type Disposition = "OPEN" | "SNOOZED" | "CLOSED" | "IGNORED";
export type ActivityState = "ACTIVE" | "FADING" | "STALE" | "QUIET";
export type Category =
  | "Needs Attention"
  | "Fading"
  | "Still Active"
  | "Recently Closed"
  | "Off the Radar"
  | "Snoozed"
  | "Quiet";
export interface Evidence {
  relativePath: string;
  lineNumber?: number;
  excerpt?: string;
  cell?: string;
  sheet?: string;
}
export interface Signal {
  detectorId: string;
  type: string;
  title: string;
  explanation: string;
  weight: number;
  count: number;
  examples: Evidence[];
}
export interface FileRecord {
  relativePath: string;
  extension: string;
  size: number;
  mtime: number;
  signals: Signal[];
}
export interface Period {
  scanId: number;
  at: string;
  changed: number;
  added: number;
  removed: number;
  baseline: boolean;
}
export interface WorkItem {
  id: string;
  kind: "file" | "folder";
  scanRoot: string;
  relativePath: string;
  displayName: string;
  extension: string;
  createdAt: string;
  lastSeenAt: string;
  available: boolean;
  status: Disposition;
  snoozedUntil: string | null;
  closedAt: string | null;
  reopened: boolean;
  score: number;
  activityState: ActivityState;
  category: Category;
  latestModifiedAt: string | null;
  lastActivityAt: string | null;
  fileCount: number;
  signals: Signal[];
  history: Period[];
  files?: FileRecord[];
}
export interface ScanProgress {
  id: number | null;
  status: "idle" | "running" | "complete" | "cancelled" | "failed";
  itemsScanned: number;
  itemsDiscovered: number;
  currentItem: string;
  startedAt: string | null;
  completedAt: string | null;
  warnings: string[];
  newItems: number;
  changedStates: number;
  error?: string;
}
export interface Root {
  id: string;
  label: string;
  path: string;
  readOnly: boolean;
}
