import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Root } from "../../../shared/types.js";

export async function getRoots(): Promise<Root[]> {
  let configuration: Record<string, { label: string; identity: string }> = {};
  try {
    configuration = JSON.parse(process.env.UNCLOSED_LOCATIONS ?? "{}");
  } catch {
    /* Safe defaults. */
  }
  let mountInfo = "";
  try {
    mountInfo = await readFile("/proc/self/mountinfo", "utf8");
  } catch {
    /* Linux Docker is the supported runtime. */
  }
  try {
    const roots: Root[] = [];
    for (const entry of await readdir("/scan", { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const scanPath = path.posix.join("/scan", entry.name);
      if ((await lstat(scanPath)).isSymbolicLink()) continue;
      const mount = mountInfo
        .split("\n")
        .map((line) => line.split(" "))
        .find((fields) => fields[4] === scanPath);
      const readOnly = mount?.[5]?.split(",").includes("ro") ?? false;
      // Refuse writable roots, rather than merely claiming read-only access in the UI.
      if (!readOnly) continue;
      const settings = configuration[entry.name];
      const source = process.env.UNCLOSED_FALLBACK_SOURCE;
      const fallbackId = source
        ? createHash("sha256").update(source).digest("hex").slice(0, 24)
        : entry.name;
      const fallbackLabel = source
        ? (source.replaceAll("\\", "/").split("/").filter(Boolean).at(-1) ??
          "Local folder")
        : entry.name;
      roots.push({
        id: settings?.identity ?? fallbackId,
        label: settings?.label ?? fallbackLabel,
        path: scanPath,
        readOnly,
      });
    }
    return roots.sort((a, b) => a.path.localeCompare(b.path));
  } catch {
    return [];
  }
}
