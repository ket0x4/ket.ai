
from pyrogram import filters, types


class MyFilters:
    def __init__(self, config):
        self.config = DataConfig()

    def is_allowed(self) -> filters.Filter:
        async def func(_, __, msg: types.Message) -> bool:
            user_id = str(msg.from_user.id)
            chat_id = str(msg.chat.id)
            return (
                user_id == self.config.OWNER_ID
                or user_id in map(str, self.config.ADMINS)
                or user_id in map(str, self.config.USERS)
                or chat_id in map(str, self.config.CHATS)
            )

        return filters.create(func, name="IsAllowed")
