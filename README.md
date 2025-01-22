
# Ketard AI Bot

## Overview
Ket.ai is an telegram bot that functions as a chatbot.

### Requirements
* Golang

## Usage
- **Start Command**: `/start` to get an introduction and available commands.
- **Help Command**: `/help` provides information on how to use the bot and its commands.

### Build
```bash
export TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
go mod tidy
go build -o ket.ai main.go
./ket.ai
```

### Docker
```bash
export TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
go mod tidy
go build -o ket.ai main.go
docker build -t ket.ai .
docker run -d --name ket.ai -e TELEGRAM_BOT_TOKEN
```

## License
This project is licensed under the terms of the [GNU General Public License v3.0](LICENSE).
