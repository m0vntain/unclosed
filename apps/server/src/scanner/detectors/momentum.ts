import type {
  ActivityState,
  Period,
  Signal,
} from "../../../../../shared/types.js";
import { signal } from "./types.js";
export function momentum(
  history: Period[],
  latestModified: number | null,
  hasEvidence: boolean,
  now: number,
) {
  const active = history.filter(
    (p) => !p.baseline && p.changed + p.added + p.removed > 0,
  );
  const observed = active.at(-1)?.at;
  const latest = observed ? Date.parse(observed) : latestModified;
  const quietDays =
    latest === null ? 0 : Math.max(0, (now - latest) / 86400000);
  const sustained = active.length >= 2;
  let state: ActivityState =
    latest !== null && quietDays < 7 ? "ACTIVE" : "QUIET";
  const signals: Signal[] = [];
  if (hasEvidence && sustained && quietDays >= 7) {
    state = quietDays >= 30 ? "STALE" : "FADING";
    const s = signal(
      "momentum",
      "momentum",
      `Quiet for ${Math.floor(quietDays)} days`,
      `Changes were observed across ${active.length} scan periods, followed by ${Math.floor(quietDays)} days without a detected change. Explicit loose-end evidence remains.`,
      Math.floor(quietDays),
    );
    s.weight = quietDays >= 30 ? 15 : quietDays >= 14 ? 11 : 7;
    signals.push(s);
  }
  return { state, signals, lastActivityAt: observed ?? null };
}
