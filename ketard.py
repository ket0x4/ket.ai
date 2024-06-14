import asyncio
from imaplib import Commands
import logging
import os
import psutil
import json
import time
import random
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
        NAME = data["bot"]
        DEBUG = data["debug"]
        LITE = data["lite"]
        VERSION = data["version"]
        API_URL = data["api_url"]
        LLM_MODEL = data["llm_model"]
        WHISPER_MODEL = data["whisper_model"] + ".bin"
        GEN_COMMANDS = data["gen_commands"]
except FileNotFoundError:
    print("settings.json not found. Please create one.")
    exit(1)

# Set up logging
logging.basicConfig(
    # level=logging.DEBUG if DEBUG else logging.WARN,
    level=logging.INFO,
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
        response = requests.get(API_URL, timeout=0.3,)
        if response.status_code == 200:
            logging.info("Ollama API is reachable.")
            return True
        else:
            logging.warning("Ollama API is unreachable.")
            return False
    except requests.exceptions.RequestException as e:
        logging.error(f"Ollama API is unreachable: {str(e)}")
        return False

check_ollama_api()


bot = Client(
    name=data["bot"],
    api_id=data["api_id"],
    api_hash=data["api_hash"],
    bot_token=TOKEN,
    parse_mode=enums.ParseMode.MARKDOWN,
    skip_updates=True,
)

# Get OS name and BOARD
if os.name == "nt":
    OS = "Microsoft Windows"
    BOARD = "Unkonwn"
else:
    try:
        with open("/sys/devices/virtual/dmi/id/product_name") as f:
            BOARD = f.read().replace("\n", "")
    except FileNotFoundError:
        logging.error("Board name not found.")
        BOARD = "Unknown"
    OS = os.uname().sysname

logging.info(f"Board: {BOARD}, Platform: {OS}")
if os.name == "nt":
    logging.warning("Windows support is experimental and many features may not work.")

# Check required files for whisper
def check_whisper_files():
    global wbin, wmodel
    if os.name == "nt":
        wbin = "whisper\\whisper.exe"
        wmodel = f"whisper\\{WHISPER_MODEL}"
    else:
        wbin = "./whisper/whisper"
        wmodel = f"./whisper/{WHISPER_MODEL}"

    if os.path.exists(wbin) and os.path.exists(wmodel):
        logging.info("Found whisper model and binary.")
        return True
    else:
        logging.error("Whisper files missing. Check the readme for instructions.")
        return False

check_whisper_files()



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
    if check_ollama_api() is False:
        await message.reply_text(
            "Backend service is not responding. Please try again later.",
            quote=True,
        )
    else:
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

                prompt = message.text.split(" ", 1)[1]
                start_time = time.time()  # Record start time to calculate processing time
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
                end_time = time.time()  # Record end time
                generation_time = round(end_time - start_time, 2)  # Calculate generation time
                model_name = ollama.model  # Get model name
                formatted_response = f"{response}\n\nTook: `{generation_time}s` | Model: `{model_name}`"
                await message.reply_text(formatted_response, quote=True)
                logging.info(f"Processed prompt from user {user_id} in chat {chat_id}.")
                queue_count -= 1  # Decrease the queue count after sending the reply
            else:
                await message.reply_text(f"`{NAME}` not allowed on this chat.", quote=True)
                logging.warning(
                    f"Unauthorized prompt command attempt by user {user_id} in chat {chat_id}."
                )
        except Exception as e:
            await bot.send_message(ADMINS[0], f"An error occurred: `{str(e)}`")
            logging.error(f"Error processing prompt command: {str(e)}")


# Handle help command
@bot.on_message(filters.command(["help"]))
async def handle_help_command(bot, message):
    rnd_comm = random.choice(GEN_COMMANDS)
    await message.reply_text(
        f"To use {NAME}, type /{rnd_comm} followed by your prompt. For example:\n`/{rnd_comm} What is the meaning of life?`",
        quote=True,
    )
    logging.info("Help command invoked.")


# Get system usage info with psutil
def get_cpu_usage():
    """Get CPU usage information."""
    cpu = psutil.cpu_percent(interval=1)
    return f"**CPU Usage:** `{cpu:.2f}%`"


def get_ram_usage():
    """Get RAM usage information."""
    mem = psutil.virtual_memory()
    total_ram = mem.total / (1024**3)  # Convert to GB
    used_ram = mem.used / (1024**3)
    return f"**RAM Usage:** `{used_ram:.2f}/{total_ram:.2f}GB`"


def get_cpu_temperature():
    """Get CPU temperature information."""
    if os.system == "Linux":
        try:
            with open("/sys/class/thermal/thermal_zone0/temp") as f:
                temp = f.read()
                temp = int(temp) / 1000  # Convert to Celsius
                return f"**CPU Temp:** `{temp:.2f}°C`"
        except FileNotFoundError:
            logging.warning("CPU temperature file not found.")
            return "**CPU Temp:** `Unavailable`"
    else:
        return "**CPU Temp:** `Unsupported OS`"


# Handle status info command
@bot.on_message(filters.command(["status", "boardinfo"]))
async def handle_status_info_command(bot, message):
    """Get system information."""
    await send_status_info_message(message)
    logging.info("Status info command invoked.")


async def send_status_info_message(message):
    if check_ollama_api() is False:
        api_status = "`Unavailable`"
    else:
        api_status = "`Available`"
    try:
        queue = f"**Queued prompts:** `{queue_count}`"
        device = f"**Board:** `{BOARD}`"
        osname = f"**OS:** `{OS}`"
        cpu_usage = get_cpu_usage()
        ram_usage = get_ram_usage()
        cpu_temp = get_cpu_temperature()
        ollama_api = f"**API Status:** {api_status}"
        version = f"**Version:** `{VERSION}`"
        lite = f"**Lite mode:** `{LITE}`"
        debug = f"**Debug mode:** `{DEBUG}`"
        info = f"{queue}\n{device}\n{osname}\n{cpu_usage}\n{ram_usage}\n{ollama_api}\n{cpu_temp}\n{lite}\n{debug}\n{version}"
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
