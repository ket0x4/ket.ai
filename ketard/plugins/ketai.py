from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import permission_checker, system_status, paste, my_filters
from ketard.config import DataConfig, BotConfig
from ketard.logger.logging import LOGGER
from ketard.utils.ollama import ollama_invoke
from ketard.utils.helper import get_prompt, send_log


@Client.on_message(filters.command("/ket") & my_filters.is_user_spamming())
@permission_checker
async def handle_ket_command(client: Client, message: Message):
    prompt = await get_prompt(message=message)

    if prompt is None:
        return await message.reply_text(
            "Please enter a message after the command.", quote=True
        )

    try:
        if not system_status.check_ollama_api():
            return await message.reply_text(
                "API not responding. Please try again later.", quote=True
            )

        msg = await message.reply_text(
            f"`{BotConfig.BOT_NAME}` Processing your prompt...",
            quote=True,
        )
        response, info = await ollama_invoke(prompt=prompt)

        formatted_response = response + info
        if len(formatted_response) > 4090:
            p_link = await paste.paste(text=response)
            formatted_response = (
                f"The output is too long, [click to see]({p_link}){info}"
            )

        await message.reply_text(
            text=formatted_response, quote=True, disable_web_page_preview=True
        )
        await msg.delete()
        LOGGER(__name__).info(
            f"Processed prompt from user {message.from_user.id} in chat {message.chat.id}."
        )
    except Exception as e:
        await send_log(client=client, error=e, message=message, name=__name__)
