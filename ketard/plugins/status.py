
from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import (
    permission_checker,
    system_status,
    my_filters
)
from ketard.logger.logging import LOGGER


@Client.on_message(
    filters.command(["status", "boardinfo"])
    & my_filters.is_user_spamming()
)
@permission_checker
async def handle_status_info_command(_, message: Message):
    info = system_status.status_info_message()

    await message.reply_text(info, quote=True)
    
    LOGGER(__name__).info("Status info command invoked.")
