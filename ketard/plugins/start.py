from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import LOGGER, VERSION
from ketard.config import DataConfig, BotConfig, ApiConfig, LogConfig


@Client.on_message(filters.command(["start"]))
async def handle_start_command(_, message: Message):
    start_message = f"""
👋 Hello! I am the `{BotConfig.BOT_NAME}` bot.\n\n
💡 For help, you can use the `/help` command.\n\n
📜 General Commands:\n
- `/help` : Shows the help message.\n
- `/status` or `/boardinfo` : Displays system information.\n
- `{", ".join("/{cmd}".format(cmd=cmd) for cmd in DataConfig.GEN_COMMANDS)}` : Generates a response based on the given command.\n\n
🔧 Debug mode: `{LogConfig.DEBUG}`\n
🌟 Lite mode: `{ApiConfig.LITE}`\n
📦 Version: `{VERSION}`\n\n
📬 For questions and feedback, you can message the admins.
    """
    
    await message.reply_text(start_message, quote=True)
    LOGGER(__name__).info("Start command invoked.")
