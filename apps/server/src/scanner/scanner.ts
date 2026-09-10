import type {
  Root,
  FileRecord,
  ScanProgress,
} from "../../../../shared/types.js";
import { Repository } from "../db/repository.js";
import { discover } from "./discovery.js";
import { walk, readBounded } from "./traversal.js";
import { taskMarkers, textExtensions } from "./detectors/task-markers.js";
import { markdownChecklist } from "./detectors/markdown-checklist.js";
import { draftFiles } from "./detectors/draft-files.js";
import { spreadsheet } from "./detectors/spreadsheet.js";
import { compareFiles, activitySignals } from "./detectors/activity.js";
import { momentum } from "./detectors/momentum.js";
import { signal } from "./detectors/types.js";
import { scoreSignals, explicitTypes } from "./scoring.js";

export class Scanner {
  cancelled = false;
  constructor(
    private repository: Repository,
    private roots: Root[],
  ) {}
  async run(progress: ScanProgress, now = Date.now()) {
    const timestamp = new Date(now).toISOString();
    const warn = (message: string) => {
      if (progress.warnings.length < 100) progress.warnings.push(message);
    };
    const before = new Map(
      this.repository.items().map((item) => [item.id, item.category]),
    );
    const candidates = [];
    const healthyRoots: string[] = [];
    for (const root of this.roots) {
      let failed = false;
      candidates.push(
        ...(await discover(root, (message) => {
          failed = true;
          warn(message);
        })),
      );
      if (!failed) healthyRoots.push(root.id);
    }
    progress.itemsDiscovered = candidates.length;
    this.repository.saveProgress(progress);
    const seen: string[] = [];
    try {
      for (const candidate of candidates) {
        if (this.cancelled) break;
        progress.currentItem = `${candidate.root.label} / ${candidate.displayName}`;
        this.repository.saveProgress(progress);
        const previous = this.repository.latestSnapshot(candidate.id);
        const oldFiles = previous ? this.repository.files(previous.id) : null;
        const cache = new Map(
          (oldFiles ?? []).map((file) => [file.relativePath, file]),
        );
        const files: FileRecord[] = [];
        let incomplete = false;
        const process = async (file: FileRecord) => {
          const cached = cache.get(file.relativePath);
          if (
            cached &&
            cached.mtime === file.mtime &&
            cached.size === file.size
          ) {
            files.push(cached);
            return;
          }
          try {
            const needsContent =
              textExtensions.has(file.extension) || file.extension === ".xlsx";
            const content = needsContent
              ? await readBounded(candidate.root.path, file)
              : null;
            file.signals = [];
            for (const detector of [
              draftFiles,
              taskMarkers,
              markdownChecklist,
              spreadsheet,
            ])
              file.signals.push(...(await detector.scan({ file, content })));
            // Limit stored detailed excerpts across all files, while retaining total counts for scoring.
          } catch {
            warn(
              `Could not parse ${file.relativePath}. Metadata is still tracked; content will be retried next scan.`,
            );
            file.signals = draftFiles.scan({
              file,
              content: null,
            }) as FileRecord["signals"];
            // Sentinel prevents failed parsing from being treated as successfully cached content.
            file.signals.push(
              signal(
                "scanner",
                "retry",
                "Content unavailable",
                "Content parsing was skipped or failed; metadata is still tracked.",
                0,
              ),
            );
          }
          files.push(file);
        };
        let batch: Promise<void>[] = [];
        for await (const file of walk(
          candidate.root.path,
          candidate.relativePath,
          (message) => {
            incomplete = true;
            warn(message);
          },
        )) {
          if (this.cancelled) break;
          const cached = cache.get(file.relativePath);
          if (cached?.signals.some((s) => s.type === "retry"))
            cache.delete(file.relativePath);
          batch.push(process(file));
          if (batch.length >= 8) {
            await Promise.all(batch);
            batch = [];
          }
        }
        await Promise.all(batch);
        if (this.cancelled) break;
        if (incomplete) {
          const present = new Set(files.map((f) => f.relativePath));
          for (const old of oldFiles ?? [])
            if (!present.has(old.relativePath)) files.push(old);
        }
        files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
        let exampleBudget = 50;
        for (const file of files)
          for (const s of file.signals) {
            s.examples = s.examples.slice(0, exampleBudget);
            exampleBudget -= s.examples.length;
          }
        const diff = compareFiles(oldFiles, files);
        const period = { ...diff, scanId: progress.id!, at: timestamp };
        const history = [...this.repository.history(candidate.id), period];
        const raw = files
          .flatMap((file) => file.signals)
          .filter((s) => s.type !== "retry");
        const latestModified = files.length
          ? files.reduce((max, f) => Math.max(max, f.mtime), 0)
          : null;
        const m = momentum(
          history,
          latestModified,
          raw.some((s) => explicitTypes.has(s.type)),
          now,
        );
        raw.push(...activitySignals(history), ...m.signals);
        const disposition = this.repository.disposition(candidate.id);
        const reopen =
          disposition.status === "CLOSED" &&
          !!(diff.added + diff.changed + diff.removed);
        if (reopen || disposition.reopened) {
          const s = signal(
            "activity",
            "reopened",
            "Changed since you marked this closed",
            "File metadata changed after the recorded closed snapshot. Your original close history has been preserved.",
            1,
          );
          s.weight = 20;
          raw.push(s);
        }
        const scored = scoreSignals(raw);
        this.repository.saveItem(
          candidate,
          progress.id!,
          timestamp,
          files,
          period,
          {
            ...scored,
            state: m.state,
            latestModifiedAt:
              latestModified === null
                ? null
                : new Date(latestModified).toISOString(),
            lastActivityAt: m.lastActivityAt,
          },
          reopen,
        );
        seen.push(candidate.id);
        progress.itemsScanned++;
        const current = this.repository.item(candidate.id)!;
        if (!before.has(candidate.id) && current.category !== "Quiet")
          progress.newItems++;
        if (
          before.has(candidate.id) &&
          before.get(candidate.id) !== current.category
        )
          progress.changedStates++;
        this.repository.saveProgress(progress);
      }
      if (!this.cancelled) this.repository.markMissing(healthyRoots, seen);
      progress.status = this.cancelled ? "cancelled" : "complete";
    } catch {
      progress.status = "failed";
      progress.error =
        "The sweep could not finish. Completed item snapshots have been preserved.";
    }
    progress.currentItem = "";
    progress.completedAt = new Date().toISOString();
    this.repository.saveProgress(progress);
    return progress;
  }
}
