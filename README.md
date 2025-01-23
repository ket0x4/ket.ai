
# Ketard AI Bot

## Overview
Ket.ai is an telegram bot that functions as a chatbot.

## Commands
- **Start Command**: `/start` to get an introduction and available commands.
- **Help Command**: `/help` provides information on how to use the bot and its commands.

## Usage

### Create `.env` with the following content
```bash
BOT_TOKEN='Your Telegram Bot Token'
```

### Build
```bash
CCGO_ENABLED=0 go build -ldflags '-w -s' -o ketai main.go
upx -9 -q -f --ultra-brute -o ketai ketai # Optional, too slow
```

### Docker
```bash
docker build -t ket.ai .
docker run -d --name ketai
```

## License
This project is licensed under the terms of the [GNU General Public License v3.0](LICENSE).
