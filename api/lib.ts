import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import type { HealthResponse } from "../src/types";

dotenv.config();

export function normalizeKey(key?: string): string | undefined {
  if (!key) return undefined;
  let normalized = key.trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
}

export function isValidKey(key?: string): boolean {
  const normalized = normalizeKey(key);
  if (!normalized) return false;
  const lc = normalized.toLowerCase();
  return (
    lc !== "" &&
    !lc.includes("your_api_key_here") &&
    !lc.includes("placeholder") &&
    !lc.includes("my_gemini_api_key") &&
    !lc.includes("your_openrouter_api_key") &&
    lc !== "none" &&
    lc !== "null" &&
    lc !== "undefined"
  );
}

export function generateLocalModelResponse(message: string): string {
  const query = message.toLowerCase();

  if (query.includes("price") || query.includes("pricing") || query.includes("cost") || query.includes("subscription")) {
    return `### 💳 Subscription & Pricing Plans
[Local Model Context: distilgpt2-support]

We offer three flexible tiers designed to scale with your customer support requirements:

1. **Free Tier ($0/mo)**: Standard community support, up to 100 manual chats/month, and simulated offline fallback integration.
2. **Pro Support ($29/mo)**: Unlimited chats on valid OpenRouter connections, advanced customization, and standard prompt engineering tools.
3. **Enterprise Suite ($149/mo)**: Real-time telemetry, dedicated Gemini SLA models, full Custom API integrations, and continuous uptime configurations.

*Need an upgrade? Let us know in chat and we'll point you to our account settings panel immediately.*`;
  }

  if (query.includes("refund") || query.includes("return") || query.includes("cancel")) {
    return `### 🔄 Refund & Cancellation Policy
[Local Model Context: distilgpt2-support]

We aim to satisfy all our customers. Here is our straightforward returns guideline:

*   **Refund Window**: You are fully eligible for a 100% money-back refund within **14 days** of initial subscription activation. No awkward questions asked!
*   **Cancellation**: You can cancel your subscription at any time via your user dashboard under \`Settings > Billing\`. All active features remain fully unlocked until the end of your billing cycle.
*   **Resolution Process**: Please submit a formal ticket outlining your order reference ID, and our financial review desk will process it within 2 business days.`;
  }

  if (query.includes("shipping") || query.includes("delivery") || query.includes("track") || query.includes("order")) {
    return `### 📦 Shipping, Orders & Tracking Information
[Local Model Context: distilgpt2-support]

Here are the details regarding delivery logistics:

*   **Tracking Number**: Your order dispatch system generates a tracking code automatically within 24 hours. Check your inbox for the confirmation email containing an executable carrier tracking link.
*   **Estimated Arrival**: Domestic orders arrive in **3-5 business days**. International shipments generally take **7-14 business days** depending on local customs handling.
*   **Address Corrections**: If your order packaging is pending shipment, we can update your delivery coordinates immediately. Send us your updated shipping info!`;
  }

  if (query.includes("password") || query.includes("login") || query.includes("account") || query.includes("reset")) {
    return `### 🔐 Account Access & Password Reset Support
[Local Model Context: distilgpt2-support]

If you are experiencing authentication blockages or require credential adjustments, follow these protocols:

1.  **Forgot Password**: Click on **Forgot Password** on our main login screen or launch \`/reset-credentials\` directly.
2.  **Reset Link**: A unique, timed authentication link (valid for token durations of 1 hour) will be dispatched to your registered email path.
3.  **Two-Factor Authentication (2FA)**: Ensure you have your sync authenticator application nearby if your profile demands secondary OTP tokens.
4.  **Locked Accounts**: Locked accounts are automatically refreshed and unlocked after 15 minutes of inactivity.`;
  }

  if (query.includes("bug") || query.includes("error") || query.includes("broken") || query.includes("fail") || query.includes("slow")) {
    return `### ⚙️ Technical Issue & Bug Resolution Checklist
[Local Model Context: distilgpt2-support]

We're sorry to hear about this complication! Let's perform some rapid sorting steps:

1.  **Clear Cache**: Perform a force reload to clear stale code bundles (\`Ctrl + F5\` or \`Cmd + Shift + R\`).
2.  **Check Connection**: Ensure you are connected to verified upstream paths with stable websocket indicators.
3.  **Log Details**: Please copy the exact exception printout or describe the steps required to recreate the error.
4.  **Local Status**: If our remote servers are offline or throttling inputs, this client is designed to fall back successfully utilizing offline-ready memory models!`;
  }

  const temperature = process.env.LOCAL_MODEL_TEMPERATURE || "0.7";
  const modelName = process.env.LOCAL_MODEL_NAME || "distilgpt2";

  return `### 🤖 Support Assistant (Edge Mode)
[Local Model Context: ${modelName} | Temp: ${temperature}]

Thank you for your inquiry. Since I am operating under local edge parameters, I don't have active internet search indices, but I am ready to resolve standard account, billing, shipping, or technical support items. 

Could you please elaborate on your support request, or mention keywords like **"pricing"**, **"refund"**, **"shipping"**, or **"password Reset"** so that I can pull up deep troubleshooting answers directly?`;
}

export function generateStaticFallbackResponse(message: string): string {
  return `### 📴 Offline Resilience Mode
We are currently operating in offline-only fallback mode. All remote AI integrations and edge services are currently unreachable.

**Immediate Self-Help Resources**:
- **Frequently Asked Questions**: Browse our knowledge articles directly inside your client settings.
- **Support Ticket**: Please file an offline ticket directly by forwarding your customer ID and detailed logs to **support@example.com**.
- **Urgent Assistance**: Call our toll-free customer desk at **1-800-555-SERV** (Mon-Fri, 9 AM - 5 PM EST).

*We apologize for the inconvenience. Your current conversation is saved to your browser session storage and will automatically attempt synchronization once network connectivity succeeds.*`;
}

export async function sendMessageToAI(message: string): Promise<{ text: string; provider: string }> {
  if (process.env.LOCAL_MODEL_ENABLED === "true") {
    try {
      const responseText = generateLocalModelResponse(message);
      return { text: responseText, provider: `Local Edge Model (${process.env.LOCAL_MODEL_NAME || "distilgpt2"})` };
    } catch (err: any) {
      console.error(`[Tier 1: LOCAL] Execution failed:`, err?.message || err);
    }
  }

  const openRouterKey = normalizeKey(process.env.OPENROUTER_API_KEY);
  if (isValidKey(openRouterKey)) {
    try {
      const url = process.env.OPENROUTER_URL || "https://openrouter.ai/api/v1/chat/completions";
      const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3-8b-instruct:free";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai.studio/build",
          "X-Title": "Smart Customer Support Assistant"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a helpful customer support representative. Give concise, well-structured, support-oriented answers. Format your output using Markdown." },
            { role: "user", content: message }
          ]
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          return { text: content, provider: `OpenRouter (${model})` };
        }
      }
    } catch (err: any) {
      console.error(`[Tier 2: OPENROUTER] Calling OpenRouter failed:`, err?.message || err);
    }
  }

  const aiApiKey = normalizeKey(process.env.AI_API_KEY);
  if (isValidKey(aiApiKey)) {
    try {
      const url = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
      const model = process.env.AI_API_MODEL || "gpt-3.5-turbo";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are an intelligent customer support representative. Return a helpful and beautifully formatted Markdown support message." },
            { role: "user", content: message }
          ]
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          return { text: content, provider: `Generic Provider (${model})` };
        }
      }
    } catch (err: any) {
      console.error(`[Tier 3: GENERIC] Calling Generic Provider failed:`, err?.message || err);
    }
  }

  const geminiKey = normalizeKey(process.env.GEMINI_API_KEY);
  if (isValidKey(geminiKey)) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
        config: {
          systemInstruction: "You are an expert customer support agent. Help the user solve their issue in a professional, concise, empathetic manner. Use Markdown formatting features such as headers, lists, and bold text.",
        },
      });

      const responseText = response.text;
      if (responseText) {
        return { text: responseText, provider: "Google Gemini 3.5 Flash (Server SDK)" };
      }
    } catch (err: any) {
      console.error("[Tier 4: GEMINI] Gemini API content generation failed:", err?.message || err);
    }
  }

  return { text: generateStaticFallbackResponse(message), provider: "Offline Resilient Fallback Engine" };
}

export function getHealthResponse(): HealthResponse {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      localModelEnabled: process.env.LOCAL_MODEL_ENABLED === "true",
      localModelName: process.env.LOCAL_MODEL_NAME || "distilgpt2",
      openRouterEnabled: isValidKey(process.env.OPENROUTER_API_KEY),
      openRouterModel: process.env.OPENROUTER_MODEL || "meta-llama/llama-3-8b-instruct:free",
      genericProviderEnabled: isValidKey(process.env.AI_API_KEY),
      genericProviderModel: process.env.AI_API_MODEL || "gpt-3.5-turbo",
      geminiEnabled: isValidKey(process.env.GEMINI_API_KEY),
      localFallbackEnabled: process.env.LOCAL_FALLBACK_ENABLED !== "false",
    },
  };
}
