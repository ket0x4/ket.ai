
# Ketard AI Bot

## Overview
Ket.ai is an telegram bot that functions as a chatbot powered by an OpenAI compatible API (Thats mean you can use it with any server like llama.cpp). It is designed to provide a conversational interface for users, allowing them to interact with the bot in a natural language format.

## Commands
- **Start Command**: `/start` to get an introduction and available commands.
- **Help Command**: `/help` provides information on how to use the bot and its commands.
- **Status Command**: `/status` to check the current status of the host device.

### `config/config.json` structure:
```json
{
    "token": "TELEGRAM_BOT_TOKEN",
    "admins": [ADMIN_USER_ID, ADMIN_USER_ID_2],
    "allowed_users": [ALLOWED_USER_ID, ALLOWED_USER_ID_2],
    "allowed_chats": [ALLOWED_CHAT_ID_1, ALLOWED_CHAT_ID_2],
    "api_url": "OpenAI Compatible API URL",
    "api_key": "OpenAI API Key (optional)",
    "model": "Model Name",
    "version": "Next",
    "sys_prompt": "You are a helpful assistant.",
    "max_queue": 4
}
```

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

## License
This project is licensed under the terms of the [GNU General Public License v3.0](LICENSE).
