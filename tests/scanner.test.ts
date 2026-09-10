import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  utimes,
  symlink,
  readFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { Repository } from "../apps/server/src/db/repository.js";
import { Scanner } from "../apps/server/src/scanner/scanner.js";
import { discover } from "../apps/server/src/scanner/discovery.js";
import { safePath, isWithin } from "../apps/server/src/safety/paths.js";
import { readBounded, walk } from "../apps/server/src/scanner/traversal.js";
import * as traversal from "../apps/server/src/scanner/traversal.js";
import { compareFiles } from "../apps/server/src/scanner/detectors/activity.js";
import { createApp } from "../apps/server/src/api/app.js";
import type { Root } from "../shared/types.js";
let dir: string, root: Root, repo: Repository;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "unclosed-test-"));
  await mkdir(path.join(dir, "scan"));
  root = {
    id: "test-root",
    label: "Test",
    path: path.join(dir, "scan"),
    readOnly: true,
  };
  repo = new Repository(path.join(dir, "data", "unclosed.db"));
});
afterEach(async () => {
  vi.restoreAllMocks();
  repo.close();
  await rm(dir, { recursive: true, force: true });
});
const sweep = async (now = Date.now()) =>
  new Scanner(repo, [root]).run(
    repo.startScan(new Date(now).toISOString()),
    now,
  );
const seed = async () => {
  await mkdir(path.join(root.path, "Research", "Notes"), { recursive: true });
  await writeFile(
    path.join(root.path, "Research", "Notes", "plan.md"),
    "- [ ] Book ticket\nTODO: compare options",
  );
};
describe("discovery and safety", () => {
  it("creates direct folder and standalone file candidates without nested duplicates", async () => {
    await seed();
    await writeFile(path.join(root.path, "budget.csv"), "a,b\n1,TBD");
    await mkdir(path.join(root.path, "node_modules"));
    await mkdir(path.join(root.path, ".git"));
    const candidates = await discover(root, () => {});
    expect(candidates.map((c) => c.displayName)).toEqual([
      "budget.csv",
      "Research",
    ]);
  });
  it("rejects parent traversal and absolute paths outside the root", async () => {
    await expect(safePath(root.path, "../secret")).rejects.toThrow();
    await expect(
      safePath(root.path, path.join(dir, "secret")),
    ).rejects.toThrow();
    expect(isWithin("/scan/a", "/scan/ab")).toBe(false);
  });
  it("does not follow file or directory symlinks", async () => {
    await writeFile(path.join(dir, "secret.txt"), "TODO secret");
    await symlink(
      path.join(dir, "secret.txt"),
      path.join(root.path, "link.txt"),
      "file",
    );
    await symlink(dir, path.join(root.path, "linkdir"), "dir");
    expect(await discover(root, () => {})).toEqual([]);
    await expect(safePath(root.path, "link.txt")).rejects.toThrow();
    await expect(safePath(root.path, "linkdir/secret.txt")).rejects.toThrow();
  });
  it("limits reads to 2 MB and skips generated folders", async () => {
    await seed();
    await mkdir(path.join(root.path, "Research", "node_modules"));
    await writeFile(
      path.join(root.path, "Research", "node_modules", "a.txt"),
      "TODO",
    );
    await writeFile(
      path.join(root.path, "huge.txt"),
      Buffer.alloc(2 * 1024 * 1024 + 1, 65),
    );
    const files = [];
    for await (const file of walk(root.path, "", () => {})) files.push(file);
    expect(files).toHaveLength(2);
    expect(
      await readBounded(
        root.path,
        files.find((f) => f.relativePath === "huge.txt")!,
      ),
    ).toBeNull();
  });
});
describe("persistent scanner and decisions", () => {
  it("avoids content reads on unchanged scans and retries failed parsing", async () => {
    await seed();
    const reads = vi.spyOn(traversal, "readBounded");
    await sweep();
    expect(reads).toHaveBeenCalledTimes(1);
    reads.mockClear();
    await sweep();
    expect(reads).not.toHaveBeenCalled();
    await writeFile(path.join(root.path, "broken.xlsx"), "Not a workbook");
    const result = await sweep();
    expect(result.warnings.length).toBeGreaterThan(0);
    reads.mockClear();
    await sweep();
    expect(reads).toHaveBeenCalledTimes(1);
  });
  it("cancellation retains previous availability and snapshots", async () => {
    await seed(); await sweep();
    const id = repo.items()[0].id;
    const scanner = new Scanner(repo, [root]);
    scanner.cancelled = true;
    const result = await scanner.run(repo.startScan(new Date().toISOString()));
    expect(result.status).toBe("cancelled");
    expect(repo.item(id)!.available).toBe(true);
    expect(repo.item(id)!.history).toHaveLength(1);
  });
  it("persists snapshots, reuses unchanged evidence and detects metadata changes and removals", async () => {
    await seed();
    await sweep();
    const item = repo.items()[0];
    expect(item.fileCount).toBe(1);
    expect(item.history[0].baseline).toBe(true);
    expect(item.score).toBe(5);
    const original = await readFile(
      path.join(root.path, "Research", "Notes", "plan.md"),
      "utf8",
    );
    await sweep();
    expect(repo.item(item.id)!.history[1].changed).toBe(0);
    const previous = repo.files(repo.latestSnapshot(item.id)!.id);
    await utimes(
      path.join(root.path, "Research", "Notes", "plan.md"),
      new Date(),
      new Date(Date.now() + 3000),
    );
    await sweep();
    expect(repo.item(item.id)!.history[2].changed).toBe(1);
    expect(
      await readFile(
        path.join(root.path, "Research", "Notes", "plan.md"),
        "utf8",
      ),
    ).toBe(original);
    expect(compareFiles(previous, previous).changed).toBe(0);
    await rm(path.join(root.path, "Research", "Notes", "plan.md"));
    await sweep();
    expect(repo.item(item.id)!.history[3].removed).toBe(1);
    repo.close();
    repo = new Repository(path.join(dir, "data", "unclosed.db"));
    expect(repo.item(item.id)!.history).toHaveLength(4);
  });
  it("preserves closed history and reopens only when files change", async () => {
    await seed();
    await sweep();
    const id = repo.items()[0].id;
    repo.setDisposition(id, "CLOSED");
    const closedAt = repo.item(id)!.closedAt;
    await sweep();
    expect(repo.item(id)!.status).toBe("CLOSED");
    await writeFile(
      path.join(root.path, "Research", "Notes", "plan.md"),
      "TODO: new change",
    );
    await sweep();
    expect(repo.item(id)!.status).toBe("OPEN");
    expect(repo.item(id)!.reopened).toBe(true);
    expect(
      repo.item(id)!.signals.find((s) => s.type === "reopened")?.weight,
    ).toBe(20);
    expect(repo.item(id)!.closedAt).toBe(closedAt);
    repo.setDisposition(id, "CLOSED");
    expect(repo.item(id)!.signals.some((s) => s.type === "reopened")).toBe(
      false,
    );
  });
  it("snoozes until expiration, ignores, and restores", async () => {
    await seed();
    await sweep();
    const id = repo.items()[0].id;
    repo.setDisposition(id, "SNOOZED", "2030-01-01T00:00:00.000Z");
    expect(repo.item(id)!.category).toBe("Snoozed");
    repo.expireSnoozes("2030-01-02T00:00:00.000Z");
    expect(repo.item(id)!.status).toBe("OPEN");
    repo.setDisposition(id, "IGNORED");
    expect(repo.item(id)!.category).toBe("Off the Radar");
    repo.setDisposition(id, "OPEN");
    expect(repo.item(id)!.status).toBe("OPEN");
  });
  it("does not promote old clean documents and keeps unknown file metadata", async () => {
    await writeFile(
      path.join(root.path, "report.pdf"),
      Buffer.from("%PDF-test"),
    );
    await utimes(path.join(root.path, "report.pdf"), new Date(0), new Date(0));
    await sweep();
    const item = repo.items()[0];
    expect(item.score).toBe(0);
    expect(item.category).toBe("Quiet");
    expect(item.fileCount).toBe(1);
  });
  it("tracks missing work items without erasing their history", async () => {
    await seed();
    await sweep();
    const id = repo.items()[0].id;
    await rm(path.join(root.path, "Research"), { recursive: true });
    await sweep();
    expect(repo.item(id)!.available).toBe(false);
    expect(repo.item(id)!.history).toHaveLength(1);
  });
  it("caps examples across the work item while keeping all counts", async () => {
    await seed();
    for (let i = 0; i < 5; i++)
      await writeFile(
        path.join(root.path, "Research", `${i}.txt`),
        "TODO\n".repeat(40),
      );
    await sweep();
    const item = repo.items()[0];
    expect(item.signals.find((s) => s.type === "markers")!.count).toBe(201);
    expect(
      item.signals.reduce((sum, s) => sum + s.examples.length, 0),
    ).toBeLessThanOrEqual(50);
    await sweep();
    expect(
      repo.item(item.id)!.signals.find((s) => s.type === "markers")!.count,
    ).toBe(201);
  });
});
describe("local API boundary", () => {
  it("rejects cross-origin and arbitrary file access; validates actions and dates", async () => {
    await seed();
    await sweep();
    const id = repo.items()[0].id;
    const app = createApp(
      repo,
      [root],
      () => false,
      () => {},
      () => false,
    );
    const host = { host: "localhost:3000" };
    expect(
      (await app.inject({ url: "/api/health", headers: host })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ url: "/api/health", headers: { host: "evil.test" } }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          url: "/api/work-items",
          headers: { ...host, origin: "https://evil.test" },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await app.inject({ url: "/api/file?path=/etc/passwd", headers: host }))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/work-items/${id}/snooze`,
          headers: host,
          payload: { until: "yesterday" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/work-items/${id}/close`,
          headers: host,
          payload: {},
        })
      ).statusCode,
    ).toBe(200);
    expect(repo.item(id)!.status).toBe("CLOSED");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/scans",
          headers: host,
          payload: {},
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/scans",
          headers: { ...host, "content-type": "text/plain" },
          payload: "{}",
        })
      ).statusCode,
    ).toBe(415);
    await app.close();
  });
});
