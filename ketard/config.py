
from pathlib import Path

from ketard.utils.initialize_config import get_config, strtobool


config = get_config()

class BotConfig:
    BOT_NAME = str(config["BotConfig"]["BOT_NAME"])
    API_ID = int(config["BotConfig"]["API_ID"])
    API_HASH = str(config["BotConfig"]["API_HASH"])
    BOT_TOKEN = str(config["BotConfig"]["BOT_TOKEN"])
    UPSTREAM_BRANCH = str(config["BotConfig"]["UPSTREAM_BRANCH"])

class LogConfig:
    DEBUG = strtobool(config["LogConfig"]["DEBUG"])
    if DEBUG:
        DEBUG_TOKEN = str(config["LogConfig"]["DEBUG_TOKEN"])
    LOG_TO_FILE = strtobool(config["LogConfig"]["LOG_TO_FILE"])
    if LOG_TO_FILE:
        LOG_FILE_PATH = Path(config["LogConfig"]["LOG_FILE_PATH"])

class ApiConfig:
    API_URL = str(config["ApiConfig"]["API_URL"])
    LLM_MODEL = str(config["ApiConfig"]["LLM_MODEL"])
    LITE = strtobool(config["ApiConfig"]["LITE"])

class DataConfig:
    GEN_COMMANDS = config["DataConfig"]["GEN_COMMANDS"]
    if GEN_COMMANDS:
        GEN_COMMANDS = ["ket", "ask"]
    ADMINS = config["DataConfig"]["ADMINS"]

class DbConfig:
    DB_NAME = Path(config["DbConfig"]["DB_NAME"])


import ketard.logger_config
