
import logging
from logging.handlers import RotatingFileHandler

from ketard.config import LogConfig


formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger()
logger.setLevel(
    logging.DEBUG if LogConfig.DEBUG else logging.INFO
)

stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)

if LogConfig.LOG_TO_FILE:
    file_handler = RotatingFileHandler(
        LogConfig.LOG_FILE_PATH,
        maxBytes=10 * 1024 * 1024,
        backupCount=10,
        encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

logging.getLogger("pyrogram").setLevel(logging.ERROR)
logging.getLogger("langchain_community").setLevel(logging.ERROR)
