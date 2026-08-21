# Ket AI - Telegram Bot

Ket is a highly capable AI bot designed to participate in Telegram groups. Powered by **Google Gemini AI**, Ket acts more like a fun buddy in your chat group rather than a standard, boring "How can I help you?" assistant.

It doesn't just reply to direct messages; it understands the flow of the conversation, keeps track of the context, and can spontaneously jump in with its own comments!

## Features

- **Advanced LLM Responses:** Utilizing Google Gemini (`gemini-3.1-pro` / `gemini-3.5-flash`), Ket delivers highly intelligent and entertaining chats while maintaining the context of previous messages.
- **Advanced Hybrid Vector Memory (RAG):** Features a group-specific memory capacity of up to **10,000 facts** using `gemini-embedding-001` vector embeddings.
  - **In-Memory Vector Cache:** High-performance caching mechanism eliminates SQLite JSON deserialization overhead during RAG lookups.
  - **User Indexing (`user_id`):** Facts are indexed per user while remaining shared within the group memory pool.
  - **Recency Decay Scoring:** Hybrid RAG ranking combines Cosine Similarity with exponential time-decay ($85\% \text{Cosine} + 15\% \text{Recency Boost}$) so fresh facts take priority.
  - **TTL & Expiration:** Supports `PROFILE` (permanent), `DYNAMIC` (medium-term), and `TEMPORARY` (short-lived) categories with automatic expiration pruning.
  - **Contradiction Auto-Replacement:** Automatically replaces outdated user facts when a new conflicting statement is detected.
- **Async Background Memory Worker:** Automatically analyzes group conversation history in the background every 15 messages to capture user facts even when the bot hasn't directly responded to the message.
- **Unified Memory Commands & Intent Triggers:**
  - `/remember <fact>` — Explicitly store a fact into memory (or reply to any message with `/remember`).
  - **Telegram Mini App Dashboard:** Manage, search, export/import, and prune group memories via `/app` or `/admin`.
  - **Natural Intent Triggers:** Automatic priority extraction when users say *"remember this"*, *"keep in mind"*, *"note this"*, or *"save this"*.
- **Image and Audio Recognition:** It can view photos and listen to voice messages shared in the group, and reply with fitting, humorous, "shitposter buddy" style responses.
- **Spontaneous Mode:** Ket can spontaneously jump into the chat flow with a certain probability (e.g., 5%) to drop a funny or sarcastic comment, making the group chat feel alive.

## Technology Stack

- **Runtime:** [Bun](https://bun.sh/) (Blazing fast JavaScript/TypeScript runtime)
- **Language:** TypeScript
- **Database:** `bun:sqlite` (Built-in, ultra-fast SQLite solution)
- **AI API:** `@google/genai` (Google Gemini API)
- **Telegram Integration:** Telegram Bot API (Custom webhook/polling integration similar to node-telegram-bot-api)
- **Containerization:** Docker (with Alpine/Debian distroless architecture)

## Setup & Running

### 1. Environment Variables (Config)
Create a `config.json` file in the root directory of the project:

```json
{
  "BOT_TOKEN": "YOUR_TELEGRAM_BOT_TOKEN",
  "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY",
  "ADMIN_IDS": [123456789],
  "GEMINI_MODEL": "gemini-3.5-flash-lite",
  "POLLING_INTERVAL": 1000
}
```
You also need a `system.txt` file in the root directory that defines the bot's persona and instructions.

### 2. Running Locally (with Bun)

If you have **Bun** installed on your machine:

Install dependencies:
```bash
bun install
```

Run in development mode:
```bash
bun run dev
```

Build with bun:
```bash
bun build --compile --minify src/index.ts --outfile ket
```

### 3. Running with Docker (Recommended)

To run it on any server or device with Docker installed:

```bash
docker compose up --build -d
```
*Note: The system compiles the app into a standalone distroless binary via the Dockerfile to maximize performance and security.*

## How to Test?
- You can get a direct reply by sending a message to the bot privately or in a group.
- Teach the bot a specific fact about yourself (e.g., "Ket, my birthday is July 15th"). Talk about completely different topics for a while to clear the recent context. Later, ask "When was my birthday?". Thanks to its vector memory, it will instantly fetch the exact right answer for you!

## License
This project was developed for private purposes. Please adhere to the Telegram API and Google API Terms of Service when using it.
