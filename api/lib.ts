import dotenv from "dotenv";

if (!process.env.VERCEL) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
}

/** Models that exist on generativelanguage.googleapis.com v1beta (2026). */
const SUPPORTED_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview-05-20",
] as const;

const DEFAULT_MODEL = "gemini-2.0-flash-lite";

/** Bump when deploying — shown in /api/health so you know Vercel picked up the latest code. */
export const API_BUILD = "gemini-v4-no-15";

export interface HealthResponse {
  status: string;
  timestamp: string;
  build: string;
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
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function modelsToTry(): string[] {
  const preferred = getGeminiModel();
  const chain = [preferred, ...SUPPORTED_MODELS.filter((m) => m !== preferred)];
  return [...new Set(chain)];
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
    lc.includes("resource_exhausted") ||
    lc.includes("limit: 0")
  );
}

function isNotFoundError(msg: string): boolean {
  const lc = msg.toLowerCase();
  return lc.includes("not found") || lc.includes("not supported");
}

function noGeminiKeyMessage(): string {
  return `### Gemini not configured

Add \`GEMINI_API_KEY\` in Vercel → Settings → Environment Variables (no quotes), then redeploy.`;
}

function quotaExceededMessage(triedModels: string[]): string {
  return `### Gemini quota exceeded

Tried: **${triedModels.join(" → ")}**

Your free-tier limit is used up on these models.

**Fix:**
1. Set \`GEMINI_MODEL=gemini-2.0-flash-lite\` in Vercel (lighter quota) and redeploy
2. Wait a few minutes and try again
3. Enable billing: https://aistudio.google.com/
4. New API key: https://aistudio.google.com/apikey`;
}

function allModelsFailedMessage(triedModels: string[]): string {
  const detail = lastGeminiError ? `\n\n**Last error:** ${lastGeminiError.slice(0, 500)}` : "";
  return `### Could not reach Gemini

Tried: **${triedModels.join(" → ")}**${detail}

Set \`GEMINI_MODEL\` to one of: ${SUPPORTED_MODELS.join(", ")}`;
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
  let sawQuota = false;

  for (const model of models) {
    const text = await callGeminiOnce(geminiKey, model, message);
    if (text) {
      return { text, provider: `Google Gemini (${model})` };
    }

    if (isQuotaError(lastGeminiError)) sawQuota = true;
    // Skip to next model on quota or deprecated/not-found
    if (!isQuotaError(lastGeminiError) && !isNotFoundError(lastGeminiError)) {
      break;
    }
  }

  if (sawQuota) {
    return { text: quotaExceededMessage(models), provider: "Quota" };
  }

  return { text: allModelsFailedMessage(models), provider: "Gemini Error" };
}

export function getHealthResponse(): HealthResponse {
  const key = getGeminiApiKey();
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    build: API_BUILD,
    config: {
      geminiEnabled: isValidKey(),
      geminiModel: getGeminiModel(),
      geminiEnvStatus: getEnvStatus(),
      keyLength: key?.length ?? 0,
      onVercel: Boolean(process.env.VERCEL),
    },
  };
}
