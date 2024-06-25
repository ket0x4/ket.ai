
from pyrogram import Client, filters
from pyrogram.types import Message
from pyrogram.enums import ChatType

from ketard import my_filters
from ketard.config import DataConfig
from ketard.logging import LOGGER
from ketard.database.d_b import db


@Client.on_message(
    filters.command(
        ["add_chat", "del_chat", "get_chats",
        "add_user", "del_user", "get_users"]
    )
    & filters.user(DataConfig.ADMINS)
    & my_filters.is_user_spamming()
)
async def _handler(client: Client, message: Message):
    cmd = message.command
    user_id = message.from_user.id
    user_name = message.from_user.full_name
    entity_type = "chat" if "chat" in cmd[0] else "user"
    collection_name = f"auth_{entity_type}"
    invalid_id = f"Are you sure this ID belongs to a {entity_type}?"

    if "get" in cmd[0]:
        entities = await db.get_collection(collection_name)
        entity_list = "\n".join([f"• `{entity_id}`" for entity_id in entities.keys()])
        await message.reply_text(
            f"**Allowed {entity_type.capitalize()}s** (`{len(entities)}`):\n{entity_list}", quote=True
        )
        LOGGER(__name__).info(
            f"User {user_name} (ID: {user_id}) executed {cmd[0]}."
        )
        return
    
    if len(cmd) != 1:
        _id = cmd[1]
    elif entity_type == "user" and message.reply_to_message:
        _id = message.reply_to_message.from_user.id
    else:
        _id = message.chat.id if entity_type == "chat" else None

    if not _id:
        return await message.reply_text(
            text=f"Please provide an ID or reply to a {entity_type}.", quote=True
        )

    try:
        chat = await client.get_chat(_id)
        _id = chat.id
    except:
        return await message.reply_text(
            text=invalid_id, quote=True
        )

    if (entity_type == "chat" and chat.type not in [ChatType.SUPERGROUP, ChatType.GROUP]) or \
       (entity_type == "user" and chat.type != ChatType.PRIVATE):
        return await message.reply_text(
            text=invalid_id, quote=True
        )

    existing_entity = await db.get(collection_name, _id)
    if cmd[0].startswith("add"):
        if existing_entity:
            await message.reply_text(
                f"{entity_type.capitalize()} (`{_id}`) is already added.", quote=True
            )
        else:
            await db.set(collection_name, _id, True)
            await message.reply_text(
                f"{entity_type.capitalize()} (`{_id}`) added.", quote=True
            )
            LOGGER(__name__).info(
                f"User {user_name} (ID: {user_id}) added {entity_type} ID: {_id}."
            )
    elif cmd[0].startswith("del"):
        if not existing_entity:
            await message.reply_text(
                f"{entity_type.capitalize()} (`{_id}`) is not added.", quote=True
            )
        else:
            await db.remove(collection_name, _id)
            await message.reply_text(
                f"{entity_type.capitalize()} (`{_id}`) removed.", quote=True
            )
            LOGGER(__name__).info(
                f"User {user_name} (ID: {user_id}) removed {entity_type} ID: {_id}."
            )
