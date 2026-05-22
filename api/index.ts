import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: "ok",
    message: "Smart AI Support — Groq only",
    endpoints: { health: "/api/health", chat: "/api/chat" },
  });
}
