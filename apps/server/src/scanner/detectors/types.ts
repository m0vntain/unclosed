import type { FileRecord, Signal } from "../../../../../shared/types.js";
export interface DetectorContext {
  file: FileRecord;
  content: Buffer | null;
}
export interface Detector {
  id: string;
  scan(context: DetectorContext): Promise<Signal[]> | Signal[];
}
export function signal(
  detectorId: string,
  type: string,
  title: string,
  explanation: string,
  count: number,
  examples: Signal["examples"] = [],
): Signal {
  return {
    detectorId,
    type,
    title,
    explanation,
    count,
    weight: 0,
    examples: examples.slice(0, 50),
  };
}
