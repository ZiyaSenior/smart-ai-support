# Smart AI Support

A lightweight AI customer support app built with Vite, React, and Express. It supports multiple AI providers with a fallback stack that includes Gemini, OpenRouter, a generic API provider, and a local edge model.

## Features

- Multi-tier fallback AI pipeline
- Server-side Gemini integration using `@google/genai`
- Express API backend for chat and health endpoints
- React frontend with support status and chat history

## Local Setup

### Prerequisites

- Node.js installed

### Install

```bash
npm install
```

### Configure

Create or update `.env.local` with your Gemini API key:

```env
GEMINI_API_KEY="your_gemini_api_key_here"
```

If you want to disable the local edge model and force Gemini or remote providers instead, set:

```env
LOCAL_MODEL_ENABLED="false"
```

### Run

```bash
npm run dev
```

## Notes

- The local model in this app is a simulated fallback and is not equivalent to Gemini.
- If `LOCAL_MODEL_ENABLED` is `true`, the app will use the local model first and only fall back to Gemini if local generation fails.
- Make sure your environment variables are loaded before starting the server.
