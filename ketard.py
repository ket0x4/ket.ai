import logging
import os
import psutil
import json
import requests
from langchain_community.llms import Ollama
import threading

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
        OWNER = data["owner"]
        API_URL = data["api_url"]
        LLM_MODEL = data["llm_model"]
        VISION_MODEL = data["vision_model"]
        GEN_COMMANDS = data["gen_commands"]
except FileNotFoundError:
    logging.critical("settings.json file not found. Please create one.")
    exit(1)

# Set up logging
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("bot.log"), logging.StreamHandler()],
)

# Set up token
if DEBUG:
    logging.info("Debug mode enabled.")
    if data["debug_token"]:
        TOKEN = data["debug_token"]
        logging.info("Using debug token.")
else:
    logging.warning("Debug token not found in settings.json. Using default token.")
    TOKEN = data["token"]


# Ollama setup
def ollama_function(model, prompt):
    global ollama_url
    if not model:
        model = LLM_MODEL
    ollama_url = f"{API_URL}/api/generate"
    data = f'{{ "model": "{model}", "prompt": "{prompt}" }}'
    # Example for making HTTP request:
    # response = requests.post(url, json=data)
    # Handle response appropriately


# check ollama api reachability
def check_ollama_api():
    try:
        response = requests.get(API_URL)
        if response.status_code == 200:
            return True
        else:
            return False
    except requests.exceptions.RequestException as e:
        return False


bot = Client(
    name=data["bot"],
    api_id=data["api_id"],
    api_hash=data["api_hash"],
    bot_token=TOKEN,
    parse_mode=enums.ParseMode.MARKDOWN,
    # skip_updates (bool, optional) – Pass True to skip pending updates that arrived while the client was offline. Defaults to True.
)
ollama = Ollama(base_url=API_URL, model=LLM_MODEL)
process_next_message = False
queue_count = 0
board = BOARD
version = "2.2-testing"


# Restart Ollama command
@bot.on_message(filters.command(["restart"]))
async def restart_bot(bot, message):
    if str(message.from_user.id) in map(str, ADMINS):
        x = await message.reply_text(
            f"Restarting {NAME}...",
            quote=True
        )
        logging.info(
            f"`Restarting {NAME}...`"
        )
        try:
            # os.system("sudo systemctl restart ollama.service")
            await bot.send_message(
                ADMINS[0],
                f"{NAME} restarted."
            )
        except Exception as e:
            await x.edit_text(
                f"An error occurred: {str(e)}. Sending error logs to admins..."
            )
            logging.error(
                f"Error while restarting: {str(e)}"
            )
    else:
        await message.reply_text(
            "You are not allowed to use this command.",
            quote=True
        )
        logging.warning("Unauthorized restart attempt.")


# Change model command
@bot.on_message(filters.command(["model"]))
async def handle_model_command(bot, message):
    if str(message.from_user.id) in map(str, ADMINS):
        command = message.text.split()[0]
        user_id = message.text.split()[1]
        if LITE:
            await message.reply_text(
                f"Using other model than phi3-mini not supported on `{board}`. To override, set `lite` to False in settings.json",
                quote=True
            )
        else:
            await message.reply_text(
                "`Not implemented yet.`",
                quote=True
            )
        logging.info("Model change command invoked.")
    else:
        await message.reply_text(
            "You are not allowed to use this command.",
            quote=True
        )
        logging.warning(
            f"{user_id} tried to use restricted command."
        )


# Add/remove allowed users
@bot.on_message(filters.command(["allow", "remove"]))
async def handle_allow_command(bot, message):
    if str(message.from_user.id) in map(str, ADMINS):
        command = message.command[0]
        user_id = message.command[1]
        if command == "/allow":
            if user_id not in ALLOWED_USERS:
                ALLOWED_USERS.append(user_id)
                await message.reply_text(
                    f"User {user_id} added to allowed users.",
                    quote=True
                )
                logging.info(
                    f"User {user_id} added to allowed users."
                )
            else:
                await message.reply_text(
                    f"User {user_id} is already in the allowed users list.",
                    quote=True
                )
                logging.warning(
                    f"User {user_id} is already in the allowed users list."
                )
        elif command == "/remove":
            if user_id in ALLOWED_USERS:
                ALLOWED_USERS.remove(user_id)
                await message.reply_text(
                    f"User {user_id} removed from allowed users.",
                    quote=True
                )
                logging.info(
                    f"User {user_id} removed from allowed users."
                )
            else:
                await message.reply_text(
                    f"User {user_id} is not in the allowed users list.",
                    quote=True
                )
                logging.warning(
                    f"User {user_id} is not in the allowed users list."
                )
    else:
        await message.reply_text(
            "You are not allowed to use this command.",
            quote=True
        )
        logging.warning(
            f"{user_id} tried to use restricted command."
        )


# Initial vision model support
@bot.on_message(filters.command(["vision"]))
async def handle_vision_command(bot, message):
    user_id = message.text.split()[1]
    await message.reply_text(
        "`Not implemented yet.`",
        queue=True
    )
    logging.info(
        f"{user_id} tried to use unimplemented command: /vision"
    )


# Initial OCR support
@bot.on_message(commands(["ocr"]))
async def handle_ocr_command(bot, message):
    user_id = message.text.split()[1]
    await message.reply_text(
        "`Not implemented yet.`",
        quote=True
    )
    logging.info(
        f"{user_id} tried to use unimplemented command: /ocr"
    )


# Initialize a global variable for the queue
queue_count = 0


# Handle incoming messages with /ket command
@bot.on_message(filters.command(GEN_COMMANDS))
async def handle_ket_command(bot, message):
    global process_next_message
    global queue_count  # Use the global queue_count variable
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
                1  # Increase the queue count when a new user uses the /ket command
            )

            prompt = message.text.split(' ', 1)
            if len(prompt) == 1 or not prompt[1].strip():
                await message.reply_text(
                    "Please enter a message after the command.",
                    quote=True
                )
                queue_count -= 1  # Decrease the queue count if no prompt is provided
                return
            
            prompt = prompt[1].strip()

            await message.reply_text(
                f"`{NAME}` Processing your prompt. Check `/status` for more info. `/stopgen` to stop.",
                quote=True
            )

            prompt = message.text.replace("/ket", "").strip()
            response = ollama.invoke(prompt)
            await message.reply_text(
                response, quote=True
            )
            logging.info(
                f"Processed /ket command from user {user_id} in chat {chat_id}."
            )
            queue_count -= 1  # Decrease the queue count after sending the reply
        else:
            await message.reply_text(
                "Ket.ai not allowed on this chat.",
                quote=True
            )
            logging.warning(
                f"Unauthorized /ket command attempt by user {user_id} in chat {chat_id}."
            )
    except Exception as e:
        await bot.send_message(
            ADMINS[0],
            f"An error occurred: {str(e)}"
        )
        logging.error(
            f"Error processing /ket command: {str(e)}"
        )


# Handle help command
@bot.on_message(filters.command(["help"]))
async def handle_help_command(bot, message):
    await message.reply_text(
        "To use Ket.ai, type /ket followed by your prompt. For example, /ket What is the meaning of life?\nCreator: @ket0x004",
        quote=True
    )
    logging.info("Help command invoked.")


# Handle status command
@bot.on_message(filters.command(["status"]))
async def handle_status_command(bot, message):
    ollama_status = "`Available`" if check_ollama_api() else "`Not available`"
    load = os.getloadavg()
    cpu_load = f"{load[0]:.2f}"
    threading.Thread(
        target=send_status_message, args=(message, ollama_status, cpu_load)
    ).start()
    logging.info("Status command invoked.")


async def send_status_message(message, ollama_status, cpu_load):
    await message.reply_text(
        f"Ollama api: {ollama_status}\nCPU load: `{cpu_load}%`\nDebug: `{DEBUG}`\nLite: `{LITE}`\nVersion: `{version}`\nQueued prompts: `{queue_count}`",
        quote=True
    )


# Get system usage info
def get_cpu_usage():
    """Get current CPU usage percentage."""
    cpu_pct = str(
        round(
            float(
                os.popen(
                    """grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage }' """
                ).readline()
            ),
            2,
        )
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
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as temp_file:
            temp = int(temp_file.read()) / 1000.0
            return f"**CPU Temperature:** `{temp:.2f}°C`"
    except FileNotFoundError:
        return "`Unable to read CPU temperature.`"


# Handle board info command
@bot.on_message(filters.command(["boardinfo"]))
async def handle_board_info_command(bot, message):
    """Get system information."""
    threading.Thread(target=send_board_info_message, args=(message,)).start()
    logging.info("Board info command invoked.")


async def send_board_info_message(message):
    try:
        device = f"**Board:** `{board}`"
        cpu_usage = get_cpu_usage()
        ram_usage = get_ram_usage()
        cpu_temp = get_cpu_temperature()
        info = f"{device}\n{cpu_usage}\n{ram_usage}\n{cpu_temp}"
        await message.reply_text(
            info, quote=True
        )
    except Exception as e:
        await bot.send_message(
            ADMINS[0],
            f"An error occurred: {str(e)}"
        )
        logging.error(
            f"Error fetching board info: {str(e)}"
        )


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
