# Ket AI - Telegram Bot

Ket is an AI bot that joins Telegram groups and chats like a fun, opinionated
buddy rather than a formal assistant. It is powered by any OpenAI API-compatible
LLM endpoint, follows the conversation, remembers context, and can jump in on
its own.

## Features

- Replies through any OpenAI-compatible API (OpenAI, llama-server, vLLM, etc.)
  with conversation context.
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
- Agentic tool use with safeguards: `fetch_url`, `execute_code` /
  `execute_bash`, workspace tools (`list`, `search`, `read`, `edit`, `write`,
  `send`, `reset`), and `update_plan`. The loop tracks a run
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
- AI: `openai` SDK (any OpenAI-compatible endpoint)
- Telegram: grammY (long polling)
- Containerization: Docker (distroless binary)

## Setup

Create a `config.json` in the project root. Every key is required: copy
`config.example.json`, fill in every value, then start the bot. Missing or
invalid values abort startup with a list of the exact keys.

Environment variables are not used for configuration.

Embeddings require their own endpoint and key (`openai_embedding_base_url`,
`openai_embedding_api_key`); there is no fallback to the main chat API.

You also need a `system.txt` file in the project root that defines the bot's
persona and instructions.

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

The Dockerfile compiles the app into a standalone distroless binary. In Docker,
set `sandbox_url` to `http://ket-sandbox:8080` and `web_port` to `3003` in
`config.json`.

## Testing

- Message the bot directly or mention it in a group to get a reply.
- Teach it a fact about yourself, talk about other topics to clear recent
  context, then ask about that fact. Vector memory should recall it.

## License

Developed for private use. Follow the Telegram API and OpenAI API terms of
service when using it.
