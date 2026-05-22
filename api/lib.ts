import dotenv from "dotenv";

if (!process.env.VERCEL) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
}

/** Models that exist on Groq's Chat Completions API (OpenAI-compatible, 2026). */
const SUPPORTED_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.1-70b-versatile",
  "llama-3.3-70b-versatile",
] as const;

const DEFAULT_MODEL = "llama-3.1-8b-instant";

/** Bump when deploying — shown in /api/health so you know Vercel picked up the latest code. */
export const API_BUILD = "groq-v1-no-1";

export interface HealthResponse {
  status: string;
  timestamp: string;
  build: string;
  config: {
    groqEnabled: boolean;
    groqModel: string;
    groqEnvStatus: "missing" | "placeholder" | "valid";
    keyLength: number;
    onVercel: boolean;
  };
}

let lastGroqError = "";

export function getGroqApiKey(): string | undefined {
  const raw = process.env.GROQ_API_KEY;
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

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

function modelsToTry(): string[] {
  const preferred = getGroqModel();
  const chain = [preferred, ...SUPPORTED_MODELS.filter((m) => m !== preferred)];
  return [...new Set(chain)];
}

export function getEnvStatus(): "missing" | "placeholder" | "valid" {
  const normalized = getGroqApiKey();
  if (!normalized) return "missing";

  const lc = normalized.toLowerCase();
  if (
    lc.includes("your_api_key") ||
    lc.includes("placeholder") ||
    lc.includes("my_groq") ||
    lc === "none" ||
    lc === "null"
  ) {
    return "placeholder";
  }

  // Groq keys typically start with gsk_ (treat other formats as likely misconfiguration).
  if (!normalized.startsWith("gsk_")) {
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
    lc.includes("too many requests") ||
    lc.includes("429") ||
    lc.includes("insufficient_quota") ||
    lc.includes("resource_exhausted") ||
    lc.includes("limit: 0")
  );
}

function isNotFoundError(msg: string): boolean {
  const lc = msg.toLowerCase();
  return (
    lc.includes("not found") ||
    lc.includes("not supported") ||
    lc.includes("unknown model") ||
    (lc.includes("model") && lc.includes("does not exist"))
  );
}

function noGroqKeyMessage(): string {
  return `### Groq not configured

Add \`GROQ_API_KEY\` in Vercel → Settings → Environment Variables (no quotes), then redeploy.`;
}

function quotaExceededMessage(triedModels: string[]): string {
  return `### Groq rate limit / quota exceeded

Tried: **${triedModels.join(" → ")}**

Your free-tier limit is used up on these models.

**Fix:**
1. Set \`GROQ_MODEL=llama-3.1-8b-instant\` in Vercel (lighter/faster) and redeploy
2. Wait a few minutes and try again
3. Check Groq account limits / billing in the Groq console`;
}

function allModelsFailedMessage(triedModels: string[]): string {
  const detail = lastGroqError ? `\n\n**Last error:** ${lastGroqError.slice(0, 500)}` : "";
  return `### Could not reach Groq

Tried: **${triedModels.join(" → ")}**${detail}

Set \`GROQ_MODEL\` to one of: ${SUPPORTED_MODELS.join(", ")}`;
}

async function callGroqOnce(apiKey: string, model: string, message: string): Promise<string | null> {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "You are an expert customer support agent. Be professional and concise. Use Markdown.",
          },
          { role: "user", content: message },
        ],
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
      lastGroqError = hint;
      console.error("[GROQ]", model, hint);
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      lastGroqError = "Empty response from Groq";
      return null;
    }

    lastGroqError = "";
    return text;
  } catch (err: unknown) {
    lastGroqError = err instanceof Error ? err.message : String(err);
    console.error("[GROQ]", model, lastGroqError);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendMessageToAI(message: string): Promise<{ text: string; provider: string }> {
  const groqKey = getGroqApiKey();

  if (!isValidKey() || !groqKey) {
    return { text: noGroqKeyMessage(), provider: "Configuration" };
  }

  const models = modelsToTry();
  let sawQuota = false;

  for (const model of models) {
    const text = await callGroqOnce(groqKey, model, message);
    if (text) {
      return { text, provider: `Groq (${model})` };
    }

    if (isQuotaError(lastGroqError)) sawQuota = true;
    // Skip to next model on quota or deprecated/not-found
    if (!isQuotaError(lastGroqError) && !isNotFoundError(lastGroqError)) {
      break;
    }
  }

  if (sawQuota) {
    return { text: quotaExceededMessage(models), provider: "Quota" };
  }

  return { text: allModelsFailedMessage(models), provider: "Groq Error" };
}

export function getHealthResponse(): HealthResponse {
  const key = getGroqApiKey();
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    build: API_BUILD,
    config: {
      groqEnabled: isValidKey(),
      groqModel: getGroqModel(),
      groqEnvStatus: getEnvStatus(),
      keyLength: key?.length ?? 0,
      onVercel: Boolean(process.env.VERCEL),
    },
  };
}
