import logging
import os
import psutil
import json
import telebot
import requests
from langchain_community.llms import Ollama
import threading

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
        OWNER = data["owner"]
        API_URL = data["api_url"]
        LLM_MODEL = data["llm_model"]
        VISION_MODEL = data["vision_model"]
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


bot = telebot.TeleBot(TOKEN)
ollama = Ollama(base_url=API_URL, model=LLM_MODEL)
process_next_message = False
queue_count = 0
board = "Raspberry Pi 4"
version = "2.2-testing"


# Restart Ollama command
@bot.message_handler(commands=["restart"])
def restart_bot(message):
    if str(message.from_user.id) in map(str, ADMINS):
        bot.reply_to(message, f"Restarting {NAME}...")
        logging.info(f"`Restarting {NAME}...`", parse_mode="Markdown")
        try:
            # os.system("sudo systemctl restart ollama.service")
            bot.send_message(ADMINS[0], f"{NAME} restarted.")
        except Exception as e:
            bot.reply_to(
                message, f"An error occurred: {str(e)}. Sending error logs to admins..."
            )
            logging.error(f"Error while restarting: {str(e)}")
    else:
        bot.reply_to(message, "You are not allowed to use this command.")
        logging.warning("Unauthorized restart attempt.")


# Change model command
@bot.message_handler(commands=["model"])
def handle_model_command(message):
    if str(message.from_user.id) in map(str, ADMINS):
        command = message.text.split()[0]
        user_id = message.text.split()[1]
        if LITE:
            bot.reply_to(
                message,
                f"Using other model than phi3-mini not supported on `{board}`. To override, set `lite` to False in settings.json",
                parse_mode="Markdown",
            )
        else:
            bot.reply_to(message, "`Not implemented yet.`", parse_mode="Markdown")
        logging.info("Model change command invoked.")
    else:
        bot.reply_to(message, "You are not allowed to use this command.")
        logging.warning(f"{user_id} tried to use restricted command.")


# Add/remove allowed users
@bot.message_handler(commands=["allow", "remove"])
def handle_allow_command(message):
    if str(message.from_user.id) in map(str, ADMINS):
        command = message.text.split()[0]
        user_id = message.text.split()[1]
        if command == "/allow":
            if user_id not in ALLOWED_USERS:
                ALLOWED_USERS.append(user_id)
                bot.reply_to(message, f"User {user_id} added to allowed users.")
                logging.info(f"User {user_id} added to allowed users.")
            else:
                bot.reply_to(
                    message, f"User {user_id} is already in the allowed users list."
                )
                logging.warning(f"User {user_id} is already in the allowed users list.")
        elif command == "/remove":
            if user_id in ALLOWED_USERS:
                ALLOWED_USERS.remove(user_id)
                bot.reply_to(message, f"User {user_id} removed from allowed users.")
                logging.info(f"User {user_id} removed from allowed users.")
            else:
                bot.reply_to(
                    message, f"User {user_id} is not in the allowed users list."
                )
                logging.warning(f"User {user_id} is not in the allowed users list.")
    else:
        bot.reply_to(message, "You are not allowed to use this command.")
        logging.warning(f"{user_id} tried to use restricted command.")


# Initial vision model support
@bot.message_handler(commands=["vision"])
def handle_vision_command(message):
    user_id = message.text.split()[1]
    bot.reply_to(message, "`Not implemented yet.`", parse_mode="Markdown")
    logging.info(f"{user_id} tried to use unimplemented command: /vision")


# Initial OCR support
@bot.message_handler(commands=["ocr"])
def handle_ocr_command(message):
    user_id = message.text.split()[1]
    bot.reply_to(message, "`Not implemented yet.`", parse_mode="Markdown")
    logging.info(f"{user_id} tried to use unimplemented command: /ocr")


# Initialize a global variable for the queue
queue_count = 0


# Handle incoming messages with /ket command
@bot.message_handler(commands=["ket", "sor", "ask", "zirlamican"])
def handle_ket_command(message):
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
            bot.reply_to(
                message,
                f"`{NAME}` Processing your prompt. Check `/status` for more info. `/stopgen` to stop.",
                parse_mode="Markdown",
            )

            prompt = message.text.replace("/ket", "").strip()
            response = ollama.invoke(prompt)
            bot.reply_to(message, response, parse_mode="Markdown")
            logging.info(
                f"Processed /ket command from user {user_id} in chat {chat_id}."
            )
            queue_count -= 1  # Decrease the queue count after sending the reply
        else:
            bot.reply_to(message, "Ket.ai not allowed on this chat.")
            logging.warning(
                f"Unauthorized /ket command attempt by user {user_id} in chat {chat_id}."
            )
    except Exception as e:
        bot.send_message(ADMINS[0], f"An error occurred: {str(e)}")
        logging.error(f"Error processing /ket command: {str(e)}")


# Handle help command
@bot.message_handler(commands=["help"])
def handle_help_command(message):
    bot.reply_to(
        message,
        "To use Ket.ai, type /ket followed by your prompt. For example, /ket What is the meaning of life?\nCreator: @ket0x004",
    )
    logging.info("Help command invoked.")


# Handle status command
@bot.message_handler(commands=["status"])
def handle_status_command(message):
    ollama_status = "`Avabile`" if check_ollama_api() else "`Not available`"
    load = os.getloadavg()
    cpu_load = f"{load[0]:.2f}"
    threading.Thread(
        target=send_status_message, args=(message, ollama_status, cpu_load)
    ).start()
    logging.info("Status command invoked.")


def send_status_message(message, ollama_status, cpu_load):
    bot.reply_to(
        message,
        f"Ollama api: {ollama_status}\nCPU load: `{cpu_load}%`\nDebug: `{DEBUG}`\nLite: `{LITE}`\nVersion: `{version}`\nQueued prompts: `{queue_count}`",
        parse_mode="Markdown",
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
@bot.message_handler(commands=["boardinfo"])
def handle_board_info_command(message):
    """Get system information."""
    threading.Thread(target=send_board_info_message, args=(message,)).start()
    logging.info("Board info command invoked.")


def send_board_info_message(message):
    try:
        device = f"**Board:** `{board}`"
        cpu_usage = get_cpu_usage()
        ram_usage = get_ram_usage()
        cpu_temp = get_cpu_temperature()
        info = f"{device}\n{cpu_usage}\n{ram_usage}\n{cpu_temp}"
        bot.reply_to(message, info, parse_mode="Markdown")
    except Exception as e:
        bot.send_message(ADMINS[0], f"An error occurred: {str(e)}")
        logging.error(f"Error fetching board info: {str(e)}")


try:
    bot.polling()
except telebot.apihelper.ApiException as e:
    logging.error(f"An API exception occurred: {str(e)}")
except KeyboardInterrupt:
    bot.stop_polling()
    logging.info("Exiting...")
