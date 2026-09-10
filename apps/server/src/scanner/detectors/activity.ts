import type {
  FileRecord,
  Period,
  Signal,
} from "../../../../../shared/types.js";
import { signal } from "./types.js";
export function compareFiles(
  previous: FileRecord[] | null,
  current: FileRecord[],
) {
  if (previous === null)
    return { changed: 0, added: 0, removed: 0, baseline: true };
  const old = new Map(previous.map((file) => [file.relativePath, file]));
  let changed = 0,
    added = 0;
  for (const file of current) {
    const before = old.get(file.relativePath);
    if (!before) added++;
    else if (before.size !== file.size || before.mtime !== file.mtime)
      changed++;
    old.delete(file.relativePath);
  }
  return { changed, added, removed: old.size, baseline: false };
}
export function activitySignals(history: Period[]): Signal[] {
  const active = history.filter(
    (period) =>
      !period.baseline && period.changed + period.added + period.removed > 0,
  );
  if (!active.length) return [];
  const changes = active.reduce(
    (sum, period) => sum + period.changed + period.added + period.removed,
    0,
  );
  const result = signal(
    "activity",
    "activity",
    `Activity across ${active.length} scan period${active.length === 1 ? "" : "s"}`,
    `${changes} file-change events (additions, modifications and removals) across ${active.length} observed scan periods. Repeated changes to one file count separately. The first scan is a baseline.`,
    active.length,
  );
  result.weight =
    active.length >= 7
      ? 12
      : active.length >= 4
        ? 8
        : active.length >= 2
          ? 4
          : 0;
  return [result];
}
