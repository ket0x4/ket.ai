import os
import sys
import json

from ketard.logger.logging import LOGGER


def strtobool(val):
    val = val.lower()
    if val in ("y", "yes", "t", "true", "on", "1"):
        return True
    elif val in ("n", "no", "f", "false", "off", "0"):
        return False
    else:
        raise ValueError("invalid truth value %r" % val)


def initialize_config(config):
    LOGGER(__name__).info("Checking variables...")
    required_vars = [
        ("BotConfig", "BOT_NAME"),
        ("BotConfig", "API_ID"),
        ("BotConfig", "API_HASH"),
        ("BotConfig", "BOT_TOKEN"),
        ("LogConfig", "LOG_TO_FILE"),
        ("LogConfig", "DEBUG"),
        ("ApiConfig", "API_URL"),
        ("ApiConfig", "LLM_MODEL"),
        ("DataConfig", "ADMINS"),
        ("DbConfig", "DB_NAME"),
        ("GitConfig", "UPSTREAM_REPO"),
        ("GitConfig", "UPSTREAM_BRANCH"),
    ]
    for section, var_name in required_vars:
        try:
            if not config[section].get(var_name):
                raise KeyError
        except KeyError:
            LOGGER(__name__).error(f"'{var_name}' not found in {section}!")
            sys.exit()
    LOGGER(__name__).info("All required variables collected.")


def get_config():
    if os.path.exists("config.json"):
        with open("config.json") as f:
            config = json.load(f)
        initialize_config(config)
    else:
        LOGGER(__name__).warning(
            "Please create a configuration file ('cp sample_config.json config.json') and fill in the necessary variables."
        )
        sys.exit()

    return config
