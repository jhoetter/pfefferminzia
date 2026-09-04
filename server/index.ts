import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { dispatchDueReplies, syncAgentMail } from "./agentmail";
import { ensureSeedData } from "./seed";
import { importFalkDataset } from "./upstream";
import { ensureWorkshopClaims } from "./claims";
import { ensureWorkshopFixtures } from "./workshop";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 3004);
const host = process.env.HOST || "127.0.0.1";

const upstream = importFalkDataset();
ensureSeedData();
ensureWorkshopClaims();
ensureWorkshopFixtures();
console.log(`Falk dataset: ${upstream.imported ? "imported" : "ready"} · ${upstream.tables} tables · ${upstream.rows} rows`);
const app = createApp();

if (process.env.NODE_ENV === "production") {
  const dist = path.join(root, "dist");
  if (!existsSync(dist)) throw new Error("dist/ is missing; run npm run build first");
  app.use((await import("express")).default.static(dist));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

app.listen(port, host, () => {
  console.log(`Pfefferminzia running at http://${host}:${port}`);
  console.log(`Automatic scheduled send: ${process.env.AUTO_SEND_ENABLED === "true" ? "enabled" : "disabled"}`);
});

if (process.env.AGENTMAIL_API_KEY) {
  const pollSeconds = Math.max(15, Number(process.env.AGENTMAIL_POLL_SECONDS || 30));
  const poll = () => void syncAgentMail().catch((error) => console.error("AgentMail background sync failed:", error));
  const poller = setInterval(poll, pollSeconds * 1_000);
  poller.unref();
  poll();
  console.log(`AgentMail background sync: every ${pollSeconds}s`);
}

if (process.env.AUTO_SEND_ENABLED === "true") {
  const worker = setInterval(() => void dispatchDueReplies().catch(console.error), 60_000);
  worker.unref();
  void dispatchDueReplies().catch(console.error);
}
