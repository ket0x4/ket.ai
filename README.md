
# Ketard AI Bot

## Overview
Ketard AI Bot is a Telegram bot designed for interacting with users through a variety of commands. It leverages advanced APIs to provide features such as system status checks, text generation, and more. The bot can be integrated with different services to enhance functionality.

## Features
- **System Information**: Commands to check CPU usage, RAM usage, and system temperature.
- **Text Generation**: Utilizes the Ollama API for generating responses based on user input.
- **Debug and Status Modes**: Includes configurations for debug mode and system status reporting.
- **Command Handling**: Custom commands for different functionalities, including help and start commands.

## Usage
- **Start Command**: `/start` to get an introduction and available commands.
- **Help Command**: `/help` provides information on how to use the bot and its commands.
- **Status Command**: `/status` to get the current system status including CPU usage, RAM usage, and more.
- **Custom Commands**: `{DataConfig.GEN_COMMANDS}` for generating responses based on specified commands.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ketard-bot.git
   cd ketard-bot
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - On Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - On macOS and Linux:
     ```bash
     source venv/bin/activate
     ```
4. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Configure the bot by editing the `config.json` file with the appropriate values for `BOT_NAME`, `API_ID`, `API_HASH`, `BOT_TOKEN`, ...
6. Run the bot:
   ```bash
   python -m ketard
   ```

## Configuration
Ensure that your `config.json` is correctly set up with the necessary API credentials and configurations for bot behavior.

## License
This project is licensed under the [MIT License](LICENSE).
