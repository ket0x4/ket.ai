from pyrogram import Client, filters
from pyrogram.types import Message
import os
from ketard import paste, my_filters
from ketard.config import LogConfig, DataConfig
from ketard.logging import LOGGER


@Client.on_message(
    filters.command(["getlog"])
    & filters.user(DataConfig.ADMINS)
    & my_filters.is_user_spamming()
)
async def get_log(_, message: Message):
    try:
        if LogConfig.LOG_TO_FILE:
            if os.path.exists(LogConfig.LOG_FILE_PATH):
                l = open(LogConfig.LOG_FILE_PATH)
                lines = l.readlines()
                data = ""
                cmd = message.command
                if len(cmd) > 1:
                    if cmd[1] == "-f":
                        return await message.reply_document(
                            LogConfig.LOG_FILE_PATH, quote=True
                        )
                    else:
                        num_line = int(cmd[1])
                else:
                    num_line = 100

                for x in lines[-num_line:]:
                    data += x
                link = await paste.dpaste(text=data, lexer="_code")
                await message.reply_text(
                    text=link, quote=True, disable_web_page_preview=True
                )
            else:
                await message.reply_text("Log file not found.", quote=True)
        else:
            await message.reply_text("Logging to file is disabled.", quote=True)
    except Exception as e:
        LOGGER(__name__).error(f"Error: {str(e)}")
