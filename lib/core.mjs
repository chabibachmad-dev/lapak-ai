// LapakAI — server-side chat handler shared by Netlify, Vercel and the local server.
// The API key is read from environment variables and never sent to the browser.
import { buildSystemPrompt, callAI, cleanMessages } from "../assets/ai-client.js";
import { demoAnswer } from "../assets/demo-bot.js";

const env = (k, d = "") => (typeof process !== "undefined" && process.env[k]) || d;

/* --- simple per-IP limit (best effort; resets when the function restarts) --- */
const hits = new Map();
function limited(ip) {
  const max = parseInt(env("CHAT_LIMIT_PER_HOUR", "30"), 10);
  const now = Date.now(), hour = 3600_000;
  const list = (hits.get(ip) || []).filter((t) => now - t < hour);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

/* --- config.json is fetched from the site itself and cached for 60 s --- */
let cache = { at: 0, origin: "", data: null };
async function getConfig(origin, loadLocal) {
  if (loadLocal) return loadLocal();
  if (cache.data && cache.origin === origin && Date.now() - cache.at < 60_000) return cache.data;
  const r = await fetch(`${origin}/config.json`, { headers: { "cache-control": "no-cache" } });
  if (!r.ok) throw new Error("config.json tidak bisa dibaca dari situs");
  cache = { at: Date.now(), origin, data: await r.json() };
  return cache.data;
}

export async function handleChat({ body, ip = "unknown", origin, loadLocalConfig }) {
  try {
    if (limited(ip)) return { status: 429, json: { error: "Terlalu banyak pertanyaan. Coba lagi beberapa saat lagi, atau hubungi WhatsApp." } };
    const messages = cleanMessages(body?.messages);
    if (!messages.length) return { status: 400, json: { error: "Pertanyaan kosong." } };
    const config = await getConfig(origin, loadLocalConfig);

    const apiKey = env("AI_API_KEY");
    if (!apiKey) {
      return { status: 200, json: { reply: demoAnswer(config, messages[messages.length - 1].content), mode: "demo" } };
    }
    const reply = await callAI({
      provider: env("AI_PROVIDER", "openai"),
      baseUrl: env("AI_BASE_URL"),
      model: env("AI_MODEL"),
      apiKey,
      system: buildSystemPrompt(config),
      messages,
      maxTokens: parseInt(env("AI_MAX_TOKENS", "500"), 10),
      signal: AbortSignal.timeout(25_000),
    });
    return { status: 200, json: { reply: reply || "Maaf, coba ulangi pertanyaannya.", mode: "ai" } };
  } catch (err) {
    console.error("[LapakAI]", err?.message || err);
    const msg = /timeout|abort/i.test(String(err?.name) + err?.message) ? "Provider AI terlalu lama merespons." : "Asisten sedang gangguan. Silakan hubungi WhatsApp.";
    return { status: 502, json: { error: msg } };
  }
}
