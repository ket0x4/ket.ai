import telebot
from langchain_community.llms import Ollama
import time, os
from dotenv import load_dotenv

# load environment variables
load_dotenv()
BOT_TOKEN = os.getenv('BOT_TOKEN')
OLLAMA_API_URL = os.getenv('OLLAMA_API_URL')
LLM_MODEL = os.getenv('LLM_MODEL')
ALLOWED_CHATS = os.getenv('ALLOWED_CHATS').split(',')
ALLOWED_USERS = os.getenv('ALLOWED_USERS').split(',')
ADMIN_LIST = os.getenv('ADMIN_LIST').split(',')

bot = telebot.TeleBot(BOT_TOKEN)
ollama = Ollama(base_url=OLLAMA_API_URL, model=LLM_MODEL)
process_next_message = False

# handle incoming messages with /ket command
@bot.message_handler(commands=['ket'])
def handle_ket_command(message):
    global process_next_message
    process_next_message = True
    try:
        if str(message.chat.id) in ALLOWED_CHATS or str(message.from_user.id) in ALLOWED_USERS:
            prompt = message.text.split(' ', 1)[1] if len(message.text.split(' ', 1)) > 1 else ''
            response = ollama.invoke(prompt)
            bot.reply_to(message, response,type="markdown")
        else:
            bot.reply_to(message, "Ket.ai not allowed on this chat.")
    except Exception as e:
        bot.send_message(ADMIN_LIST[0], f"An error occurred: {str(e)}")
        pass

@bot.message_handler(commands=['help'])
def handle_help_command(message):
    bot.reply_to(message, "To use Ket.ai, type /ket followed by your prompt. For example, /ket What is the meaning of life?")
    pass

@bot.message_handler(commands=['status'])
def handle_status_command(message):
    bot.reply_to(message,"Not implemented yet.")

while True:
    try:
        bot.polling()
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        time.sleep(10)  # wait for 10 seconds before retrying
