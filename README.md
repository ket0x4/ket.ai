
# Ket.AI Bot

## Overview
Ket.AI is an telegram bot that functions as a chatbot powered by an OpenAI compatible API (Thats mean you can use it with any server like llama.cpp). It is designed to provide a conversational interface for users, allowing them to interact with the bot in a natural language format.

### Supported backends
- **Llama.cpp**: `https://github.com/ggml-org/llama.cpp`
- **OpenAI API**: `https://openai.com/api/`
- **Openrouter**: `https://openrouter.ai/`
- **Gemini(Openai compatible)**: `https://generativelanguage.googleapis.com/v1beta/openai/`

## Commands

### General Commands
- `/start` to get an introduction and available commands.
- `/help` provides information on how to use the bot and its commands.
- `/status` to check the current status of the host device.

### Youtube Commands
- `/yt` or `/ytsum` to summarize a YouTube video by providing the video URL.

Note: User can also reply to a YouTube video link with same commands to summarize it.

### User Management
Note: Only admins can manage users and chats.

- `/adduser` to add a user to the allowed users list.
- `/rmuser` to remove a user from the allowed users list.
- `/addchat` to add a chat to the allowed chats list.
- `/rmchat` to remove a chat from the allowed chats list.
- `/list` to list all allowed users and chats.

### Retrieval-Augmented Generation Commands

- `/reset` to clear the context and start a new conversation.
- `/history` to view the context history of the current chat.

### `config/config.json` structure:

```json
{
    "Version": "6.5",
    "BotName": "ket.ai",
    "GenCommand": "ket",
    "BotSetup": {
        "token": "TELEGRAM_BOT_TOKEN",
        "max_queue": 10,
        "random": true,
        "MaxMessagesPerGroup": 40,
        "TriggerProbability": 0.10
    },
    "BackendSetup": {
        "api_url": "OPENAI_COMPATIBLE_API_URL",
        "api_key": "API_KEY",
        "model": "LLM_MODEL",
        "input_length": 2048,
        "yt-language": "tr"
    },
    "logging": {
        "level": "info",
        "file": "ket.log"
    },
    "http_proxy": "HTTP_PROXY_ADDRESS:PORT"
}
```

### `chats.json` structure:

```json
{
    "admins": [
        207588255,
        2087606991
    ],
    "allowed_chats": [
        -1001541497652,
        -1001253259500,
        -1001054130924
    ]
}
```

## Installation
### Prerequisites
- Go 1.20 or later
- Docker (optional, for containerization)
- Telegram Bot Token (create a bot using [BotFather](https://t.me/botfather))


### Build image

```bash
docker build -t ket.ai .
docker run -d --name ketai
```

### Build binary

```bash
go mod tidy
CCGO_ENABLED=0 go build -ldflags '-w -s' -o ket main.go
```

### To-do

- Implement multimodality support
- Improve error handling
- Improve user management features
- Support replying to responses
- move sqlite from json to a proper database
- Add more backend support

### Telegram Bot Setup commands
Note: add these commands to your bot using BotFather.
```
start - Start the bot and get an introduction
help - Get help on how to use the bot
status - Check the current status of the host device
adduser - Add a user to the allowed users list
rmuser - Remove a user from the allowed users list
addchat - Add a chat to the allowed chats list
rmchat - Remove a chat from the allowed chats list
list - List all allowed users and chats
reset - Clear the context and start a new conversation
history - View the context history of the current chat
ytsum - Summarize a YouTube video by providing the video URL
```

## License

This project is licensed under the terms of the [GNU General Public License v3.0](LICENSE).