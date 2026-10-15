# Ket AI - Telegram Bot

Ket is an AI bot that joins Telegram groups and chats like a fun, opinionated
buddy rather than a formal assistant. It is powered by Google Gemini, follows
the conversation, remembers context, and can jump in on its own.

## Features

- Gemini-backed replies (`gemini-3.8-flash` / `gemini-3.5-flash-lite`) with
  conversation context.
- Hybrid vector memory (RAG) per group: up to 10,000 facts, indexed by user,
  ranked by similarity plus recency, with TTL categories and automatic
  replacement of outdated facts.
- Background memory worker that extracts user facts from group history.
- Memory commands: `/remember <fact>`, a Telegram Mini App dashboard
  (`/app` or `/admin`), and natural triggers like "remember this".
- Image and voice message understanding.
- Document and file handling: stage files into a sandbox, run code, analyze
  data, edit, and send results back to Telegram.
- Spontaneous mode: occasionally joins the chat on its own (configurable
  probability).
- Agentic tool use with safeguards: `web_search`, `fetch_url`,
  `execute_code` / `execute_bash`, workspace tools (`list`, `search`, `read`,
  `edit`, `write`, `send`, `reset`), and `update_plan`. The loop tracks a run
  budget, suppresses repeated identical tool calls, escalates on repeated tool
  failures, and compacts long context.
- Concurrent processing with `/stop` cancellation and an agent timeout.
- Abuse and cost protection: per-user, per-chat, and per-IP rate limits, plus
  signed and freshness-checked Mini App `initData`.
- Asynchronous logging with automatic rotation.

## Technology Stack

- Runtime: Bun
- Language: TypeScript
- Database: `bun:sqlite`
- AI: `@google/genai` (Google Gemini)
- Telegram: grammY (long polling)
- Containerization: Docker (distroless binary)

## Setup

Create a `config.json` in the project root:

```json
{
  "telegram_bot_token": "YOUR_TELEGRAM_BOT_TOKEN",
  "gemini_api_key": "YOUR_GEMINI_API_KEY",
  "gemini_model": "gemini-3.8-flash",
  "bot_owner_id": 123456789,
  "chat_history_limit": 8,
  "default_reply_probability": 0.05
}
```

See `config.example.json` for all options. You also need a `system.txt` file in
the project root that defines the bot's persona and instructions.

### Run locally (Bun)

```bash
bun install
bun run dev
```

Build a standalone binary:

```bash
bun build --compile --minify src/index.ts --outfile ket
```

### Run with Docker (recommended)

```bash
docker compose up --build -d
```

The Dockerfile compiles the app into a standalone distroless binary.

## Testing

- Message the bot directly or mention it in a group to get a reply.
- Teach it a fact about yourself, talk about other topics to clear recent
  context, then ask about that fact. Vector memory should recall it.

## License

Developed for private use. Follow the Telegram API and Google API terms of
service when using it.
