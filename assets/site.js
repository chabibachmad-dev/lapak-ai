import { demoAnswer } from "./demo-bot.js";
import { buildSystemPrompt, callAI, cleanMessages } from "./ai-client.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const get = (o, path) => path.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
};

async function loadConfig() {
  // ?preview=1 shows the unsaved draft from the Settings page (only in this browser)
  if (new URLSearchParams(location.search).has("preview")) {
    const draft = store.get("lapakai.draft");
    if (draft) { try { return JSON.parse(draft); } catch {} }
  }
  const r = await fetch("config.json", { cache: "no-store" });
  if (!r.ok) throw new Error("config.json tidak ditemukan");
  return r.json();
}

function swatch(i, accent, primary) {
  const a = [accent, primary, "#8C6A43", "#B7792E", "#5E7F63"][i % 5];
  const b = "rgba(255,255,255,.55)";
  const patterns = [
    `repeating-linear-gradient(45deg, ${a} 0 6px, ${b} 6px 8px), repeating-linear-gradient(-45deg, ${a} 0 6px, transparent 6px 8px)`,
    `repeating-linear-gradient(0deg, ${a} 0 7px, ${b} 7px 9px), repeating-linear-gradient(90deg, ${a} 0 7px, transparent 7px 9px)`,
    `radial-gradient(circle at 50% 50%, ${b} 0 2px, transparent 3px) 0 0/10px 10px, ${a}`,
    `repeating-linear-gradient(60deg, ${a} 0 5px, ${b} 5px 7px)`,
    `repeating-linear-gradient(90deg, ${a} 0 9px, ${b} 9px 11px), ${a}`,
  ];
  return patterns[i % patterns.length];
}

// basket-weave tile drawn from the accent color
function weaveSVG(hex) {
  const n = parseInt(hex.replace("#", ""), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const mix = (t, k) => `rgb(${Math.round(r + (t - r) * k)},${Math.round(g + (t - g) * k)},${Math.round(b + (t - b) * k)})`;
  const light = mix(255, .28), dark = mix(40, .32), edge = mix(30, .55);
  const slats = (x, y, horiz) => [0, 1, 2].map((k) => {
    const o = 2 + k * 15.3;
    return horiz
      ? `<rect x="${x + 1}" y="${y + o}" width="46" height="13" rx="6.5" fill="url(#h)" stroke="${edge}" stroke-width=".6"/>`
      : `<rect x="${x + o}" y="${y + 1}" width="13" height="46" rx="6.5" fill="url(#v)" stroke="${edge}" stroke-width=".6"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><defs>
    <linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${hex}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <linearGradient id="v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${hex}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
    <rect width="96" height="96" fill="${edge}"/>${slats(0, 0, true)}${slats(48, 0, false)}${slats(0, 48, false)}${slats(48, 48, true)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function render(c) {
  const b = c.business || {};
  document.title = `${b.name || "Toko"} — ${b.tagline || ""}`.replace(/ — $/, "");
  $('meta[name="description"]').setAttribute("content", c.hero?.sub || b.tagline || "");
  if (c.theme?.primary) document.documentElement.style.setProperty("--primary", c.theme.primary);
  if (c.theme?.accent) document.documentElement.style.setProperty("--accent", c.theme.accent);

  const wv = $(".weave"); if (wv) wv.style.backgroundImage = weaveSVG(c.theme?.accent || "#E0A93B");
  $$("[data-bind]").forEach((el) => { el.textContent = get(c, el.dataset.bind) ?? ""; });
  const wa = b.whatsapp ? `https://wa.me/${String(b.whatsapp).replace(/\D/g, "")}` : "#kontak";
  $$("[data-wa]").forEach((el) => (el.href = wa));
  const maps = $("[data-maps]"); if (maps) { maps.href = b.mapsUrl || "#"; maps.hidden = !b.mapsUrl; }
  const em = $("[data-email]"); if (em) { em.href = `mailto:${b.email}`; em.textContent = b.email || ""; em.closest("div").hidden = !b.email; }
  const ig = $("[data-ig]"); if (ig) { ig.href = `https://instagram.com/${b.instagram}`; ig.textContent = b.instagram ? "@" + b.instagram : ""; ig.closest("div").hidden = !b.instagram; }
  $("[data-year]").textContent = new Date().getFullYear();

  $('[data-list="highlights"]').innerHTML = (c.highlights || []).map((h) => `<div><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></div>`).join("");
  $('[data-list="products"]').innerHTML = (c.products || []).map((p, i) => `
    <li class="item">
      <div class="swatch" style="background:${swatch(i, c.theme?.accent || "#E0A93B", c.theme?.primary || "#2F5D46")}" aria-hidden="true"></div>
      <div><h3>${esc(p.name)}${p.tag ? ` <span class="tag">${esc(p.tag)}</span>` : ""}</h3><p>${esc(p.desc)}</p></div>
      <div class="price-col"><span class="price">${esc(p.price)}</span><button class="ask" type="button" data-ask="${esc(p.name)}">Tanya produk ini</button></div>
    </li>`).join("");
  $('[data-list="steps"]').innerHTML = (c.steps || []).map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("");
  $('[data-list="faq"]').innerHTML = (c.faq || []).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
  $('[data-list="hours"]').innerHTML = (b.hours || []).map((h) => `<span class="hrow"><span>${esc(h.day)}</span><span>${esc(h.time)}</span></span>`).join("");

  const first = (c.products || [])[0];
  $("[data-hero-answer]").textContent = first ? `Masih ada, Kak. ${first.name} harganya ${first.price}. Mau saya bantu pesan lewat WhatsApp?` : (c.assistant?.greeting || "Halo!");
}

/* ---------- chat ---------- */
function setupChat(c) {
  const panel = $("#chat"), log = $("[data-chat-log]"), form = $("[data-chat-form]"), input = $("#chat-input");
  const fab = $(".chat-fab"), status = $("[data-chat-status]"), sug = $("[data-chat-suggest]");
  const history = [];
  let mode = "server"; // server | browser | demo
  let busy = false;

  const add = (role, text, cls = "") => {
    const d = document.createElement("div");
    d.className = `bubble ${role === "user" ? "me" : "bot"} ${cls}`.trim();
    d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  };
  const setStatus = () => {
    status.innerHTML = mode === "demo" ? 'Online <span class="chat-mode">mode demo</span>' : mode === "browser" ? 'Online <span class="chat-mode">tes browser</span>' : "Online";
  };
  const open = (q) => {
    panel.hidden = false; fab.setAttribute("aria-expanded", "true");
    if (!log.childElementCount) add("assistant", c.assistant?.greeting || "Halo! Ada yang bisa dibantu?");
    if (q) { send(q); } else input.focus();
  };
  const close = () => { panel.hidden = true; fab.setAttribute("aria-expanded", "false"); fab.focus(); };

  $$("[data-open-chat]").forEach((b) => b.addEventListener("click", () => (panel.hidden ? open() : close())));
  $("[data-close-chat]").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-ask]"); if (a) open(`Saya mau tanya soal ${a.dataset.ask}`); });

  sug.innerHTML = (c.assistant?.suggestions || []).map((s) => `<button type="button">${esc(s)}</button>`).join("");
  sug.addEventListener("click", (e) => { if (e.target.tagName === "BUTTON") send(e.target.textContent); });

  form.addEventListener("submit", (e) => { e.preventDefault(); const q = input.value.trim(); if (q) send(q); });

  let serverOk = null; // null = not tried yet, false = no server endpoint here
  async function ask(msgs) {
    // 1) secure server endpoint (Netlify / Vercel / local server). The API key stays on the server.
    if (serverOk !== false) {
      let r = null, j = null;
      try {
        r = await fetch("api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: msgs }) });
        j = await r.json();
      } catch { r = null; }
      if (r && j && (j.reply || j.error)) {
        serverOk = true; mode = j.mode === "demo" ? "demo" : "server"; setStatus();
        if (!r.ok) throw new Error(j.error);
        return j.reply;
      }
      serverOk = false; mode = store.get("lapakai.browserKey") ? "browser" : "demo"; setStatus();
    }
    // 2) owner's browser test (key saved only in this browser from Settings)
    if (mode === "browser") {
      const t = JSON.parse(store.get("lapakai.browserKey") || "{}");
      return callAI({ ...t, system: buildSystemPrompt(c), messages: msgs, fromBrowser: true });
    }
    // 3) offline demo
    await new Promise((r) => setTimeout(r, 450));
    return demoAnswer(c, msgs[msgs.length - 1].content);
  }

  async function send(q) {
    if (busy) return; busy = true;
    input.value = ""; add("user", q); history.push({ role: "user", content: q });
    const t = add("assistant", "", "typing"); t.innerHTML = "<i></i><i></i><i></i>"; t.setAttribute("aria-label", "Sedang mengetik");
    try {
      const reply = await ask(cleanMessages(history));
      t.remove(); add("assistant", reply); history.push({ role: "assistant", content: reply });
    } catch (err) {
      t.remove(); add("assistant", `Asisten sedang tidak bisa menjawab: ${err.message}`, "err"); history.pop();
    } finally { busy = false; input.focus(); }
  }
}

loadConfig().then((c) => { render(c); setupChat(c); }).catch((e) => {
  document.body.innerHTML = `<p style="padding:24px;font-family:sans-serif">Gagal memuat config.json (${esc(e.message)}). Jika membuka file langsung dari komputer, jalankan server lokal: <code>npm start</code>. Lihat PANDUAN.md.</p>`;
});
