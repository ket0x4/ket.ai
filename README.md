
# Ketard AI Bot

## Overview
Legacy version for those who want to use on low-end devices like Raspberry pi. Uses Llama.cpp server for text generation.

## Features
- **System Information**: Commands to check CPU usage, RAM usage, and system temperature.
- **Text Generation**: Utilizes the Ollama API for generating responses based on user input.

### Requirements
* Python3
* [llama.cpp server](https://github.com/ggerganov/llama.cpp)

## Usage
- **Start Command**: `/start` to get an introduction and available commands.
- **Help Command**: `/help` provides information on how to use the bot and its commands.
- **Status Command**: `/status` to get the current system status including CPU usage, RAM usage, and more.
- **Custom Commands**: `/ket` for generating responses based on specified commands.

## Installation
Note: You have to setup & run the [llama.cpp server](https://github.com/ggerganov/llama.cpp) before running the bot.
1. Clone the repository:
   ```bash
   git clone --depth=1 --single-branch https://github.com/ket0x4/ketard-ai && cd ketard-ai
   ```
2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
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
   python ketard.py
   ```

## Configuration
Ensure that your `config.json` is correctly set up with the necessary API credentials and configurations for bot behavior.

## License
This project is licensed under the [MIT License](LICENSE).
