import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getHealthResponse } from "./lib";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json(getHealthResponse());
}
