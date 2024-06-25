from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import VERSION, my_filters
from ketard.config import DataConfig, BotConfig, ApiConfig, LogConfig
from ketard.logging import LOGGER


@Client.on_message(filters.command(["start"]) & my_filters.is_user_spamming())
async def handle_start_command(_, message: Message):
    start_message = f"""
Hello! {message.from_user.mention}
I am the `{BotConfig.BOT_NAME}` bot.\n
General Commands:
- `/help` : Shows the help message.
- `/status` or `/boardinfo` : Displays system information.
- `/about` : Shows information about the bot.
- `/vidsum` : Summarizes the video. (WIP)
- `/textsum` : Summarizes the text. (experimental)
- `{", ".join("/{cmd}".format(cmd=cmd) for cmd in DataConfig.GEN_COMMANDS)}` : Generates a response based on the given command.\n
For questions and feedback, you can message the admins.
    """

    await message.reply_text(start_message, quote=True)
    LOGGER(__name__).info("Start command invoked.")
