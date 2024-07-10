import time
from pyrogram import filters, types


class MyFilters:
    def __init__(self):
        self.last_msg_time = {}

    def is_user_spamming(self, spam_limit=10, spam_time=60) -> filters.Filter:
        async def func(_, __, message: types.Message) -> bool:
            _id = message.from_user.id
            current_time = time.time()
            u_msg = self.last_msg_time.get(_id, [])
            u_msg = [
                timestamp
                for timestamp in u_msg
                if current_time - timestamp <= spam_time
            ]
            u_msg.append(current_time)
            self.last_msg_time[_id] = u_msg

            return len(u_msg) < spam_limit

        return filters.create(func, name="is_user_spamming")
