// LapakAI — local server for testing on your own computer.
// Run: npm start   (then open http://localhost:3000)
// Reads settings from a .env file next to this one (copy .env.example to .env).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleChat } from "./lib/core.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
if (existsSync(join(ROOT, ".env"))) {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const PORT = process.env.PORT || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon" };
const PUBLIC = /^\/(index\.html|admin\.html|config\.json|assets\/[\w.-]+)$/;

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/chat" && req.method === "POST") {
    let raw = ""; for await (const ch of req) { raw += ch; if (raw.length > 50_000) break; }
    let body = {}; try { body = JSON.parse(raw || "{}"); } catch {}
    const { status, json } = await handleChat({
      body, ip: req.socket.remoteAddress, origin: url.origin,
      loadLocalConfig: async () => JSON.parse(await readFile(join(ROOT, "config.json"), "utf8")),
    });
    res.writeHead(status, { "content-type": "application/json" }); return res.end(JSON.stringify(json));
  }
  let path = url.pathname === "/" ? "/index.html" : url.pathname;
  if (!PUBLIC.test(path)) { res.writeHead(404); return res.end("Not found"); }
  try {
    const file = await readFile(join(ROOT, normalize(path)));
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" }); res.end(file);
  } catch { res.writeHead(404); res.end("Not found"); }
}).listen(PORT, () => {
  const mode = process.env.AI_API_KEY ? `AI aktif (${process.env.AI_PROVIDER || "openai"})` : "mode demo (AI_API_KEY belum diisi)";
  console.log(`LapakAI berjalan di http://localhost:${PORT} — ${mode}`);
});
