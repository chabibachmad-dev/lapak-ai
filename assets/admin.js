import { PROVIDERS, resolveProvider, buildSystemPrompt, callAI } from "./ai-client.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const set = (o, p, v) => { const ks = p.split("."); let x = o; ks.slice(0, -1).forEach((k) => (x = x[k] ??= {})); x[ks.at(-1)] = v; };
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

const LISTS = {
  "business.hours": { fields: [["day", "Hari"], ["time", "Jam"]], two: true, add: "Tambah jam buka", blank: { day: "", time: "" } },
  products: { fields: [["name", "Nama produk"], ["price", "Harga", "Rp100.000"], ["desc", "Keterangan", "", true], ["tag", "Label kecil (opsional)", "Terlaris / Baru"]], add: "Tambah produk", blank: { name: "", price: "", desc: "", tag: "" } },
  highlights: { fields: [["title", "Judul"], ["text", "Penjelasan", "", true]], add: "Tambah keunggulan", blank: { title: "", text: "" } },
  steps: { fields: [["title", "Langkah"], ["text", "Penjelasan", "", true]], add: "Tambah langkah", blank: { title: "", text: "" } },
  faq: { fields: [["q", "Pertanyaan"], ["a", "Jawaban", "", true]], add: "Tambah tanya jawab", blank: { q: "", a: "" } },
};

let cfg = {};
const toast = (t) => { const el = $("[data-toast]"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2600); };
const saveDraft = () => store.set("lapakai.draft", JSON.stringify(cfg));

/* ---------- simple fields ---------- */
function fillFields() {
  $$("[data-f]").forEach((el) => {
    const v = get(cfg, el.dataset.f);
    el.value = el.hasAttribute("data-lines") ? (v || []).join("\n") : v ?? (el.type === "color" ? "#000000" : "");
  });
  $$("[data-out]").forEach((o) => (o.textContent = get(cfg, o.dataset.out) || ""));
}
document.addEventListener("input", (e) => {
  const el = e.target.closest("[data-f]");
  if (!el) return;
  set(cfg, el.dataset.f, el.hasAttribute("data-lines") ? el.value.split("\n").map((s) => s.trim()).filter(Boolean) : el.value);
  const out = $(`[data-out="${el.dataset.f}"]`); if (out) out.textContent = el.value;
  saveDraft();
});

/* ---------- repeatable rows ---------- */
function renderRows(key) {
  const spec = LISTS[key], box = $(`[data-rows="${key}"]`), list = get(cfg, key) || [];
  box.innerHTML = list.map((item, i) => `
    <div class="row" data-i="${i}">
      <div class="row-fields ${spec.two ? "two" : ""}">
        ${spec.fields.map(([f, label, ph = "", long]) => `<label>${esc(label)}${long
          ? `<textarea rows="2" data-k="${f}" placeholder="${esc(ph)}">${esc(item[f])}</textarea>`
          : `<input data-k="${f}" value="${esc(item[f])}" placeholder="${esc(ph)}">`}</label>`).join("")}
      </div>
      <div class="row-tools">
        <button type="button" data-move="-1" aria-label="Pindah ke atas" title="Pindah ke atas">↑</button>
        <button type="button" data-move="1" aria-label="Pindah ke bawah" title="Pindah ke bawah">↓</button>
        <button type="button" class="del" data-del aria-label="Hapus" title="Hapus">✕</button>
      </div>
    </div>`).join("") + `<button type="button" class="add" data-add>+ ${esc(spec.add)}</button>`;
}
document.addEventListener("input", (e) => {
  const k = e.target.dataset.k; if (!k) return;
  const box = e.target.closest("[data-rows]"), i = +e.target.closest(".row").dataset.i;
  get(cfg, box.dataset.rows)[i][k] = e.target.value; saveDraft();
});
document.addEventListener("click", (e) => {
  const box = e.target.closest("[data-rows]"); if (!box) return;
  const key = box.dataset.rows; let list = get(cfg, key);
  if (!list) { list = []; set(cfg, key, list); }
  if (e.target.matches("[data-add]")) { list.push({ ...LISTS[key].blank }); renderRows(key); $(`[data-rows="${key}"] .row:last-of-type input, [data-rows="${key}"] .row:last-of-type textarea`)?.focus(); }
  const row = e.target.closest(".row"); if (!row) return saveDraft();
  const i = +row.dataset.i;
  if (e.target.matches("[data-del]")) { list.splice(i, 1); renderRows(key); }
  if (e.target.dataset.move) { const j = i + +e.target.dataset.move; if (j >= 0 && j < list.length) { [list[i], list[j]] = [list[j], list[i]]; renderRows(key); } }
  saveDraft();
});

/* ---------- AI provider ---------- */
const ai = JSON.parse(store.get("lapakai.aiForm") || '{"provider":"openai","model":"","baseUrl":""}');
function renderAI() {
  const sel = $('[data-ai="provider"]');
  sel.innerHTML = Object.entries(PROVIDERS).map(([id, p]) => `<option value="${id}">${esc(p.label)}</option>`).join("");
  sel.value = ai.provider; $('[data-ai="model"]').value = ai.model || ""; $('[data-ai="baseUrl"]').value = ai.baseUrl || "";
  updateAI();
}
function updateAI() {
  const p = PROVIDERS[ai.provider] || PROVIDERS.custom;
  $("[data-model-hint]").textContent = p.model ? `bawaan: ${p.model}` : "wajib diisi";
  $("[data-baseurl-wrap]").hidden = ai.provider !== "custom";
  const lines = [`AI_PROVIDER=${ai.provider}`, "AI_API_KEY=<tempel API key di hosting, bukan di sini>"];
  if (ai.model) lines.push(`AI_MODEL=${ai.model}`);
  if (ai.provider === "custom") lines.push(`AI_BASE_URL=${ai.baseUrl || "https://…/v1"}`);
  $("[data-env]").textContent = lines.join("\n");
  store.set("lapakai.aiForm", JSON.stringify({ provider: ai.provider, model: ai.model, baseUrl: ai.baseUrl }));
}
$$("[data-ai]").forEach((el) => el.addEventListener("input", () => { if (el.dataset.ai !== "apiKey") { ai[el.dataset.ai] = el.value.trim(); updateAI(); } }));
$("[data-copy-env]").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("[data-env]").textContent); toast("Disalin."); } catch { toast("Tidak bisa menyalin. Blok teksnya lalu salin manual."); } });

function aiParams() { return { provider: ai.provider, model: ai.model, baseUrl: ai.baseUrl, apiKey: $('[data-ai="apiKey"]').value.trim() }; }
$("[data-test]").addEventListener("click", async () => {
  const out = $("[data-test-result]"); out.className = "a-result"; out.textContent = "Menghubungi provider…";
  try {
    const reply = await callAI({ ...aiParams(), system: buildSystemPrompt(cfg), messages: [{ role: "user", content: "Halo, produk apa saja yang dijual?" }], maxTokens: 200, fromBrowser: true });
    out.classList.add("ok"); out.textContent = `Berhasil. Contoh jawaban asisten:\n${reply}`;
  } catch (err) {
    out.classList.add("bad");
    out.textContent = /Failed to fetch|NetworkError|CORS/i.test(err.message)
      ? "Provider ini menolak akses langsung dari browser. Ini normal untuk sebagian provider. Pasang key di Environment variables hosting, lalu tes dari situs online."
      : `Gagal: ${err.message}`;
  }
});
$("[data-save-key]").addEventListener("click", () => {
  const p = aiParams(); if (!p.apiKey) return toast("Isi API key dulu.");
  store.set("lapakai.browserKey", JSON.stringify(p)); toast("Chat di browser ini sekarang memakai key Anda (hanya untuk tes).");
});
$("[data-clear-key]").addEventListener("click", () => { store.del("lapakai.browserKey"); $('[data-ai="apiKey"]').value = ""; toast("Key dihapus dari browser ini."); });
const savedKey = JSON.parse(store.get("lapakai.browserKey") || "null"); if (savedKey?.apiKey) $('[data-ai="apiKey"]').value = savedKey.apiKey;

/* ---------- actions ---------- */
$("[data-download]").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(cfg, null, 2) + "\n"], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "config.json" });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("config.json diunduh. Ganti file lama di folder situs Anda.");
});
$("[data-preview]").addEventListener("click", () => { saveDraft(); window.open("index.html?preview=1", "_blank"); });
$("[data-import]").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { cfg = JSON.parse(await f.text()); boot(); saveDraft(); toast("config.json dimuat."); }
  catch { toast("File tidak valid. Pilih file config.json."); }
  e.target.value = "";
});

$("[data-reset]").addEventListener("click", async () => {
  if (!confirm("Buang semua perubahan yang belum diunduh dan muat ulang config.json dari situs?")) return;
  store.del("lapakai.draft");
  try { cfg = await (await fetch("config.json", { cache: "no-store" })).json(); boot(); toast("Perubahan dibuang."); }
  catch { toast("config.json tidak terbaca."); }
});

function boot() { fillFields(); Object.keys(LISTS).forEach(renderRows); }
(async () => {
  const draft = store.get("lapakai.draft");
  try { cfg = draft ? JSON.parse(draft) : await (await fetch("config.json", { cache: "no-store" })).json(); }
  catch { cfg = {}; toast("config.json tidak terbaca. Gunakan tombol Muat config.json."); }
  boot(); renderAI();
  if (draft) toast("Melanjutkan perubahan terakhir yang belum diunduh.");
})();
