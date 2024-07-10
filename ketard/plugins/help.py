
from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import my_filters
from ketard.config import DataConfig, BotConfig
from ketard.logger.logging import LOGGER


@Client.on_message(
    filters.command(["help"])
    & my_filters.is_user_spamming()
)
async def handle_help_command(_, message: Message):
    help_text = """
**Hi, {USER}**

{BOT_NAME} is LLM frontend for multiple backends.
You can ask questions, describe images, summarize
YouTube videos, OCR documents and images(soon) with me.

**Available commands:**
- `/ket`: Enter text after command or reply to message/audio file. Ask Questions, Request code samples and more.
- {GEN_COMMANDS}: Alias for `/ket` command
- `/ddg`: Same as `/ket` command but uses Duckduckgo's DuckChat backend
- `/sum`: Enter YouTube URL after command. Summarize YouTube videos(WIP)
- `/status`: Get host server and api status information.
- `/help`: Displays this message.
    """

    if message.from_user.id in DataConfig.ADMINS:
        help_text += """
**Admin commands:**
- `/add_chat [chat_id]`: Adds a chat to the allowed list. If no ID is provided, the current chat will be used.
- `/del_chat [chat_id]`: Removes a chat from the allowed list. If no ID is provided, the current chat will be used.
- `/get_chats`: Lists all allowed chats.
- `/add_user [user_id]`: Adds a user to the allowed list. If no ID is provided, the user in the replied message will be used.
- `/del_user [user_id]`: Removes a user from the allowed list. If no ID is provided, the user in the replied message will be used.
- `/get_users`: Lists all allowed users.
- `/getlog [n]`: Retrieves the last `n` lines from the log file. If `-f` is provided, the entire log file will be sent as a document.
- `/update`: Checks for available updates and applies them if found.
        """
    
    help_text += """
**Examples:**
- `/ket Should I kill myself?`
- `/ddg What is the smallest integer whose square is between 15 and 30?`
- `/sum https://www.youtube.com/watch?v=uqK_8Qic5os`

[Github Repo](https://github.com/ket0x4/ketard-ai/tree/dev)
[Contributors](https://github.com/ket0x4/ketard-ai/graphs/contributors)

**Note:** You must be on the list of allowed Users or Chats to use this bot.
    """
    if "ket" in DataConfig.GEN_COMMANDS:
        DataConfig.GEN_COMMANDS.remove("ket")

    GEN_COMMANDS = ", ".join([f"`/{command}`" for command in DataConfig.GEN_COMMANDS])
    await message.reply_text(
        text=help_text.format(
            USER=message.from_user.mention,
            BOT_NAME=BotConfig.BOT_NAME,
            GEN_COMMANDS=GEN_COMMANDS
        ),
        quote=True,
        disable_web_page_preview=True
    )

    LOGGER(__name__).info("Help command invoked.")
