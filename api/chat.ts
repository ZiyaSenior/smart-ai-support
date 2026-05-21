import { sendMessageToAI } from "./lib";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message content is required" });
  }

  try {
    const { text, provider } = await sendMessageToAI(message.trim());
    return res.status(200).json({ response: text, providerUsed: provider });
  } catch (err: any) {
    console.error("[API] /api/chat error", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
