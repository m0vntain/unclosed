import path from "node:path";
import { lstat, realpath } from "node:fs/promises";

export function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

// Reject all symlinks, including intermediate components. No caller-supplied paths reach this function from HTTP.
export async function safePath(
  root: string,
  relative: string,
): Promise<string> {
  const resolved = path.resolve(root, relative);
  if (!isWithin(root, resolved))
    throw new Error("Path is outside the scan root");
  if ((await lstat(root)).isSymbolicLink())
    throw new Error("Symbolic links are skipped");
  let current = root;
  for (const part of path
    .relative(root, resolved)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink())
      throw new Error("Symbolic links are skipped");
  }
  if (!isWithin(await realpath(root), await realpath(resolved)))
    throw new Error("Path is outside the scan root");
  return resolved;
}
