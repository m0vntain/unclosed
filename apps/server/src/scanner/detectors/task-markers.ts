import { signal, type Detector } from "./types.js";
export const textExtensions = new Set(
  ".md .mdx .txt .csv .ts .tsx .js .jsx .mjs .cjs .py .go .rs .java .kt .swift .rb .php .cs .cpp .c .h .hpp .yaml .yml .json .toml".split(
    " ",
  ),
);
export const taskMarkers: Detector = {
  id: "task-markers",
  scan({ file, content }) {
    if (!content || !textExtensions.has(file.extension) || content.includes(0))
      return [];
    const examples: SignalExample[] = [];
    let count = 0;
    content
      .toString("utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        for (const match of line.matchAll(
          /\b(TODO|FIXME|HACK|TBD|TK|XXX|WIP)\b/gi,
        )) {
          count++;
          if (examples.length < 50)
            examples.push({
              relativePath: file.relativePath,
              lineNumber: index + 1,
              excerpt: `${match[0].toUpperCase()}: ${line.trim().slice(0, 160)}`,
            });
        }
      });
    return count
      ? [
          signal(
            "task-markers",
            "markers",
            `${count} task marker${count === 1 ? "" : "s"}`,
            "Literal TODO, FIXME, HACK, TBD, TK, XXX or WIP markers. Their presence does not determine completion.",
            count,
            examples,
          ),
        ]
      : [];
  },
};
type SignalExample = {
  relativePath: string;
  lineNumber: number;
  excerpt: string;
};
