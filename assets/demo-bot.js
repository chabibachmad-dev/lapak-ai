// LapakAI — demo assistant (no API key needed).
// Answers from the business data in config.json using simple keyword matching.
// Used by the server when no AI key is set, and by the browser as an offline fallback.

const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ");
const words = (s) => norm(s).split(/\s+/).filter((w) => w.length > 2);
// light Indonesian stemming so "bayarnya" matches "pembayaran"
const stem = (w) => {
  let x = w.replace(/(nya|kah|lah|pun)$/, "");
  x = x.replace(/^(peng|peny|pem|pen|per|pe|meng|meny|mem|men|me|ber|di|ter|ke)(?=\w{3,})/, "");
  x = x.replace(/(kan|an|i)$/, (m) => (x.length - m.length >= 4 ? "" : m));
  return x;
};
const stems = (s) => words(s).map(stem);

const STOP = new Set(["apa", "apakah", "yang", "dan", "atau", "ini", "itu", "ada", "bisa", "untuk", "dengan", "saya", "kak", "kakak", "min", "mau", "tanya", "berapa", "gimana", "bagaimana", "the", "and", "can", "you", "what", "how", "your", "for", "kah", "dong", "nya", "juga", "kalau", "kapan"]);

const INTENTS = [
  { id: "products", keys: ["produk", "jual", "barang", "katalog", "list", "daftar", "harga", "price", "product", "menu", "stok", "ready"] },
  { id: "hours", keys: ["jam", "buka", "tutup", "open", "hours", "operasional", "libur", "minggu", "sabtu"] },
  { id: "location", keys: ["alamat", "lokasi", "dimana", "mana", "toko", "address", "location", "maps", "peta"] },
  { id: "order", keys: ["pesan", "order", "beli", "checkout", "whatsapp", "kontak", "hubungi", "admin", "nomor", "buy"] },
  { id: "shipping", keys: ["kirim", "ongkir", "ekspedisi", "kurir", "pengiriman", "shipping", "jne", "sampai"] },
];

function fmtList(items) {
  return items.map((t) => `• ${t}`).join("\n");
}

export function demoAnswer(config, message) {
  const c = config || {};
  const b = c.business || {};
  const msgWords = words(message).filter((w) => !STOP.has(w));
  const msgStems = msgWords.map(stem);
  if (/^(halo\w*|hai|hi|hello|selamat|pagi|siang|sore|malam|assalam\w*|salam|permisi|p)\b/.test(norm(message).trim()) && msgWords.length <= 3) {
    return c.assistant?.greeting || `Halo! Ada yang bisa dibantu soal ${b.name || "toko kami"}?`;
  }
  const text = norm(message);
  const wa = b.whatsapp ? ` Hubungi WhatsApp ${b.whatsapp}.` : "";

  // 1) best FAQ match
  let best = null, bestScore = 0;
  for (const f of c.faq || []) {
    const fw = new Set(stems(f.q + " " + f.a).filter((w) => !STOP.has(w)));
    const qw = new Set(stems(f.q));
    let score = 0;
    for (const w of msgStems) if (fw.has(w)) score += qw.has(w) ? 2 : 1;
    if (score > bestScore) { bestScore = score; best = f; }
  }

  // 2) product by name
  for (const p of c.products || []) {
    const pw = words(p.name).filter((w) => !STOP.has(w));
    const hit = pw.filter((w) => msgWords.includes(w)).length;
    if (hit && hit >= Math.min(2, pw.length)) {
      return `${p.name}: ${p.price}. ${p.desc || ""}`.trim() + (b.whatsapp ? ` Untuk memesan, hubungi WhatsApp ${b.whatsapp}.` : "");
    }
  }

  // 3) intents
  const all = new Set(words(message));
  const hasKey = (k) => all.has(k) || [...all].some((w) => w.length > 4 && w.startsWith(k) && k.length > 3);
  const intent = INTENTS.map((i) => ({ id: i.id, s: i.keys.filter(hasKey).length }))
    .sort((a, z) => z.s - a.s)[0];

  if (bestScore >= 3) return best.a;
  if (intent && intent.s > 0) {
    switch (intent.id) {
      case "products":
        return `Produk kami:\n${fmtList((c.products || []).map((p) => `${p.name} — ${p.price}`))}\nMau tahu detail yang mana?`;
      case "hours":
        return `Jam buka ${b.name || "kami"}:\n${fmtList((b.hours || []).map((h) => `${h.day}: ${h.time}`))}`;
      case "location":
        return `Alamat kami: ${b.address || b.city || "-"}.${b.mapsUrl ? ` Peta: ${b.mapsUrl}` : ""}`;
      case "order":
        return `Untuk memesan, kirim nama produk dan alamat lengkap ke WhatsApp ${b.whatsapp || "toko"}. Kami bantu hitung ongkirnya.`;
      case "shipping":
        return b.shipping || `Info pengiriman bisa ditanyakan langsung ke WhatsApp ${b.whatsapp || "toko"}.`;
    }
  }
  if (bestScore >= 1) return best.a;
  return `Maaf, saya belum punya info soal itu.${wa || " Silakan hubungi toko langsung."}`;
}
