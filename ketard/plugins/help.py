from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import my_filters
from ketard.config import DataConfig
from ketard.logger.logging import LOGGER


@Client.on_message(filters.command(["help"]) & my_filters.is_user_spamming())
async def handle_help_command(_, message: Message):
    help_text = """
**Available commands:**
- `/ket`: Enter text after command or reply to message/audio file. Ask Questions, Request code samples and more.
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
- `/ket What is the smallest integer whose square is between 15 and 30?`
- `/sum youtube.com/watch?v=uqK_8Qic5os`

**Note:** You must be on the list of allowed Users or Chats to use this bot.
    """
    LOGGER(__name__).info("Help command invoked.")
