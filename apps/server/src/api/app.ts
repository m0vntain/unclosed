import Fastify, { LogController } from "fastify";
import { existsSync, readdirSync, createReadStream } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Repository } from "../db/repository.js";
import type { Root } from "../../../../shared/types.js";

export function createApp(
  repository: Repository,
  roots: Root[],
  startScan: () => boolean,
  cancelScan: () => void,
  isScanning: () => boolean,
  logger = false,
) {
  const app = Fastify({
    logger,
    bodyLimit: 4096,
    logController: new LogController({ disableRequestLogging: true }),
  });
  app.addHook("onRequest", async (request, reply) => {
    const host = request.headers.host;
    if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host))
      return reply
        .code(403)
        .send({ error: "Use localhost to access Unclosed." });
    const origin = request.headers.origin;
    if (
      origin &&
      !/^http:\/\/(localhost|127\.0\.0\.1)(:3000|:5173)?$/.test(origin)
    )
      return reply
        .code(403)
        .send({ error: "Cross-origin requests are not allowed." });
    if (request.headers["sec-fetch-site"] === "cross-site")
      return reply
        .code(403)
        .send({ error: "Cross-site requests are not allowed." });
    if (
      request.method === "POST" &&
      request.headers["content-type"]?.split(";")[0] !== "application/json"
    )
      return reply.code(415).send({ error: "Send application/json." });
  });
  app.addHook("onSend", async (_request, reply) => {
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Cache-Control", "no-store");
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError)
      return reply
        .code(400)
        .send({ error: "Please supply a valid future snooze date." });
    const status =
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    return reply
      .code(status)
      .send({
        error:
          status < 500
            ? "Invalid request."
            : "The request could not be completed.",
      });
  });
  const settings = () => ({
    roots,
    processing: "Local only",
    fileAccess: "Read only",
    database: "/data/unclosed.db",
    contentLimitMB: 2,
  });
  app.get("/api/health", async () => ({ status: "ok" }));
  app.get("/api/config", async () => settings());
  app.get("/api/settings", async () => settings());
  app.get("/api/scans/current", async () => repository.latestScan());
  app.get("/api/scans/latest", async () => repository.latestScan());
  app.post("/api/scans", async (_request, reply) => {
    if (!startScan())
      return reply.code(409).send({ error: "A sweep is already running." });
    return reply.code(202).send(repository.latestScan());
  });
  app.post("/api/scans/cancel", async (_request, reply) => {
    cancelScan();
    return reply.code(202).send({ status: "cancelling" });
  });
  app.get("/api/work-items", async () =>
    repository.items(roots.map((root) => root.id)),
  );
  app.get<{ Params: { id: string } }>(
    "/api/work-items/:id",
    async (request, reply) => {
      repository.expireSnoozes();
      const item = repository.item(request.params.id, true);
      if (!item || !roots.some((root) => root.id === item.scanRoot))
        return reply.code(404).send({ error: "Work item not found." });
      const history = repository.db
        .prepare(
          "SELECT status,created_at AS at,snoozed_until AS snoozedUntil FROM disposition_history WHERE work_item_id=? ORDER BY id DESC",
        )
        .all(item.id);
      return { ...item, dispositionHistory: history };
    },
  );
  for (const action of [
    "close",
    "reopen",
    "snooze",
    "take-off-radar",
    "restore",
  ] as const) {
    app.post<{ Params: { id: string } }>(
      `/api/work-items/:id/${action}`,
      async (request, reply) => {
        // Keep dispositions and closed-snapshot comparison atomic relative to a sweep.
        if (isScanning())
          return reply
            .code(409)
            .send({
              error:
                "Please wait for this sweep to finish before changing an item.",
            });
        const item = repository.item(request.params.id);
        if (!item || !roots.some((root) => root.id === item.scanRoot))
          return reply.code(404).send({ error: "Work item not found." });
        const until =
          action === "snooze"
            ? z
                .object({
                  until: z.iso
                    .datetime()
                    .refine((value) => Date.parse(value) > Date.now()),
                })
                .parse(request.body).until
            : null;
        repository.setDisposition(
          item.id,
          action === "close"
            ? "CLOSED"
            : action === "snooze"
              ? "SNOOZED"
              : action === "take-off-radar"
                ? "IGNORED"
                : "OPEN",
          until,
        );
        return repository.item(item.id, true);
      },
    );
  }
  const web = path.resolve("dist/web");
  if (existsSync(web)) {
    // Serve an explicit build-time asset allowlist, never filesystem paths from the browser.
    const assets = new Map(
      readdirSync(path.join(web, "assets")).map((name) => [
        name,
        path.join(web, "assets", name),
      ]),
    );
    app.get<{ Params: { name: string } }>(
      "/assets/:name",
      async (request, reply) => {
        const filename = assets.get(request.params.name);
        if (!filename)
          return reply.code(404).send({ error: "Asset not found." });
        return reply
          .type(
            filename.endsWith(".css") ? "text/css" : "application/javascript",
          )
          .send(createReadStream(filename));
      },
    );
    const index = (_request: unknown, reply: import("fastify").FastifyReply) =>
      reply
        .type("text/html")
        .send(createReadStream(path.join(web, "index.html")));
    app.get("/", index);
    app.get("/work-item/:id", index);
    app.setNotFoundHandler((_request, reply) =>
      reply.code(404).send({ error: "Endpoint not found." }),
    );
  }
  return app;
}
