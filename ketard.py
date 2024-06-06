import asyncio
from imaplib import Commands
import logging
import os
import psutil
import json
import requests
from langchain_community.llms import Ollama

from pyrogram import Client, filters, enums, idle
from pyrogram.types import Message


# Load JSON data
try:
    with open("settings.json") as f:
        data = json.load(f)
        ALLOWED_CHATS = data["groups"]
        ALLOWED_USERS = data["users"]
        ADMINS = data["admins"]
        BOARD = data["board"]
        NAME = data["bot"]
        DEBUG = data["debug"]
        LITE = data["lite"]
        VERSION = data["version"]
        BOARD = data["board"]
        API_URL = data["api_url"]
        LLM_MODEL = data["llm_model"]
        GEN_COMMANDS = data["gen_commands"]
except FileNotFoundError:
    print("settings.json not found. Please create one.")
    exit(1)

# Set up logging
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(levelname)s - %(message)s",
    handlers=[logging.FileHandler("debug.log"), logging.StreamHandler()],
)

# Set up token
if DEBUG:
    logging.info("Debug mode enabled.")
    if data.get("debug_token"):
        TOKEN = data["debug_token"]
        logging.info("Using debug token.")
    else:
        logging.warning("Debug token not found in settings.json. Using default.")
else:
    TOKEN = data["token"]


# check ollama api reachability
def check_ollama_api():
    try:
        response = requests.get(API_URL)
        if response.status_code == 200:
            logging.info("Ollama API is reachable.")
            return "**Ollama API:** `Available`"
        else:
            logging.warning("Ollama API is unreachable.")
            return False
    except requests.exceptions.RequestException as e:
        logging.error(f"Error reaching Ollama API: {str(e)}")
        return "**Ollama API:** `Unavailable`"


bot = Client(
    name=data["bot"],
    api_id=data["api_id"],
    api_hash=data["api_hash"],
    bot_token=TOKEN,
    parse_mode=enums.ParseMode.MARKDOWN,
    skip_updates=True,
)

# Base variables
ollama = Ollama(base_url=API_URL, model=LLM_MODEL)
process_next_message = False
queue_count = 0


# Handle incoming messages with /prompt command
@bot.on_message(filters.command(GEN_COMMANDS))
async def handle_ket_command(bot, message):
    global process_next_message
    global queue_count
    process_next_message = True
    try:
        chat_id = str(message.chat.id)
        user_id = str(message.from_user.id)
        if (
            user_id in map(str, ADMINS)
            or chat_id in map(str, ALLOWED_CHATS)
            or user_id in map(str, ALLOWED_USERS)
        ):
            queue_count += (
                1  # Increase the queue count when a new user uses the /prompt command
            )

            prompt = message.text.split(" ", 1)
            if len(prompt) == 1 or not prompt[1].strip():
                await message.reply_text(
                    "Please enter a message after the command.", quote=True
                )
                queue_count -= 1  # Decrease the queue count if no prompt is provided
                return

            prompt = prompt[1].strip()

            await message.reply_text(
                f"`{NAME}` Processing your prompt. Check `/status` for more info.",
                quote=True,
            )

            prompt = message.text.replace("/ket", "").strip()
            response = ollama.invoke(prompt)
            await message.reply_text(response, quote=True)
            logging.info(f"Processed prompt from user {user_id} in chat {chat_id}.")
            queue_count -= 1  # Decrease the queue count after sending the reply
        else:
            await message.reply_text("Ket.ai not allowed on this chat.", quote=True)
            logging.warning(
                f"Unauthorized prompt command attempt by user {user_id} in chat {chat_id}."
            )
    except Exception as e:
        await bot.send_message(ADMINS[0], f"An error occurred: `{str(e)}`")
        logging.error(f"Error processing prompt command: {str(e)}")


# Handle help command
@bot.on_message(filters.command(["help"]))
async def handle_help_command(bot, message):
    await message.reply_text(
        f"To use {NAME}, type /ket followed by your prompt. For example, `/ket What is the meaning of life?`\nCreator: `@ket0x004`",
        quote=True,
    )
    logging.info("Help command invoked.")


# Get system usage info
def get_cpu_usage():
    """Get current CPU usage percentage."""
    cpu_pct = (
        os.popen(
            """grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage }' """
        )
        .readline()
        .strip()
    )
    return f"**CPU Usage:** `{cpu_pct}%`"


def get_ram_usage():
    """Get RAM usage information."""
    mem = psutil.virtual_memory()
    total_ram = mem.total / (1024**3)  # Convert to GB
    used_ram = mem.used / (1024**3)
    return f"**RAM Usage:** `{used_ram:.2f}/{total_ram:.2f}GB`"


def get_cpu_temperature():
    """Get CPU temperature."""
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as temp_file: # only works on Raspberry Pi
            temp = int(temp_file.read()) / 1000.0
            logging.info(f"CPU temperature: {temp:.2f}°C")
            return f"**CPU Temp:** `{temp:.2f}°C`"
    except FileNotFoundError:
        logging.error("Failed to read CPU temperature.")
        return "**CPU Temp:** `Failed to read`"


# Handle status info command
@bot.on_message(filters.command(["status", "boardinfo"]))
async def handle_status_info_command(bot, message):
    """Get system information."""
    await send_status_info_message(message)
    logging.info("Status info command invoked.")


async def send_status_info_message(message):
    try:
        queue = f"**Queue:** `{queue_count}`"
        device = f"**Board:** `{BOARD}`"
        cpu_usage = get_cpu_usage()
        ram_usage = get_ram_usage()
        cpu_temp = get_cpu_temperature()
        ollama_api = check_ollama_api()
        version = f"**Version:** `{VERSION}`"
        lite = f"**Lite mode:** `{LITE}`"
        debug = f"**Debug mode:** `{DEBUG}`"
        info = f"{queue}\n{device}\n{cpu_usage}\n{ram_usage}\n{ollama_api}\n{cpu_temp}\n{lite}\n{debug}\n{version}"
        await message.reply_text(info, quote=True)

    except Exception as e:
        await bot.send_message(ADMINS[0], f"An error occurred: {str(e)}")
        logging.error(f"Error fetching status info: {str(e)}")


async def main():
    logging.info("Bot starting...")
    await bot.start()
    logging.info("Bot started.")
    await idle()
    logging.info("Bot stopping...")
    await bot.stop()
    logging.info("Bot stopped.")


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
