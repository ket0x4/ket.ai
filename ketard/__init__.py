
from pyrogram import Client
from langchain_community.llms import Ollama

from ketard.config import BotConfig, LogConfig, ApiConfig
from ketard.utils.logging import LOGGER
from ketard.utils.status_info import SystemStatus

VERSION = "3.0.0"

LOGGER = LOGGER

if LogConfig.DEBUG:
    LOGGER(__name__).info("Debug mode enabled.")
    if LogConfig.DEBUG_TOKEN:
        BOT_TOKEN = LogConfig.DEBUG_TOKEN
        LOGGER(__name__).info("Using debug token.")
    else:
        LOGGER(__name__).warning(
            "Debug token not found in config.env. Using default."
        )
else:
    BOT_TOKEN = BotConfig.BOT_TOKEN


ketard: Client = Client(
    name=BotConfig.BOT_NAME,
    api_id=BotConfig.API_ID,
    api_hash=BotConfig.API_HASH,
    bot_token=BOT_TOKEN,
    plugins=dict(root="ketard.plugins")
)


ollama: Ollama = Ollama(
    base_url=ApiConfig.API_URL,
    model=ApiConfig.LLM_MODEL
)


system_status = SystemStatus(
    board=ApiConfig.BOARD,
    version=VERSION,
    lite=ApiConfig.LITE,
    debug=LogConfig.DEBUG,
    api_url=ApiConfig.API_URL
)
