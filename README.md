Usage:

1- Clone the repository\
`git clone `\
2- Create virtual environment\
`python3 -m venv .venv`\
3- Activate virtual environment\
`source .venv/bin/activate`\
4- Install requirements\
`pip install -r requirements.txt`\
5- Create .venv file and add the following content:

```
# bot stuff
BOT_TOKEN = 'Telegram_bot_token' #get it from BotFather
ALLOWED_USERS = 'userid1, userid2, userid3'
ALLOWED_CHATS= 'chatid1, chatid2, chatid3'
ADMIN_LIST= 'userid1, userid2, userid3'

# model stuff
LLM_MODEL = "model" #list models with ollama list
OLLAMA_API_URL = "http://locahost:11434" #default
```

6- Run the bot\
`python bot.py`