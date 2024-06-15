import logging
import os
import json
import time
import requests
import random
import psutil
from pyrogram import Client, filters, enums, idle
from langchain_community.llms import Ollama
from youtube_transcript_api import YouTubeTranscriptApi

# Load JSON data
try:
    with open("settings.json") as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f"Error loading settings.json: {e}")
    exit(1)

# Retrieve configurations with defaults
ALLOWED_CHATS = data.get("groups", [])
ALLOWED_USERS = data.get("users", [])
ADMINS = data.get("admins", [])
NAME = data.get("bot", "Bot")
DEBUG = data.get("debug", False)
LITE = data.get("lite", False)
VERSION = data.get("version", "1.0")
API_URL = data.get("api_url", "http://localhost:8000")
LLM_MODEL = data.get("llm_model", "default_model")
GEN_COMMANDS = data.get("gen_commands", ["gen"])

# Set up logging
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("debug.log"), logging.StreamHandler()],
)

# Set up token
TOKEN = data.get("debug_token" if DEBUG else "token")
if not TOKEN:
    logging.error("Token not found in settings.json. Exiting.")
    exit(1)


# Check Ollama API reachability
def check_ollama_api():
    try:
        response = requests.get(API_URL, timeout=1)
        if response.status_code == 200:
            logging.info("Ollama API is reachable.")
            return True
        else:
            logging.warning(
                f"Ollama API responded with status code {response.status_code}."
            )
            return False
    except requests.RequestException as e:
        logging.error(f"Ollama API is unreachable: {str(e)}")
        return False


# Initialize bot
bot = Client(
    name=NAME,
    api_id=data["api_id"],
    api_hash=data["api_hash"],
    bot_token=TOKEN,
    parse_mode=enums.ParseMode.MARKDOWN,
    skip_updates=True,
)

# Get OS name and BOARD
OS = os.uname().sysname if os.name != "nt" else "Microsoft Windows"
try:
    with open("/sys/devices/virtual/dmi/id/product_name") as f:
        BOARD = f.read().strip()
except FileNotFoundError:
    BOARD = "Unknown"
logging.info(f"Board: {BOARD}, Platform: {OS}")

# Initialize Ollama
ollama = Ollama(base_url=API_URL, model=LLM_MODEL)
queue_count = 0


# Handle prompt command
@bot.on_message(filters.command(GEN_COMMANDS))
async def handle_ket_command(bot, message):
    global queue_count
    if not check_ollama_api():
        await message.reply_text(
            "Backend service is not responding. Please try again later.", quote=True
        )
        return

    chat_id, user_id = str(message.chat.id), str(message.from_user.id)
    if (
        user_id not in map(str, ADMINS)
        and chat_id not in map(str, ALLOWED_CHATS)
        and user_id not in map(str, ALLOWED_USERS)
    ):
        await message.reply_text(f"`{NAME}` not allowed on this chat.", quote=True)
        logging.warning(
            f"Unauthorized prompt command attempt by user {user_id} in chat {chat_id}."
        )
        return

    queue_count += 1
    prompt = message.text.split(" ", 1)
    if len(prompt) < 2 or not prompt[1].strip():
        await message.reply_text("Please enter a prompt after the command.", quote=True)
        queue_count -= 1
        return

    prompt = prompt[1].strip()
    await message.reply_text(
        f"`{NAME}` Processing... Check `/status` for more info.", quote=True
    )

    try:
        start_time = time.time()
        response = ollama.invoke(prompt)
        end_time = time.time()

        generation_time = round(end_time - start_time, 2)
        model_name = ollama.model
        formatted_response = (
            f"{response}\n\nTook: `{generation_time}s` | Model: `{model_name}`"
        )
        await message.reply_text(formatted_response, quote=True)
        logging.info(f"Processed prompt from user {user_id} in chat {chat_id}.")
    finally:
        queue_count -= 1


# hanlde youtube transcript (sum) command
@bot.on_message(filters.command(["sum", "vid", "video", "youtube", "transcript", "summarize"]))
async def handle_sum_command(bot, message):
    global queue_count
    if not check_ollama_api():
        await message.reply_text(
            "Backend service is not responding. Please try again later.", quote=True
        )
        return
    await message.reply_text(f"Summarizing content... this may take a while depending on the video length.", quote=True)
    chat_id, user_id = str(message.chat.id), str(message.from_user.id)
    if (
        user_id not in map(str, ADMINS)
        and chat_id not in map(str, ALLOWED_CHATS)
        and user_id not in map(str, ALLOWED_USERS)):
        await message.reply_text(f"`{NAME}` not allowed on this chat.", quote=True)
        logging.warning(
            f"Unauthorized prompt command attempt by user {user_id} in chat {chat_id}."
        )
        return
    try:
        # video url format: https://www.youtube.com/watch?v=VIDEO_ID parse the video id from the message
        # to-do: add support parsing https://youtu.be/50yz_BFL7ao?si=VIDEO_ID scheme
        url = message.text.split(" ")[1]
        try:
            video_id = url.split("v=")[1]
            # Get the transcript of the video
            transcript = YouTubeTranscriptApi.get_transcript(video_id)

            # Create a prompt for summarizing the transcript
            lmm_prompt = ".. This is a transcript of a youtube video: summarize and make it short. I mean really short. exclude sposors and intros"
            prompt = lmm_prompt + " ".join([item["text"] for item in transcript])

            # Summarize the transcript
            response_header = f"**Summarized Video:** `{url}`\n\n"
            start_time = time.time()
            response = response_header + ollama.invoke(prompt)
            end_time = time.time()
            generation_time = round(end_time - start_time, 2)
            model_name = ollama.model
            response += f"\n\nTook: `{generation_time}s` | Model: `{model_name}`"

            await message.reply_text(response, quote=True)
        except:
            await message.reply_text(
                f"Invalid URL or failed to parse video id. {NAME} can only parse `youtube.com/watch?v=VIDEO_ID` URL schema.", quote=True
            )
            logging.error("Invalid URL or failed to parse video id. ID: {video_id} URL: {url}")

    except Exception as e:
        await bot.send_message(ADMINS[0], f"An error occurred: {str(e)}")
        logging.error(f"Error fetching youtube transcript: {str(e)}")
        return
    logging.info(f"Processed youtube transcript from user {user_id} in chat {chat_id}.")


# Handle help command
@bot.on_message(filters.command(["help"]))
async def handle_help_command(bot, message):
    rnd_comm = random.choice(GEN_COMMANDS)
    await message.reply_text(
        f"To use {NAME}, type /{rnd_comm} followed by your prompt. For example:\n`/{rnd_comm} What is the meaning of life?`",
        quote=True,
    )
    logging.info("Help command invoked.")


# Get system usage info
def get_cpu_usage():
    return f"**CPU Usage:** `{psutil.cpu_percent(interval=1):.2f}%`"


def get_ram_usage():
    mem = psutil.virtual_memory()
    total_ram = mem.total / (1024**3)  # Convert to GB
    used_ram = mem.used / (1024**3)
    return f"**RAM Usage:** `{used_ram:.2f}/{total_ram:.2f}GB`"


def get_cpu_temperature():
    if OS == "Linux":
        try:
            with open("/sys/class/thermal/thermal_zone0/temp") as f:
                temp = int(f.read()) / 1000  # Convert to Celsius
                return f"**CPU Temp:** `{temp:.2f}°C`"
        except FileNotFoundError:
            logging.warning("CPU temperature file not found.")
            return "**CPU Temp:** `Unavailable`"
    return "**CPU Temp:** `Unsupported OS`"


# Handle status info command
@bot.on_message(filters.command(["status", "boardinfo"]))
async def handle_status_info_command(bot, message):
    await send_status_info_message(message)
    logging.info("Status info command invoked.")


async def send_status_info_message(message):
    api_status = "`Available`" if check_ollama_api() else "`Unavailable`"
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
    bot.run(main())
