
# Ketard AI Bot

## Overview
Ket.ai is an overengineered telegram bot that functions as a chatbot and system status monitor. It is built using the `pyrogram` library and includes a variety of commands for generating responses using various APIs and local LLMs. The bot is designed to be easily configurable and extensible, with support for custom commands and system information reporting.

## Features
- **System Information**: Commands to check CPU usage, RAM usage, and system temperature.
- **Text Generation**: Utilizes the Ollama API for generating responses based on user input.
- **Debug and Status Modes**: Includes configurations for debug mode and system status reporting.
- **Command Handling**: Custom commands for different functionalities, including help and start commands.

### Requirements
* Python3
* GNU+Linux
* [Ollama](https://ollama.com/download/linux) (for local llm models)
* ffmpeg and flac (for speech-to-text)

## Usage
- **Start Command**: `/start` to get an introduction and available commands.
- **Help Command**: `/help` provides information on how to use the bot and its commands.
- **Status Command**: `/status` to get the current system status including CPU usage, RAM usage, and more.
- **Custom Commands**: `{DataConfig.GEN_COMMANDS}` for generating responses based on specified commands.
- **Sum Command**: `/sum` pass youtube video url to get a summary of the video.

## Installation
<details><summary><b>Click to view installation steps.</b></summary>

1. Clone the repository:
    ```bash
    git clone https://github.com/ket0x4/ketard-ai.git && cd ketard-ai
    ```
2. Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3. Activate the virtual environment:
    ```bash
    source venv/bin/activate
    ```
4. Install the dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5. Create a configuration file and fill in the required variables: 
    ```bash
    cp sample_config.json config.json
    ```
6. Configure the bot by editing the `config.json` file with the appropriate values for `BOT_NAME`, `API_ID`, `API_HASH`, `BOT_TOKEN`, ...
7. Run the bot:
    ```bash
    bash start
    ```

</details>

## Configuration
Ensure that your `config.json` is correctly set up with the necessary API credentials and configurations for bot behavior.

## To-do
<details><summary><b>Click to expand!</b></summary>

- [x] Add `/sum` command
- [x] Async `/sum` command
- [x] Support other youtube url's 
- [x] Add speech-to-text support
- [x] Check api response before sending
- [x] Fix async `/status` command
- [x] Add blacklist support
- [ ] log prompts and responses to db
- [x] split long messages
- [x] delete status message after sending prompt response
- [x] Add reply support
- [ ] Refactor code
- [ ] remove repeated code
- [ ] Add `TR` lang support to `/sum command`
- [ ] Better `/help` message
- [x] Add `/start command`
- [ ] Make llm backend configurable
- [ ] Add `/model` command for changing llm model
- [ ] Add `/debug` command for enabling debug mode
- [ ] Fix `/update` command

</details>

## License
This project is licensed under the terms of the [GNU General Public License v3.0](LICENSE).
