from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import VERSION, my_filters
from ketard.config import BotConfig
from ketard.logger.logging import LOGGER


@Client.on_message(filters.command(["start"]) & my_filters.is_user_spamming())
async def handle_start_command(_, message: Message):
    start_text = """
**Hello, {USER}!**

Welcome to {BOT_NAME}! I'm here to assist you with various tasks. Here are a few things you can do with me:

- Ask questions on any topic.
- Get code samples and snippets.
- Summarize YouTube videos.
- Describe images and more (work in progress)!

To get started, simply type a command or ask me a question.
For a list of available commands, type `/help`.

Happy exploring!

[Github Repo](https://github.com/ket0x4/ketard-ai/tree/dev)
[Contributors](https://github.com/ket0x4/ketard-ai/graphs/contributors)
    """

    await message.reply_text(
        text=start_text.format(
            USER=message.from_user.mention,
            BOT_NAME=BotConfig.BOT_NAME,
        ),
        quote=True,
        disable_web_page_preview=True
    )
    
    LOGGER(__name__).info("Start command invoked.")
