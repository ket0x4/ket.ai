import logging
import json
import aiohttp
import random
import psutil
import os, time
from pyrogram import Client, filters, enums, idle
import asyncio

# Load JSON data
try:
    with open("settings.json") as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f"[Config] Error loading settings.json: {e}")
    exit(1)

# Default configurations
DEBUG = False
VERSION = "legacy"
ALLOWED_CHATS = data.get("groups", [])
ALLOWED_USERS = data.get("users", [])
ADMINS = data.get("admins", [])
NAME = data.get("bot", "Ket.ai")
API_URL = data.get("api_url", "http://localhost:8080/")
LLM_MODEL = data.get("llm_model", "phi3")
GEN_COMMANDS = data.get("gen_commands", ["ket"])

# Set up logging
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("debug.log"), logging.StreamHandler()],
)

# Initialize bot
bot = Client(
    name=NAME,
    api_id=data["api_id"],
    api_hash=data["api_hash"],
    bot_token=data["token"],
    parse_mode=enums.ParseMode.MARKDOWN,
    skip_updates=True,
)


# Check llama-server health
async def llama_health_check():
    url = API_URL + "/health"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                status = response.status
                response_json = await response.json()
                if status == 200:
                    logging.info("Llama-server Service is ok: %s", response_json)
                    return True
                else:
                    logging.error(
                        "Llama-server: Unexpected status code: %s", response_json
                    )
                    return False
    except Exception as e:
        logging.error("Llama-server: %s", e)
        return False


# Check llama-server properties
async def llama_props():
    if await llama_health_check() == True:
        global model_name
        url = API_URL + "/props"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                response_json = await response.json()
                model_name = response_json["default_generation_settings"]["model"]
                logging.info(f"Llama-server Loaded LLM Model: {model_name}")
    else:
        logging.error("Llama-server: Error loading LLM Model")
        model_name = "Error"
        return False


async def llama_completion(prompt):
    url = API_URL + "/completion"
    headers = {"Content-Type": "application/json"}
    pre_prompt = ""
    prompt = pre_prompt + prompt
    payload = {
        "prompt": prompt,
        "n_predict": 2048,
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, headers=headers) as response:
            response_json = await response.json()
            # Parse response
            if "content" in response_json:
                result = response_json["content"]
                # print(f"Response: {result}")
                return result
            else:
                logging.error(
                    "Llama-server: Unexpected response format: %s", response_json
                )
                return "`Failed to Process prompt`"


# Telegram Bot prompt Command
@bot.on_message(filters.command(GEN_COMMANDS))
async def handle_ket_command(bot, message):
    if not await llama_health_check():
        await message.reply_text(
            "`Backend not responding. Try again later`", quote=True
        )
        logging.error(
            f"UserID: {message.from_user.id} tried to use /ket command but backend is unreachable."
        )
        return

    chat_id, user_id = str(message.chat.id), str(message.from_user.id)
    if (
        user_id not in map(str, ADMINS)
        and chat_id not in map(str, ALLOWED_CHATS)
        and user_id not in map(str, ALLOWED_USERS)
    ):
        await message.reply_text("You are not authorized to use this bot.", quote=True)
        logging.warning(
            f"Unauthorized user: {message.from_user.id} tried to use /ket command."
        )
        return

    if len(message.command) < 2:
        await message.reply_text("Please provide a prompt.", quote=True)
        logging.warning(
            f"UserID: {message.from_user.id} invoked /ket command without a prompt."
        )
        return

    prompt = " ".join(message.command[1:])
    completion = await llama_completion(prompt)
    await message.reply_text(completion, quote=True)
    logging.info(
        f"UserID: {message.from_user.id} invoked /ket command with prompt: {prompt}"
    )


# System Status
def get_system_stats():
    cpu_usage = psutil.cpu_percent(interval=1)
    memory_usage = psutil.virtual_memory().percent
    cpu_temp = "Unsported OS/Board"
    os_name = os.uname().sysname if os.name != "nt" else "Microsoft Windows"
    if os_name == "Linux":
        try:
            with open("/sys/class/thermal/thermal_zone0/temp", "r") as temp_file:
                temp = int(temp_file.read()) / 1000.0
                cpu_temp = f"{temp:.2f}°C"
        except Exception as e:
            logging.error(f"[Status] Error reading CPU Temp: {e}")
            cpu_temp = "`I/O error`"
    if os.path.exists("/sys/devices/virtual/dmi/id/product_name"):
        with open("/sys/devices/virtual/dmi/id/product_name") as f:
            board_name = f.read().strip()
    elif os.path.exists("/proc/device-tree/model"):
        with open("/proc/device-tree/model") as f:
            board_name = f.read().strip()
    else:
        board_name = "Unkwon"

    return f"""
**System Status**
Version: `{VERSION}`
Board: `{board_name}`
OS: `{os_name}`
CPU Usage: `{cpu_usage}%`
Memory Usage: `{memory_usage}%`
CPU Temperature: `{cpu_temp}`
Backend: `Llama.cpp`
LLM Model: `{model_name}`
"""


# Telegram Bot /htatus Command
@bot.on_message(filters.command(["status", "boardinfo"]))
async def handle_status_info_command(bot, message):
    await message.reply_text(get_system_stats(), quote=True)
    logging.info(f"UserID: {message.from_user.id} invoked /status command.")


# Telegram Bot /help Command
@bot.on_message(filters.command(["help"]))
async def handle_help_command(bot, message):
    rnd_comm = random.choice(GEN_COMMANDS)
    await message.reply_text(
        f"To use {NAME}, type /{rnd_comm} followed by your prompt. For example:\n`/{rnd_comm} What is the meaning of life?`",
        quote=True,
    )
    logging.info(f"UserID: {message.from_user.id} invoked /help command.")


async def main():
    logging.info("Checking Backends")
    await llama_health_check()
    await llama_props()
    # await llama_completion("Hi, how are you?")
    logging.info("Starting Bot")
    await bot.start()
    await idle()
    logging.info("Starting Bot")
    await bot.stop()


if __name__ == "__main__":
    bot.run(main())
