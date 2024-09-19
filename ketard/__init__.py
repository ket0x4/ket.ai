import sys
import ketard.logger.logger_config

from pyrogram import Client, enums

from langchain_community.llms import Ollama
from ketard.config import BotConfig, LogConfig, ApiConfig
from ketard.utils.paste import Paste
from ketard.utils.filters import MyFilters
from ketard.utils.wrappers import permission_checker
from ketard.utils.status_info import SystemStatus
from ketard.utils.initialize_git import initialize_git


VERSION = "3.0.0"


initialize_git()


def get_bot_token():
    if LogConfig.DEBUG:
        from ketard.logger.logging import LOGGER

        LOGGER(__name__).info("Debug mode enabled.")
        if LogConfig.DEBUG_TOKEN:
            BOT_TOKEN = LogConfig.DEBUG_TOKEN
            LOGGER(__name__).info("Using debug token.")
        else:
            LOGGER(__name__).warning(
                "No debug token found in config.json. Please check the config.json file."
            )
            sys.exit()
    else:
        BOT_TOKEN = BotConfig.BOT_TOKEN

    return BOT_TOKEN


ketard: Client = Client(
    name=BotConfig.BOT_NAME,
    api_id=BotConfig.API_ID,
    api_hash=BotConfig.API_HASH,
    bot_token=get_bot_token(),
    parse_mode=enums.ParseMode.MARKDOWN,
    plugins=dict(root="ketard.plugins"),
)


ollama: Ollama = Ollama(base_url=ApiConfig.API_URL, model=ApiConfig.LLM_MODEL)


system_status = SystemStatus(
    version=VERSION,
    lite=ApiConfig.LITE,
    debug=LogConfig.DEBUG,
    api_url=ApiConfig.API_URL,
)


paste = Paste()


my_filters = MyFilters()
