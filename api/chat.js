// Vercel Serverless Function — available at /api/chat
import { handleChat } from "../lib/core.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan POST." });
  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { status, json } = await handleChat({ body, ip, origin });
  res.status(status).json(json);
}
