
from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import LOGGER, system_status


@Client.on_message(
    filters.command(["status", "boardinfo"])
)
async def handle_status_info_command(_, message: Message):
    """Get system information."""
    info = system_status.send_status_info_message()

    await message.reply_text(info, quote=True)
    
    LOGGER(__name__).info("Status info command invoked.")
