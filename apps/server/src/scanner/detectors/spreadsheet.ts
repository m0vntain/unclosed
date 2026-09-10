import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { signal, type Detector } from "./types.js";
import type { Evidence, Signal } from "../../../../../shared/types.js";

export interface Cell {
  value: string;
  formula?: string;
  merged?: boolean;
}
export interface Sheet {
  name: string;
  rows: Cell[][];
}
const populated = (cell: Cell | undefined) =>
  !!cell && (!!cell.value.trim() || !!cell.formula);
const placeholders = new Set([
  "tbd",
  "todo",
  "pending",
  "???",
  "unknown",
  "fill in",
]);
const address = (row: number, column: number) => {
  let letters = "";
  let n = column + 1;
  while (n > 0) {
    n--;
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26);
  }
  return `${letters}${row + 1}`;
};

// A table is a contiguous region with a filled header and at least five dense data rows.
// Only internal gaps with populated neighbors and >=80% column coverage qualify.
export function inspectSheet(sheet: Sheet, relativePath: string): Signal[] {
  const counts = { gaps: 0, placeholders: 0, formulas: 0 };
  const examples: Record<keyof typeof counts, Evidence[]> = {
    gaps: [],
    placeholders: [],
    formulas: [],
  };
  const add = (
    type: keyof typeof counts,
    row: number,
    column: number,
    excerpt: string,
  ) => {
    counts[type]++;
    if (examples[type].length < 50)
      examples[type].push({
        relativePath,
        sheet: sheet.name,
        cell: address(row, column),
        excerpt,
      });
  };
  sheet.rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (placeholders.has(cell.value.trim().toLowerCase()))
        add("placeholders", r, c, `Cell contains "${cell.value.slice(0, 80)}"`);
    }),
  );
  let start = 0;
  while (start < sheet.rows.length) {
    while (start < sheet.rows.length && !sheet.rows[start].some(populated))
      start++;
    let end = start;
    while (end < sheet.rows.length && sheet.rows[end].some(populated)) end++;
    const header = sheet.rows[start] ?? [];
    const width = header.length;
    const rows = sheet.rows.slice(start + 1, end);
    if (
      width >= 2 &&
      width <= 100 &&
      header.every(populated) &&
      rows.length >= 5 &&
      rows.every(
        (row) =>
          row.filter(populated).length >= Math.max(2, Math.ceil(width * 0.6)),
      )
    ) {
      const gapRows = new Set<number>();
      for (let c = 0; c < width; c++) {
        const coverage =
          rows.filter((row) => populated(row[c])).length / rows.length;
        const formulas =
          rows.filter((row) => row[c]?.formula).length / rows.length;
        for (let r = 1; r < rows.length - 1; r++) {
          const cell = rows[r][c];
          if (cell?.merged || rows[r - 1][c]?.merged || rows[r + 1][c]?.merged)
            continue;
          if (
            formulas >= 0.8 &&
            !cell?.formula &&
            rows[r - 1][c]?.formula &&
            rows[r + 1][c]?.formula
          ) {
            add(
              "formulas",
              start + 1 + r,
              c,
              "Formula is missing between formula-bearing rows in a column with ≥80% formulas.",
            );
          } else if (
            coverage >= 0.8 &&
            !populated(cell) &&
            populated(rows[r - 1][c]) &&
            populated(rows[r + 1][c]) &&
            !gapRows.has(r)
          ) {
            gapRows.add(r);
            add(
              "gaps",
              start + 1 + r,
              c,
              "Populated row has a gap in a column filled in ≥80% of comparable rows.",
            );
          }
        }
      }
    }
    start = end + 1;
  }
  const results: Signal[] = [];
  if (counts.gaps)
    results.push(
      signal(
        "spreadsheet",
        "sheet-gaps",
        `${counts.gaps} populated row${counts.gaps === 1 ? "" : "s"} with gaps`,
        "Conservative structural comparison within dense tables; blanks in sparse sheets are not flagged.",
        counts.gaps,
        examples.gaps,
      ),
    );
  if (counts.placeholders)
    results.push(
      signal(
        "spreadsheet",
        "sheet-placeholders",
        `${counts.placeholders} spreadsheet placeholder${counts.placeholders === 1 ? "" : "s"}`,
        "Exact normalized cell values: TBD, TODO, Pending, ???, Unknown or Fill in.",
        counts.placeholders,
        examples.placeholders,
      ),
    );
  if (counts.formulas)
    results.push(
      signal(
        "spreadsheet",
        "sheet-formulas",
        `${counts.formulas} missing formula${counts.formulas === 1 ? "" : "s"}`,
        "A formula is absent among consistent neighboring formulas. No formulas are evaluated.",
        counts.formulas,
        examples.formulas,
      ),
    );
  return results;
}

export const spreadsheet: Detector = {
  id: "spreadsheet",
  async scan({ file, content }) {
    if (!content || ![".csv", ".xlsx"].includes(file.extension)) return [];
    const sheets: Sheet[] = [];
    if (file.extension === ".csv") {
      if (content.includes(0)) return [];
      const rows = parse(content.toString("utf8"), {
        bom: true,
        relax_column_count: true,
        skip_empty_lines: false,
        max_record_size: 100000,
      }) as string[][];
      if (rows.length > 20000 || rows.some((row) => row.length > 100))
        throw new Error(
          "Spreadsheet exceeds the 20,000 row / 100 column limit",
        );
      sheets.push({
        name: "CSV",
        rows: rows.map((row) => row.map((value) => ({ value }))),
      });
    } else {
      // Inspect ZIP directory before decompression. Limits prevent small ZIPs expanding without bound.
      let inflated = 0;
      let entries = 0;
      for (let offset = 0; offset + 46 <= content.length; offset++) {
        if (content.readUInt32LE(offset) !== 0x02014b50) continue;
        inflated += content.readUInt32LE(offset + 24);
        entries++;
        if (inflated > 32 * 1024 * 1024 || entries > 2000)
          throw new Error("Workbook exceeds the expanded-size limit");
        offset +=
          45 +
          content.readUInt16LE(offset + 28) +
          content.readUInt16LE(offset + 30) +
          content.readUInt16LE(offset + 32);
      }
      if (!entries) throw new Error("Unsupported workbook archive");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(content as unknown as ExcelJS.Buffer);
      for (const ws of workbook.worksheets) {
        if (ws.rowCount > 20000 || ws.columnCount > 100)
          throw new Error(
            "Spreadsheet exceeds the 20,000 row / 100 column limit",
          );
        const rows: Cell[][] = [];
        for (let r = 1; r <= ws.rowCount; r++) {
          const row: Cell[] = [];
          for (let c = 1; c <= ws.columnCount; c++) {
            const cell = ws.getCell(r, c);
            row.push({
              value: cell.text,
              formula: cell.formula,
              merged: cell.isMerged,
            });
          }
          while (row.length && !populated(row[row.length - 1])) row.pop();
          rows.push(row);
        }
        sheets.push({ name: ws.name, rows });
      }
    }
    return sheets.flatMap((sheet) => inspectSheet(sheet, file.relativePath));
  },
};
