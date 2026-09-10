import path from "node:path";
import { opendir, lstat, open, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { safePath, isWithin } from "../safety/paths.js";
import type { FileRecord } from "../../../../shared/types.js";

export const ignored = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "target",
  "coverage",
  "vendor",
  ".cache",
  "venv",
  ".venv",
  "__pycache__",
  "out",
  "tmp",
  "temp",
  ".idea",
  ".vscode",
  ".DS_Store",
  "Thumbs.db",
]);
export const MAX_CONTENT_SIZE = 2 * 1024 * 1024;
export type Warning = (message: string) => void;

export async function* walk(
  root: string,
  relative: string,
  warn: Warning,
): AsyncGenerator<FileRecord> {
  const stack = [relative];
  while (stack.length) {
    const entry = stack.pop()!;
    try {
      const full = await safePath(root, entry);
      const stat = await lstat(full);
      if (stat.isDirectory()) {
        const directory = await opendir(full);
        for await (const child of directory) {
          if (ignored.has(child.name) || child.isSymbolicLink()) continue;
          stack.push(path.join(entry, child.name));
        }
      } else if (stat.isFile()) {
        yield {
          relativePath: entry.split(path.sep).join("/"),
          extension: path.extname(entry).toLowerCase(),
          size: stat.size,
          mtime: stat.mtimeMs,
          signals: [],
        };
      }
    } catch {
      warn(
        `Could not inspect ${entry.split(path.sep).join("/")}; previous evidence was retained where possible.`,
      );
    }
  }
}

export async function readBounded(
  root: string,
  file: FileRecord,
): Promise<Buffer | null> {
  if (file.size > MAX_CONTENT_SIZE) return null;
  const full = await safePath(root, file.relativePath);
  const handle = await open(
    full,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    // On Linux, verify the opened descriptor too, closing the intermediate-symlink race.
    if (process.platform === "linux") {
      const actual = await realpath(`/proc/self/fd/${handle.fd}`);
      if (!isWithin(await realpath(root), actual)) throw new Error("Opened file escaped its scan root");
    }
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_CONTENT_SIZE) return null;
    const buffer = Buffer.alloc(MAX_CONTENT_SIZE + 1);
    let bytes = 0;
    while (bytes < buffer.length) {
      const result = await handle.read(
        buffer,
        bytes,
        buffer.length - bytes,
        null,
      );
      if (!result.bytesRead) break;
      bytes += result.bytesRead;
    }
    return bytes > MAX_CONTENT_SIZE ? null : buffer.subarray(0, bytes);
  } finally {
    await handle.close();
  }
}
