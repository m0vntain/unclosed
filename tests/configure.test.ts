import { execFileSync } from "node:child_process";
import { describe, it, expect } from "vitest";

const config = (...folders: string[]) => JSON.parse(execFileSync(process.execPath, ["scripts/configure.mjs", "/workspace/unclosed", ...folders], { encoding: "utf8" }));
describe("Docker mount configuration", () => {
  it("escapes Compose interpolation and keeps all scan mounts read-only", () => {
    const result = config("/home/me/work $budget", "/home/me/Research");
    const service = result.services.unclosed;
    expect(service.volumes).toHaveLength(3);
    expect(service.volumes[1].source).toBe("/home/me/work $$budget");
    expect(service.volumes.slice(1).every((mount: {read_only:boolean}) => mount.read_only)).toBe(true);
    expect(service.ports).toEqual(["127.0.0.1:3000:3000"]);
    expect(service.read_only).toBe(true);
  });
  it("preserves identities when mount order or Windows separators change", () => {
    const a = JSON.parse(config("C:\\Users\\me\\Docs", "D:\\Work").services.unclosed.environment.UNCLOSED_LOCATIONS);
    const b = JSON.parse(config("D:/Work", "C:/Users/me/Docs").services.unclosed.environment.UNCLOSED_LOCATIONS);
    expect(a["folder-1"].identity).toBe(b["folder-2"].identity);
    expect(a["folder-2"].identity).toBe(b["folder-1"].identity);
  });
});
