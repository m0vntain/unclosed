import { opendir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { ignored, type Warning } from "./traversal.js";
import { safePath } from "../safety/paths.js";
import type { Root } from "../../../../shared/types.js";

export interface Candidate {
  id: string;
  kind: "file" | "folder";
  root: Root;
  relativePath: string;
  displayName: string;
  extension: string;
}
export async function discover(
  root: Root,
  warn: Warning,
): Promise<Candidate[]> {
  const items: Candidate[] = [];
  try {
    await safePath(root.path, "");
    for await (const child of await opendir(root.path)) {
      if (
        ignored.has(child.name) ||
        child.isSymbolicLink() ||
        (!child.isFile() && !child.isDirectory())
      )
        continue;
      items.push({
        id: createHash("sha256")
          .update(`${root.id}/${child.name}`)
          .digest("hex")
          .slice(0, 24),
        kind: child.isDirectory() ? "folder" : "file",
        root,
        relativePath: child.name,
        displayName: child.name,
        extension: child.isFile() ? path.extname(child.name).toLowerCase() : "",
      });
    }
  } catch {
    warn(
      `Location ${root.label} is unavailable. Existing items have been kept.`,
    );
  }
  return items.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
