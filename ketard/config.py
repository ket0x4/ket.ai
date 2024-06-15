
import os
import json
from pathlib import Path


def strtobool(val):
    val = val.lower()
    if val in ('y', 'yes', 't', 'true', 'on', '1'):
        return True
    elif val in ('n', 'no', 'f', 'false', 'off', '0'):
        return False
    else:
        raise ValueError("invalid truth value %r" % val)


if os.path.exists("config.json"):
    with open("config.json") as f:
        config = json.load(f)

class BotConfig:
    BOT_NAME = str(config["BotConfig"]["BOT_NAME"])
    API_ID = int(config["BotConfig"]["API_ID"])
    API_HASH = str(config["BotConfig"]["API_HASH"])
    BOT_TOKEN = str(config["BotConfig"]["BOT_TOKEN"])
    UPSTREAM_BRANCH = str(config["BotConfig"]["UPSTREAM_BRANCH"])

class LogConfig:
    DEBUG = strtobool(config["LogConfig"]["DEBUG"])
    DEBUG_TOKEN = str(config["LogConfig"]["DEBUG_TOKEN"])
    LOG_TO_FILE = strtobool(config["LogConfig"]["LOG_TO_FILE"])
    LOG_FILE_PATH = Path(config["LogConfig"]["LOG_FILE_PATH"])
    WORKERS = int(config["LogConfig"]["WORKERS"])

class ApiConfig:
    API_URL = str(config["ApiConfig"]["API_URL"])
    LLM_MODEL = str(config["ApiConfig"]["API_URL"])
    LITE = strtobool(config["ApiConfig"]["LITE"])
    BOARD = str(config["ApiConfig"]["BOARD"])

class DataConfig:
    OWNER_ID = int(config["DataConfig"]["OWNER_ID"])
    GEN_COMMANDS = config["DataConfig"]["GEN_COMMANDS"]
    ADMINS = config["DataConfig"]["ADMINS"]
    USERS = config["DataConfig"]["USERS"]
    GROUPS = config["DataConfig"]["GROUPS"]
