# Smart AI Support

Groq-only chat. Frontend on Vite, API on Vercel serverless.

## Vercel setup (read this)

**.env files are NOT uploaded to Vercel.** They are gitignored. Pasting keys into a local `.env` file does nothing for production.

### Steps

1. Vercel → your project → **Settings** → **Environment Variables**
2. Add **one** variable:
  - **Name:** `GROQ_API_KEY`
  - **Value:** your Groq key (starts with `gsk_`) — paste **without quotes**
3. Enable for **Production** and **Preview**
4. Optional: `GROQ_MODEL` = `llama-3.1-8b-instant`
5. **Deployments** → latest → **⋯** → **Redeploy** (required after any env change)

### Verify

Open `https://YOUR-APP.vercel.app/api/health`

```json
{
  "config": {
    "groqEnvStatus": "valid",
    "keyLength": 39,
    "onVercel": true
  }
}
```

- `groqEnvStatus: "missing"` → key not set in Vercel dashboard
- `keyLength: 0` → same problem
- `onVercel: false` → you're hitting local dev, not Vercel

Ignore OpenRouter / AI_API_KEY / APP_URL — this app only uses Groq.

## Local dev

```bash
npm install
cp .env.example .env.local
# GROQ_API_KEY=gsk_...   (no quotes)
npm run dev
```
