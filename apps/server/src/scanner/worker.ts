import { parentPort, workerData } from "node:worker_threads";
import { Repository } from "../db/repository.js";
import { Scanner } from "./scanner.js";
const repository = new Repository(workerData.database);
const scanner = new Scanner(repository, workerData.roots);
parentPort?.on("message", (message) => {
  if (message === "cancel") scanner.cancelled = true;
});
try {
  await scanner.run(workerData.progress);
} finally {
  repository.close();
  parentPort?.close();
}
