// Runs inside the built image; no Node installation is needed on the host.
import { createHash } from "node:crypto";
const [project, ...folders] = process.argv.slice(2);
const escapeCompose = (value) => value.replaceAll("$", () => "$$");
const locations = {};
const volumes = [{ type: "volume", source: "unclosed-data", target: "/data" }];
for (const [index, folder] of folders.entries()) {
  const slot = `folder-${index + 1}`;
  const parts = folder.replaceAll("\\", "/").split("/").filter(Boolean);
  locations[slot] = {
    label: parts.at(-1) || "Local folder",
    identity: createHash("sha256").update(folder.replaceAll("\\", "/")).digest("hex").slice(0, 24),
  };
  volumes.push({
    type: "bind",
    source: escapeCompose(folder),
    target: `/scan/${slot}`,
    read_only: true,
    bind: { create_host_path: false },
  });
}
process.stdout.write(
  JSON.stringify(
    {
      services: {
        unclosed: {
          build: { context: escapeCompose(project) },
          image: "unclosed:local",
          init: true,
          ports: ["127.0.0.1:3000:3000"],
          read_only: true,
          cap_drop: ["ALL"],
          security_opt: ["no-new-privileges:true"],
          environment: {
            UNCLOSED_LOCATIONS: escapeCompose(JSON.stringify(locations)),
          },
          volumes,
        },
      },
      volumes: { "unclosed-data": {} },
    },
    null,
    2,
  ),
);
