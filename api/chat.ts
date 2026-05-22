import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendMessageToAI } from "./lib";

export const config = {
  api: {
    bodyParser: true,
  },
};
// This function attempts to parse the request body as JSON if it's a string, or directly if it's already an object.
function parseBody(req: VercelRequest): { message?: string } {
  if (req.body && typeof req.body === "object") {
    return req.body as { message?: string };
  }
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body) as { message?: string };
    } catch {
      return {};
    }
  }
  return {};
}

// This is the main handler function for the /api/chat endpoint. It processes incoming POST requests, validates the message content, and interacts with the AI provider to get a response.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = parseBody(req);
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message content is required" });
  }

  try {
    const { text, provider } = await sendMessageToAI(message.trim());
    return res.status(200).json({ response: text, providerUsed: provider });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] /api/chat error", msg);
    return res.status(500).json({ error: "Internal server error", details: msg });
  }
}
