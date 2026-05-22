import dotenv from "dotenv";

if (!process.env.VERCEL) {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
}

const DEFAULT_MODEL = "gemini-2.0-flash";

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
  return `### Gemini not configured

Add \`GEMINI_API_KEY\` in Vercel → Settings → Environment Variables (no quotes), then redeploy.`;
}

function geminiFailedMessage(model: string): string {
  const detail = lastGeminiError ? `\n\n**Error:** ${lastGeminiError}` : "";
  return `### Could not reach Gemini (${model})${detail}`;
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
        hint = errBody.slice(0, 300) || hint;
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
  const model = getGeminiModel();

  if (!isValidKey() || !geminiKey) {
    return { text: noGeminiKeyMessage(), provider: "Configuration" };
  }

  const text = await callGeminiOnce(geminiKey, model, message);
  if (text) {
    return { text, provider: `Google Gemini (${model})` };
  }

  return { text: geminiFailedMessage(model), provider: "Gemini Error" };
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
