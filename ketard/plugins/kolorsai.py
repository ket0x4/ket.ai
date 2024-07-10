
from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import my_filters, permission_checker
from ketard.utils.kolors import kolors_client
from ketard.logger.logging import LOGGER


@Client.on_message(
    filters.command(["kolors", "sd", "dif"])
    & my_filters.is_user_spamming(
        spam_limit=3, spam_time=60
    )
)
@permission_checker
async def handle_kolors_command(client: Client, message: Message):
    prompt = message.text.split(maxsplit=1)[1] if len(message.text.split()) > 1 else None
    
    if not prompt:
        return await message.reply_text(
            "Please enter a prompt after the command.",
            quote=True
        )
        
    try:
        msg = await message.reply_text(
            "Generating Image...",
            quote=True,
        )
        result = kolors_client.predict(positive_prompt=prompt)
        
        image_url = result[0][0]["image"]
        await message.reply_document(
            document=image_url,
            caption=f"Generated Image for: `{prompt}`",
            force_document=True,
            quote=True
        )
        await msg.delete()
        LOGGER(__name__).info(
            f"Processed Kolors prompt from user {message.from_user.id} in chat {message.chat.id}."
        )

    except Exception as e:
        await message.reply_text(
            f"An error occurred: {e}",
            quote=True
        )
        LOGGER(__name__).error(
            f"Error processing Kolors prompt from user {message.from_user.id} in chat {message.chat.id}: {e}"
        )
