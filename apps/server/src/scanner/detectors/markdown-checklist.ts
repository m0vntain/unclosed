import { signal, type Detector } from "./types.js";
export const markdownChecklist: Detector = {
  id: "markdown-checklist",
  scan({ file, content }) {
    if (
      !content ||
      ![".md", ".mdx"].includes(file.extension) ||
      content.includes(0)
    )
      return [];
    let count = 0;
    const examples: {
      relativePath: string;
      lineNumber: number;
      excerpt: string;
    }[] = [];
    content
      .toString("utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        const match = line.match(/^\s*[-*+]\s+\[ \]\s*(.*)$/);
        if (!match) return;
        count++;
        if (examples.length < 50)
          examples.push({
            relativePath: file.relativePath,
            lineNumber: index + 1,
            excerpt: match[1].slice(0, 160),
          });
      });
    return count
      ? [
          signal(
            "markdown-checklist",
            "checklist",
            `${count} unchecked task${count === 1 ? "" : "s"}`,
            "Unchecked Markdown checklist entries. Checked entries are excluded.",
            count,
            examples,
          ),
        ]
      : [];
  },
};
