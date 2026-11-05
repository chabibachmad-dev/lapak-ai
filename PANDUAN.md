# LapakAI — Panduan Pemakaian

Template landing page untuk usaha kecil, lengkap dengan **asisten AI** yang menjawab pertanyaan pengunjung (produk, harga, jam buka, pengiriman). Anda memakai **API key AI milik sendiri**, jadi tidak ada biaya langganan tambahan dari template ini.

---

## Isi folder

| File / folder | Fungsi |
|---|---|
| `index.html` | Halaman utama situs |
| `admin.html` | Halaman **Settings** untuk mengubah semua isi situs |
| `config.json` | Semua isi situs (nama usaha, produk, FAQ, warna). **Tidak berisi API key.** |
| `assets/` | Tampilan, widget chat, dan logika asisten |
| `api/chat.js` | Fungsi server untuk **Vercel** |
| `netlify/functions/chat.mjs` | Fungsi server untuk **Netlify** |
| `lib/core.mjs` | Logika server bersama (dipakai keduanya) |
| `server.mjs` | Server untuk tes di komputer sendiri |
| `.env.example` | Contoh pengaturan AI |

---

## Tiga mode asisten

1. **Mode demo** (tanpa API key). Asisten menjawab dari bagian *Tanya jawab*, *Produk*, *Jam buka*, dan *Info pengiriman* dengan pencocokan kata kunci. Langsung jalan tanpa biaya.
2. **Mode AI** (API key di hosting). Asisten memakai AI sungguhan (OpenAI, Gemini, Claude, OpenRouter, Groq, DeepSeek, atau API lain yang kompatibel OpenAI). API key disimpan aman di server hosting dan tidak pernah terlihat oleh pengunjung.
3. **Tes browser** (hanya untuk Anda). Di Settings, Anda bisa menyimpan key di browser sendiri untuk mencoba. Pengunjung lain tetap memakai mode demo atau mode AI.

> **Penting:** jangan pernah menulis API key di `config.json`, `index.html`, atau file lain di folder situs. Siapa pun bisa membaca file-file itu.

---

## Langkah 1 — Ubah isi situs

1. Buka `admin.html` (lihat cara menjalankan di Langkah 2, atau langsung di situs online: `namasitus.com/admin.html`).
2. Ubah info usaha, warna, produk, keunggulan, cara pesan, tanya jawab, dan pengaturan asisten.
3. Klik **Pratinjau** untuk melihat hasilnya di tab baru. Perubahan otomatis tersimpan sementara di browser Anda.
4. Klik **Unduh config.json**, lalu **ganti file `config.json` lama** di folder situs dengan file yang baru diunduh.
5. Unggah ulang situs (lihat Langkah 3). Selesai.

**Tips:** makin lengkap bagian *Tanya jawab*, makin tepat jawaban asisten, baik di mode demo maupun mode AI.

---

## Langkah 2 — Tes di komputer sendiri (opsional)

Butuh [Node.js](https://nodejs.org) versi 18 atau lebih baru.

```
cd lapak-ai
npm start
```

Buka `http://localhost:3000` untuk situs dan `http://localhost:3000/admin.html` untuk Settings.

Untuk mencoba mode AI di komputer: salin `.env.example` menjadi `.env`, isi `AI_PROVIDER` dan `AI_API_KEY`, lalu jalankan ulang `npm start`.

> Membuka `index.html` dengan klik dua kali (alamat `file://`) tidak akan jalan karena browser memblokir pembacaan `config.json`. Gunakan `npm start` atau hosting.

---

## Langkah 3 — Online-kan situs

Pilih **salah satu**: Netlify atau Vercel. Keduanya punya paket gratis.

### Opsi A — Netlify

1. Buat akun di [netlify.com](https://www.netlify.com).
2. Unggah folder `lapak-ai` ke repository GitHub baru (bisa lewat tombol *Add file → Upload files* di github.com, tidak perlu Git).
3. Di Netlify: **Add new site → Import an existing project → GitHub**, pilih repository tadi. Biarkan pengaturan build bawaan (file `netlify.toml` sudah mengaturnya), lalu klik **Deploy**.
4. Untuk mode AI: buka **Site configuration → Environment variables → Add a variable**, isi variabel dari Settings bagian *Provider AI* (`AI_PROVIDER`, `AI_API_KEY`, dan bila perlu `AI_MODEL`).
5. Buka **Deploys → Trigger deploy → Deploy site** supaya variabel baru terbaca.

> Fitur *Netlify Drop* (seret folder ke browser) hanya mengunggah file statis. Situs tetap tampil dan chat berjalan dalam mode demo, tetapi mode AI butuh cara impor dari GitHub di atas.

### Opsi B — Vercel

1. Buat akun di [vercel.com](https://vercel.com).
2. Unggah folder `lapak-ai` ke repository GitHub baru.
3. Di Vercel: **Add New → Project**, pilih repository tadi. *Framework preset*: **Other**. Klik **Deploy**.
4. Untuk mode AI: **Project → Settings → Environment Variables**, tambahkan `AI_PROVIDER`, `AI_API_KEY`, dan bila perlu `AI_MODEL`.
5. Buka **Deployments**, klik titik tiga pada deploy terakhir → **Redeploy**.

### Setelah online

- Buka situs dan klik tombol chat. Jika label **mode demo** di kepala chat sudah hilang, mode AI aktif.
- Mengubah isi berikutnya cukup: Settings → Unduh config.json → ganti file di GitHub → hosting otomatis deploy ulang.

---

## Pilihan provider AI

| Provider | Nilai `AI_PROVIDER` | Tempat membuat API key |
|---|---|---|
| OpenAI | `openai` | platform.openai.com |
| Google Gemini | `gemini` | aistudio.google.com |
| Anthropic (Claude) | `anthropic` | console.anthropic.com |
| OpenRouter | `openrouter` | openrouter.ai |
| Groq | `groq` | console.groq.com |
| DeepSeek | `deepseek` | platform.deepseek.com |
| Lainnya (kompatibel OpenAI, termasuk Ollama) | `custom` + `AI_BASE_URL` | sesuai layanan |

Setiap provider punya model bawaan di template. Nama model berubah dari waktu ke waktu, jadi jika muncul error "model not found", isi `AI_MODEL` dengan nama model terbaru dari dokumentasi provider Anda.

Biaya AI dibayar langsung ke provider sesuai pemakaian. Pasang batas pengeluaran (*spending limit*) di dasbor provider supaya aman.

---

## Pengaturan keamanan & biaya

| Variabel | Bawaan | Fungsi |
|---|---|---|
| `CHAT_LIMIT_PER_HOUR` | `30` | Batas pertanyaan per pengunjung per jam |
| `AI_MAX_TOKENS` | `500` | Panjang jawaban maksimal |

Asisten diinstruksikan hanya menjawab seputar usaha Anda dan tidak mengarang harga atau stok. Riwayat chat yang dikirim ke AI dibatasi 12 pesan terakhir, masing-masing maksimal 600 karakter.

**Halaman Settings (`admin.html`)** tidak bisa mengubah situs online. Halaman ini hanya membantu membuat `config.json` di browser Anda. Jika tidak ingin halaman ini bisa dibuka orang lain, hapus atau ganti namanya (misalnya `atur-rahasia-123.html`) sebelum diunggah.

---

## Mengganti tampilan lebih jauh

- **Warna utama dan aksen**: lewat Settings → Tampilan. Pola anyaman di bagian atas otomatis mengikuti warna aksen.
- **Font, jarak, dan detail lain**: ubah `assets/style.css`. Semua warna dasar ada di bagian `:root` di awal file.
- **Teks menu dan label tetap** (misalnya "Cara pesan"): ubah langsung di `index.html`.

---

## Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| Halaman putih bertuliskan "Gagal memuat config.json" | File dibuka langsung dari komputer. Jalankan `npm start` atau unggah ke hosting. Bisa juga karena format `config.json` rusak; buat ulang lewat Settings. |
| Chat selalu "mode demo" padahal key sudah diisi | Variabel belum terbaca. Deploy ulang situs setelah menambah variabel. Pastikan namanya persis `AI_API_KEY`. |
| "Asisten sedang gangguan" | API key salah, saldo provider habis, atau nama model tidak tersedia. Cek log fungsi di dasbor hosting. |
| "Terlalu banyak pertanyaan" | Batas `CHAT_LIMIT_PER_HOUR` tercapai. Naikkan nilainya jika perlu. |
| Tes di Settings gagal tapi di hosting berhasil | Normal. Sebagian provider menolak akses langsung dari browser. |
