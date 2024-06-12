
import time
import threading
from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import ollama, LOGGER
from ketard.config import DataConfig, BotConfig
from ketard.utils.executor import run_in_thread


@Client.on_message(
    filters.command(DataConfig.GEN_COMMANDS)
)
async def handle_ket_command(client: Client, message: Message):
    try:
        user_id = str(message.from_user.id)
        chat_id = str(message.chat.id)
        if (
            user_id == DataConfig.OWNER_ID
            or user_id in map(
                str, DataConfig.ADMINS
            )
            or user_id in map(
                str, DataConfig.ALLOWED_USERS
            )
            or chat_id in map(
                str, DataConfig.ALLOWED_CHATS
            )
        ):
            prompt = message.text.split(" ", 1)
            if len(prompt) == 1 or not prompt[1].strip():
                await message.reply_text(
                    "Please enter a message after the command.", quote=True
                )
                return

            prompt = prompt[1].strip()

            await message.reply_text(
                f"`{BotConfig.BOT_NAME}` Processing your prompt. Check `/status` for more info.",
                quote=True,
            )

            prompt = message.text.split(" ", 1)[1]
            start_time = time.time()
            # threading.Thread(target=ollama.invoke, args=(prompt)).start()
            response = await run_in_thread(ollama.invoke)(prompt)
            # response = await ollama.ainvoke(prompt)
            # response = ollama.invoke(prompt)
            end_time = time.time()
            generation_time = round(end_time - start_time, 2)
            model_name = ollama.model
            formatted_response = f"{response}\n\n⌛️{generation_time}sec | 🦙 {model_name}"
            await message.reply_text(formatted_response, quote=True)
            LOGGER(__name__).info(
                f"Processed prompt from user {user_id} in chat {chat_id}."
            )
        else:
            await message.reply_text(
                f"`{BotConfig.BOT_NAME}` not allowed on this chat.",
                quote=True
            )
            LOGGER(__name__).warning(
                f"Unauthorized prompt command attempt by user {user_id} in chat {chat_id}."
            )
    except Exception as e:
        await client.send_message(
            DataConfig.OWNER_ID,
            f"An error occurred: `{str(e)}`"
        )
        LOGGER(__name__).error(
            f"Error processing prompt command: {str(e)}"
        )
