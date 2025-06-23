
# Ket.AI Bot

## Overview
Ket.AI is an telegram bot that functions as a chatbot powered by an OpenAI compatible API (Thats mean you can use it with any server like llama.cpp). It is designed to provide a conversational interface for users, allowing them to interact with the bot in a natural language format.

### Supported backends
- [Llama.cpp](https://github.com/ggml-org/llama.cpp)
- [OpenAI API](https://openai.com/api/)
- [Openrouter](https://openrouter.ai/)

## Commands
- **Start Command**: `/start` to get an introduction and available commands.
- **Help Command**: `/help` provides information on how to use the bot and its commands.
- **Status Command**: `/status` to check the current status of the host device.
- **Video summary Command**: `/yt` or `/ytsum` to summarize a YouTube video by providing the video URL.

## User Management
Note: Only admins can manage users and chats.

- **Add User Command**: `/adduser` to add a user to the allowed users list.
- **Remove User Command**: `/rmuser` to remove a user from the allowed users list.
- **Add Chat Command**: `/addchat` to add a chat to the allowed chats list.
- **Remove Chat Command**: `/rmchat` to remove a chat from the allowed chats list.
- **List Command**: `/list` to list all allowed users and chats.

### `config/config.json` structure:
```json
{
    "Version": "5.0",
    "BotSetup": {
        "token": "TELEGRAM_BOT_TOKEN",
        "max_queue": 10
    },
    "BackendSetup": {
        "api_url": "https://openrouter.ai/api/v1",
        "api_key": "API_KEY",
        "model": "LLM_MODEL",
        "input_length": 2048,
        "yt-language": "en",
        "sys_prompt": "You are a helpful assistant."
    },
    "logging": {
        "level": "info",
        "file": "ket.log"
    },
    "http_proxy": "127.0.0.1:8008"
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

## License
This project is licensed under the terms of the [GNU General Public License v3.0](LICENSE).