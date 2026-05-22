import type { VercelRequest, VercelResponse } from "@vercel/node";
import { API_BUILD } from "./lib";

/** Quick check that the latest serverless code is deployed. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    build: API_BUILD,
    models: ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"],
    note: "If build is not gemini-v4-no-15, push git and redeploy on Vercel.",
  });
}
