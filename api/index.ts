export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: "ok",
    message: "Smart AI Support backend is running.",
    endpoints: {
      health: "/api/health",
      chat: "/api/chat"
    }
  });
}
