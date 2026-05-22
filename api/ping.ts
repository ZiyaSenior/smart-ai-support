import type { VercelRequest, VercelResponse } from "@vercel/node";
import { API_BUILD } from "./lib";

/** Quick check that the latest serverless code is deployed. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    build: API_BUILD,
    models: ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "llama-3.3-70b-versatile"],
    note: "If build is not groq-v1-no-1, push git and redeploy on Vercel.",
  });
}
