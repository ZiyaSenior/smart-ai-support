import dotenv from "dotenv";

if (!process.env.VERCEL) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
}

const DEFAULT_MODEL = "gemini-1.5-flash";
const FALLBACK_MODEL = "gemini-1.5-flash";

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
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key || undefined;
}

export function getGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured || DEFAULT_MODEL;
}

function modelsToTry(): string[] {
  const primary = getGeminiModel();
  if (primary === FALLBACK_MODEL) return [primary];
  return [primary, FALLBACK_MODEL];
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

function isQuotaError(msg: string): boolean {
  const lc = msg.toLowerCase();
  return (
    lc.includes("quota") ||
    lc.includes("rate limit") ||
    lc.includes("rate-limit") ||
    lc.includes("resource_exhausted") ||
    lc.includes("limit: 0")
  );
}

function noGeminiKeyMessage(): string {
  return `### Gemini not configured

Add \`GEMINI_API_KEY\` in Vercel → Settings → Environment Variables (no quotes), then redeploy.`;
}

function quotaExceededMessage(triedModels: string[]): string {
  return `### Gemini quota exceeded

Your Google API free tier for **${triedModels.join(", ")}** is used up or not enabled on this key.

**Try this:**
1. In Vercel, set \`GEMINI_MODEL\` to \`gemini-1.5-flash\` (or remove it to use the default), then **Redeploy**
2. Wait a few minutes and send again
3. Enable billing: [Google AI Studio](https://aistudio.google.com/) → Settings
4. Or create a new API key: https://aistudio.google.com/apikey

Your app and API key are working — this is a **Google usage limit**, not a Vercel bug.`;
}

function geminiFailedMessage(triedModels: string[]): string {
  const detail = lastGeminiError ? `\n\n**Details:** ${lastGeminiError.slice(0, 400)}` : "";
  return `### Could not reach Gemini (${triedModels.join(" → ")})${detail}`;
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
      let hint = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(errBody) as { error?: { message?: string } };
        hint = parsed?.error?.message || hint;
      } catch {
        hint = errBody.slice(0, 400) || hint;
      }
      lastGeminiError = hint;
      console.error("[GEMINI]", model, hint);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      promptFeedback?: { blockReason?: string };
    };

    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      lastGeminiError = `Blocked: ${blockReason}`;
      return null;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      lastGeminiError = "Empty response from Gemini";
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

export async function sendMessageToAI(message: string): Promise<{ text: string; provider: string }> {
  const geminiKey = getGeminiApiKey();

  if (!isValidKey() || !geminiKey) {
    return { text: noGeminiKeyMessage(), provider: "Configuration" };
  }

  const models = modelsToTry();

  for (const model of models) {
    const text = await callGeminiOnce(geminiKey, model, message);
    if (text) {
      return { text, provider: `Google Gemini (${model})` };
    }
  }

  if (isQuotaError(lastGeminiError)) {
    return { text: quotaExceededMessage(models), provider: "Quota" };
  }

  return { text: geminiFailedMessage(models), provider: "Gemini Error" };
}

export function getHealthResponse(): HealthResponse {
  const key = getGeminiApiKey();
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      geminiEnabled: isValidKey(),
      geminiModel: getGeminiModel(),
      geminiEnvStatus: getEnvStatus(),
      keyLength: key?.length ?? 0,
      onVercel: Boolean(process.env.VERCEL),
    },
  };
}
