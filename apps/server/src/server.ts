import { Worker } from "node:worker_threads";
import { Repository } from "./db/repository.js";
import { getRoots } from "./config.js";
import { createApp } from "./api/app.js";

const repository = new Repository("/data/unclosed.db");
const roots = await getRoots();
let worker: Worker | null = null;
const interrupted = repository.latestScan();
if (interrupted.status === "running")
  repository.saveProgress({
    ...interrupted,
    status: "failed",
    completedAt: new Date().toISOString(),
    error: "The previous sweep was interrupted. Start a new sweep to continue.",
  });
function startScan() {
  if (worker) return false;
  const progress = repository.startScan(new Date().toISOString());
  worker = new Worker(new URL("./scanner/worker.js", import.meta.url), {
    workerData: { database: repository.filename, roots, progress },
    resourceLimits: { maxOldGenerationSizeMb: 512 },
  });
  worker.on("error", () => {
    const latest = repository.latestScan();
    repository.saveProgress({
      ...latest,
      status: "failed",
      completedAt: new Date().toISOString(),
      error:
        "The sweep stopped unexpectedly. Completed snapshots are safe; try another sweep.",
    });
  });
  worker.on("exit", () => {
    worker = null;
  });
  return true;
}
const app = createApp(
  repository,
  roots,
  startScan,
  () => worker?.postMessage("cancel"),
  () => !!worker,
  true,
);
await app.listen({ host: "0.0.0.0", port: 3000 });
for (const event of ["SIGINT", "SIGTERM"])
  process.on(event, async () => {
    if (worker) await worker.terminate();
    await app.close();
    repository.close();
    process.exit(0);
  });
