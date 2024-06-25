
import random
from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import my_filters
from ketard.config import DataConfig, BotConfig
from ketard.logging import LOGGER


@Client.on_message(
    filters.command(["help"])
    & my_filters.is_user_spamming()
)
async def handle_help_command(_, message: Message):
    rnd_comm = random.choice(DataConfig.GEN_COMMANDS)
    await message.reply_text(
        f"To use {BotConfig.BOT_NAME}, type /{rnd_comm} followed by your prompt. For example:\n`/{rnd_comm} What is the meaning of life?`",
        quote=True
    )
    LOGGER(__name__).info("Help command invoked.")
