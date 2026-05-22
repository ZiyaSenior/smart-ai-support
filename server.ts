/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Message } from "./src/types";
import { sendMessageToAI, getHealthResponse } from "./api/lib";

const app = express();
const PORT = 3000;

app.use(express.json());

let chatHistory: Message[] = [
  {
    id: "welcome-message",
    sender: "bot",
    text: "Hello! I'm your Smart AI Support Assistant, powered by Google Gemini. How can I help you today?",
    timestamp: Date.now(),
    providerUsed: "System Welcome",
  },
];

function generateId(): string {
  return "msg_" + Math.random().toString(36).substring(2, 9);
}

app.get("/api/health", (_req, res) => {
  res.json(getHealthResponse());
});

app.get("/api/history", (_req, res) => {
  res.json({ history: chatHistory });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message content is required" });
    }

    const userMessage: Message = {
      id: generateId(),
      sender: "user",
      text: message,
      timestamp: Date.now(),
    };
    chatHistory.push(userMessage);

    const { text, provider } = await sendMessageToAI(message);

    const botMessage: Message = {
      id: generateId(),
      sender: "bot",
      text,
      timestamp: Date.now(),
      providerUsed: provider,
      isError: provider === "Gemini Error" || provider === "Configuration",
    };
    chatHistory.push(botMessage);

    return res.json({
      response: text,
      providerUsed: provider,
      history: chatHistory,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/chat] Critical request error:", msg);
    return res.status(500).json({
      error: "An internal support server error occurred",
      details: msg,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart AI Support Server running on http://localhost:${PORT}`);
  });
}

startServer();
