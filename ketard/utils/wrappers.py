
from ketard.config import DataConfig
from ketard.database.d_b import db


def permission_checker(mystic):
    async def wrapper(client, message):
        user_id = message.from_user.id
        chat_id = message.chat.id
        user_allowed = await db.get(
            "auth_user", user_id
        ) is not None
        chat_allowed = await db.get(
            "auth_chat", chat_id
        ) is not None
        if (
            user_id in DataConfig.ADMINS
            or user_allowed
            or chat_allowed
        ):
            return await mystic(client, message)

    return wrapper
