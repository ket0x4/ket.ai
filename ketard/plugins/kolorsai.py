from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import my_filters, permission_checker, paste
from ketard.utils.kolors import kolors_client
from ketard.utils.helper import get_prompt, send_log
from ketard.logger.logging import LOGGER


@Client.on_message(
    filters.command(["kolors", "sd", "dif"])
    & my_filters.is_user_spamming(spam_limit=3, spam_time=60)
)
@permission_checker
async def handle_kolors_command(client: Client, message: Message):
    prompt = await get_prompt(message=message)

    if prompt is None:
        return await message.reply_text(
            "Please enter a message after the command.", quote=True
        )

    try:
        msg = await message.reply_text(
            "Generating Image...",
            quote=True,
        )
        result = kolors_client.predict(positive_prompt=prompt)

        image_url = result[0]

        caption = f"**Generated Image for:**\n`{prompt}`"
        if len(caption) > 4090:
            p_link = await paste.dpaste(text=prompt)
            caption = f"**Generated Image for:** [click to see]({p_link})"

        await message.reply_document(
            document=image_url,
            caption=caption,
            force_document=True,
            quote=True,
        )
        await msg.delete()
        LOGGER(__name__).info(
            f"Processed Kolors prompt from user {message.from_user.id} in chat {message.chat.id}."
        )

    except Exception as e:
        await send_log(client=client, error=e, message=message, name=__name__)
