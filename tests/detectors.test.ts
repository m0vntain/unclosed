import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { taskMarkers } from "../apps/server/src/scanner/detectors/task-markers.js";
import { markdownChecklist } from "../apps/server/src/scanner/detectors/markdown-checklist.js";
import { draftFiles } from "../apps/server/src/scanner/detectors/draft-files.js";
import {
  spreadsheet,
  inspectSheet,
} from "../apps/server/src/scanner/detectors/spreadsheet.js";
import { scoreSignals } from "../apps/server/src/scanner/scoring.js";
import { signal } from "../apps/server/src/scanner/detectors/types.js";
import { momentum } from "../apps/server/src/scanner/detectors/momentum.js";
import { activitySignals } from "../apps/server/src/scanner/detectors/activity.js";
import type { FileRecord, Period } from "../shared/types.js";
const file = (extension = ".md", name = "plan.md"): FileRecord => ({
  relativePath: name,
  extension,
  size: 100,
  mtime: 0,
  signals: [],
});
describe("literal text evidence", () => {
  it("counts every marker, case-insensitively, with word boundaries and line numbers", async () => {
    const result = await taskMarkers.scan({
      file: file(),
      content: Buffer.from("todo FIXME tbd\nTODO TODO\nmethodology notebook"),
    });
    expect(result[0].count).toBe(5);
    expect(result[0].examples.at(-1)?.lineNumber).toBe(2);
  });
  it("caps detailed marker examples without losing totals", async () => {
    const result = await taskMarkers.scan({
      file: file(),
      content: Buffer.from("TODO\n".repeat(80)),
    });
    expect(result[0].count).toBe(80);
    expect(result[0].examples).toHaveLength(50);
  });
  it("skips binary content, unknown extensions, and absent bounded content", async () => {
    expect(
      await taskMarkers.scan({
        file: file(),
        content: Buffer.from("TODO\0data"),
      }),
    ).toEqual([]);
    expect(
      await taskMarkers.scan({
        file: file(".pdf"),
        content: Buffer.from("TODO"),
      }),
    ).toEqual([]);
    expect(await taskMarkers.scan({ file: file(), content: null })).toEqual([]);
  });
  it("counts all supported unchecked forms but ignores checked entries", async () => {
    const result = await markdownChecklist.scan({
      file: file(),
      content: Buffer.from("- [ ] A\n* [ ] B\n+ [ ] C\n- [x] D\n- [X] E"),
    });
    expect(result[0].count).toBe(3);
    expect(result[0].examples[2].lineNumber).toBe(3);
  });
  it.each([
    "resume-draft.docx",
    "proposal-final-v3.pptx",
    "homepage-wip.tsx",
    "outline.txt",
    "final-final.xlsx",
  ])("detects weak filename clue: %s", async (name) => {
    expect(
      await draftFiles.scan({ file: file("", name), content: null }),
    ).toHaveLength(1);
  });
  it.each([
    "notes.md",
    "copy.pdf",
    "drafting-guide.pdf",
    "attempt.txt",
    "temporarywork.txt",
  ])("avoids false filename match: %s", async (name) => {
    expect(
      await draftFiles.scan({ file: file("", name), content: null }),
    ).toEqual([]);
  });
});
describe("spreadsheet structural rules", () => {
  const sheet = (rows: string[][]) => ({
    name: "Budget",
    rows: rows.map((row) => row.map((value) => ({ value }))),
  });
  it("flags one internal gap in a mostly populated dense table", () => {
    const result = inspectSheet(
      sheet([
        ["Item", "Cost", "Status"],
        ["A", "1", "Paid"],
        ["B", "2", "Paid"],
        ["C", "", "Paid"],
        ["D", "4", "Paid"],
        ["E", "5", "Paid"],
      ]),
      "budget.xlsx",
    );
    expect(result.find((s) => s.type === "sheet-gaps")?.count).toBe(1);
    expect(result[0].examples[0].cell).toBe("B4");
  });
  it("does not flag intentionally sparse rows or every blank cell", () => {
    expect(
      inspectSheet(
        sheet([
          ["Item", "Cost", "Status"],
          ["A", "", ""],
          ["B", "2", ""],
          ["C", "", ""],
          ["D", "", ""],
          ["E", "5", ""],
        ]),
        "budget.csv",
      ),
    ).toEqual([]);
  });
  it("matches normalized placeholders exactly", () => {
    const result = inspectSheet(
      sheet([
        [" TBD ", "Pending", "unknown", "Unknown street", "Fill in", "???"],
      ]),
      "test.csv",
    );
    expect(result[0].count).toBe(5);
  });
  it("flags a missing formula among consistent formula neighbors", () => {
    const rows = sheet([
      ["Item", "Cost", "Total"],
      ["A", "1", "2"],
      ["B", "2", "4"],
      ["C", "3", "6"],
      ["D", "4", "8"],
      ["E", "5", "10"],
    ]).rows;
    for (const r of [1, 2, 4, 5])
      Object.assign(rows[r][2], { formula: `B${r + 1}*2` });
    const result = inspectSheet({ name: "Sheet", rows }, "test.xlsx");
    expect(result.find((s) => s.type === "sheet-formulas")?.count).toBe(1);
  });
  it("parses a real XLSX archive without executing formulas", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Planning");
    ws.addRow(["Task", "Status"]);
    ws.addRow(["Travel", "TBD"]);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const result = await spreadsheet.scan({
      file: file(".xlsx", "planning.xlsx"),
      content: buffer,
    });
    expect(result[0].examples[0]).toMatchObject({
      sheet: "Planning",
      cell: "B2",
    });
  });
  it("parses quoted CSV fields and ignores a sparse column", async () => {
    const result = await spreadsheet.scan({
      file: file(".csv", "budget.csv"),
      content: Buffer.from(
        'Item,Cost,Status\n"Travel, train",,Pending\nHotel,,Paid',
      ),
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("sheet-placeholders");
  });
});
describe("scoring and momentum", () => {
  it("applies exact family caps, including a shared spreadsheet budget", () => {
    const result = scoreSignals([
      signal("text", "markers", "", "", 30),
      signal("md", "checklist", "", "", 4),
      signal("file", "draft", "", "", 10),
      signal("sheets", "sheet-gaps", "", "", 9),
      signal("sheets", "sheet-placeholders", "", "", 9),
    ]);
    expect(result.score).toBe(62);
  });
  it("caps at 100", () => {
    expect(
      scoreSignals(
        Array.from({ length: 15 }, (_, i) => ({
          ...signal("x", `type-${i}`, "", "", 1),
          weight: 10,
        })),
      ).score,
    ).toBe(100);
  });
  it("filename clues never dominate and old age alone contributes nothing", () => {
    expect(scoreSignals([signal("file", "draft", "", "", 100)]).score).toBe(10);
    expect(momentum([], 0, false, Date.now()).signals).toEqual([]);
    expect(scoreSignals([]).score).toBe(0);
  });
  const history: Period[] = [0, 1, 2].map((day, index) => ({
    scanId: index,
    at: new Date(Date.UTC(2026, 0, day + 1)).toISOString(),
    changed: index ? 2 : 0,
    added: 0,
    removed: 0,
    baseline: index === 0,
  }));
  it("recent metadata can be active without inventing observed history", () => {
    const m = momentum([], Date.now(), true, Date.now());
    expect(m.state).toBe("ACTIVE");
    expect(m.lastActivityAt).toBeNull();
    expect(m.signals).toEqual([]);
  });
  it("sustained observed activity followed by quiet with evidence is fading", () => {
    expect(momentum(history, 0, true, Date.UTC(2026, 0, 20)).state).toBe(
      "FADING",
    );
    expect(momentum(history, 0, true, Date.UTC(2026, 1, 20)).state).toBe(
      "STALE",
    );
    expect(momentum(history, 0, false, Date.UTC(2026, 1, 20)).signals).toEqual(
      [],
    );
  });
  it("does not count first-scan files as observed change events", () => {
    expect(activitySignals(history)[0].count).toBe(2);
    expect(activitySignals([history[0]])).toEqual([]);
  });
});
