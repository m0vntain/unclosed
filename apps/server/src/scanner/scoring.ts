import type {
  Category,
  Disposition,
  Signal,
  ActivityState,
} from "../../../../shared/types.js";
export const explicitTypes = new Set([
  "markers",
  "checklist",
  "draft",
  "sheet-gaps",
  "sheet-placeholders",
  "sheet-formulas",
]);
export function scoreSignals(raw: Signal[]): {
  score: number;
  signals: Signal[];
} {
  const byType = new Map<string, Signal>();
  for (const signal of raw) {
    const previous = byType.get(signal.type);
    if (previous) {
      previous.count += signal.count;
      previous.examples.push(...signal.examples);
    } else
      byType.set(signal.type, { ...signal, examples: [...signal.examples] });
  }
  const signals = [...byType.values()];
  let sheetBudget = 20;
  let exampleBudget = 50;
  for (const s of signals) {
    if (s.type === "markers") {
      s.weight = Math.min(20, s.count * 2);
      s.title = `${s.count} task marker${s.count === 1 ? "" : "s"}`;
    }
    if (s.type === "checklist") {
      s.weight = Math.min(20, s.count * 3);
      s.title = `${s.count} unchecked task${s.count === 1 ? "" : "s"}`;
    }
    if (s.type === "draft") {
      s.weight = Math.min(10, s.count * 5);
      s.title = `${s.count} draft-like filename${s.count === 1 ? "" : "s"}`;
    }
    if (s.type === "sheet-gaps" || s.type === "sheet-placeholders") {
      s.weight = Math.min(sheetBudget, s.count * 2);
      sheetBudget -= s.weight;
      s.title =
        s.type === "sheet-gaps"
          ? `${s.count} populated row${s.count === 1 ? "" : "s"} with gaps`
          : `${s.count} spreadsheet placeholder${s.count === 1 ? "" : "s"}`;
    }
    if (s.type === "sheet-formulas") {
      s.weight = Math.min(12, s.count * 4);
      s.title = `${s.count} missing formula${s.count === 1 ? "" : "s"}`;
    }
    s.examples = s.examples.slice(0, exampleBudget);
    exampleBudget -= s.examples.length;
  }
  return {
    score: Math.min(
      100,
      signals.reduce((sum, s) => sum + s.weight, 0),
    ),
    signals,
  };
}
export function category(
  status: Disposition,
  state: ActivityState,
  score: number,
  signals: Signal[],
): Category {
  if (status === "CLOSED") return "Recently Closed";
  if (status === "IGNORED") return "Off the Radar";
  if (status === "SNOOZED") return "Snoozed";
  if (!signals.some((s) => explicitTypes.has(s.type) || s.type === "reopened"))
    return "Quiet";
  if (state === "FADING" || state === "STALE") return "Fading";
  if (signals.some((s) => s.type === "reopened") || score >= 30)
    return "Needs Attention";
  if (state === "ACTIVE") return "Still Active";
  return "Needs Attention";
}
