# LapakAI — Small business landing page with a bring-your-own-key AI assistant

A one-page website for small shops with a built-in chat assistant that answers visitor questions from your own business info (products, prices, opening hours, shipping, FAQ).

- **Settings page** (`admin.html`) to edit every text, product, FAQ and color without touching code, then download `config.json`.
- **Bring your own AI key**: OpenAI, Google Gemini, Anthropic Claude, OpenRouter, Groq, DeepSeek, or any OpenAI-compatible API (including Ollama).
- **Key stays secret**: the key lives in your hosting's environment variables and is used by a small serverless function (`/api/chat`). Visitors never see it.
- **Works without a key** in demo mode, answering from your FAQ with keyword matching.
- Ready for **Netlify** and **Vercel**; `npm start` runs it locally.
- Per-visitor rate limit, short replies, and an instruction to only discuss your business.

Quick start: `npm start`, open `http://localhost:3000/admin.html`.

The full guide is in Indonesian: **PANDUAN.md**. Environment variables are listed in `.env.example`.
