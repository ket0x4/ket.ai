import os
import asyncio
from datetime import datetime
from traceback import format_exception

from pyrogram import Client, enums
from pyrogram.types import Message
from pyrogram.errors import FloodWait

from ketard.config import DataConfig
from ketard.logger.logging import LOGGER
from ketard.utils.stt import SpeechRecognizer


async def split_text(text: str, message: Message) -> Message:
    part_length = 4090
    parts = [text[i : i + part_length] for i in range(0, len(text), part_length)]
    for part in parts:
        message = await message.reply_text(
            text=part, quote=True, disable_web_page_preview=True
        )
    return message


async def get_prompt(message: Message):
    prompt_parts = []

    if message.command and len(message.command) > 1:
        prompt_parts.append(" ".join(message.command[1:]))

    if message.reply_to_message:
        if message.reply_to_message.voice:
            voice = await message.reply_to_message.download()
            recognizer = SpeechRecognizer()
            voice_text = await recognizer.convert_and_recognize(voice=voice)
            prompt_parts.append(voice_text)
            os.remove(voice)
            os.remove(f"{voice}.wav")
        else:
            prompt_parts.append(message.reply_to_message.text or message.reply_to_message.caption)

    return "\n".join(prompt_parts) if prompt_parts else None


async def send_log(client: Client, error: Exception, message: Message, name: str):
    try:
        error_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        error = format_exception(error)

        msg = f"""#ERROR
**Time:** `{error_time}`
**User:** {message.from_user.mention} (`{message.from_user.id}`)
**Chat:** {message.chat.id}
**Error:** ```\n{error}```
        """
        for user in DataConfig.ADMINS:
            await client.send_message(
                chat_id=user, text=msg, parse_mode=enums.ParseMode.MARKDOWN
            )
        LOGGER(name).error(str(error))
    except FloodWait as e:
        await asyncio.sleep(e.value)
    except Exception as er:
        LOGGER(__name__).error(str(er))
        pass
