import dotenv from "dotenv";

if (!process.env.VERCEL) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
}

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
].filter((m): m is string => Boolean(m));

export interface HealthResponse {
  status: string;
  timestamp: string;
  config: {
    geminiEnabled: boolean;
    geminiModel: string;
    geminiEnvStatus: "missing" | "placeholder" | "valid";
    keyLength: number;
    onVercel: boolean;
  };
}

let lastGeminiError = "";

export function getGeminiApiKey(): string | undefined {
  const raw = process.env.GEMINI_API_KEY;
  if (!raw) return undefined;

  let key = raw.trim();
  // Strip wrapping quotes (common when copying from .env files)
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key || undefined;
}

export function getEnvStatus(): "missing" | "placeholder" | "valid" {
  const normalized = getGeminiApiKey();
  if (!normalized) return "missing";

  const lc = normalized.toLowerCase();
  if (
    lc.includes("your_api_key") ||
    lc.includes("placeholder") ||
    lc.includes("my_gemini") ||
    lc === "none" ||
    lc === "null"
  ) {
    return "placeholder";
  }

  if (!normalized.startsWith("AIza")) {
    return "placeholder";
  }

  return "valid";
}

export function isValidKey(): boolean {
  return getEnvStatus() === "valid";
}

function noGeminiKeyMessage(): string {
  return `### Gemini not configured on the server

Your **.env file is not deployed to Vercel** (gitignored). You must add the key in the Vercel dashboard:

1. Vercel → your project → **Settings** → **Environment Variables**
2. Name: \`GEMINI_API_KEY\` — Value: paste key **without quotes**
3. Check **Production** and **Preview**
4. **Deployments** → ⋯ → **Redeploy**

Then open \`/api/health\` — \`geminiEnvStatus\` should be \`valid\`.`;
}

function geminiFailedMessage(): string {
  const detail = lastGeminiError ? `\n\n**Error:** ${lastGeminiError}` : "";
  return `### Gemini API error${detail}

Try setting \`GEMINI_MODEL=gemini-2.0-flash\` in Vercel env vars, or create a new key at https://aistudio.google.com/apikey`;
}

async function callGeminiOnce(apiKey: string, model: string, message: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        systemInstruction: {
          parts: [{
            text: "You are an expert customer support agent. Be professional and concise. Use Markdown.",
          }],
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      let hint = `HTTP ${res.status} (${model})`;
      try {
        const parsed = JSON.parse(errBody) as { error?: { message?: string } };
        hint = parsed?.error?.message || hint;
      } catch {
        hint = errBody.slice(0, 300) || hint;
      }
      lastGeminiError = hint;
      console.error("[GEMINI]", model, hint);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      lastGeminiError = `Empty response (${model})`;
      return null;
    }
    lastGeminiError = "";
    return text;
  } catch (err: unknown) {
    lastGeminiError = err instanceof Error ? err.message : String(err);
    console.error("[GEMINI]", model, lastGeminiError);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGemini(apiKey: string, message: string): Promise<{ text: string; model: string } | null> {
  const models = [...new Set(GEMINI_MODELS)];

  for (const model of models) {
    const text = await callGeminiOnce(apiKey, model, message);
    if (text) return { text, model };
  }

  return null;
}

export async function sendMessageToAI(message: string): Promise<{ text: string; provider: string }> {
  const geminiKey = getGeminiApiKey();

  if (!isValidKey() || !geminiKey) {
    return { text: noGeminiKeyMessage(), provider: "Configuration" };
  }

  const result = await callGemini(geminiKey, message);
  if (result) {
    return { text: result.text, provider: `Google Gemini (${result.model})` };
  }

  return { text: geminiFailedMessage(), provider: "Gemini Error" };
}

export function getHealthResponse(): HealthResponse {
  const key = getGeminiApiKey();
  const models = [...new Set(GEMINI_MODELS)];
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      geminiEnabled: isValidKey(),
      geminiModel: models[0] || "gemini-2.0-flash",
      geminiEnvStatus: getEnvStatus(),
      keyLength: key?.length ?? 0,
      onVercel: Boolean(process.env.VERCEL),
    },
  };
}
