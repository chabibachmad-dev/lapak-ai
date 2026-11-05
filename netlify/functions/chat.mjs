// Netlify Function — available at /api/chat
import { handleChat } from "../../lib/core.mjs";

export default async (req, context) => {
  if (req.method !== "POST") return Response.json({ error: "Gunakan POST." }, { status: 405 });
  const body = await req.json().catch(() => ({}));
  const origin = new URL(req.url).origin;
  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  const { status, json } = await handleChat({ body, ip, origin });
  return Response.json(json, { status });
};

export const config = { path: "/api/chat" };
