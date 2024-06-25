import time
from pyrogram import filters, types


class MyFilters:
    def __init__(self):
        self.spam_limit = 10
        self.spam_time = 60
        self.last_msg_time = {}

    def is_user_spamming(self) -> filters.Filter:
        async def func(_, __, message: types.Message) -> bool:
            _id = message.from_user.id
            current_time = time.time()
            u_msg = self.last_msg_time.get(_id, [])
            u_msg = [
                timestamp
                for timestamp in u_msg
                if current_time - timestamp <= int(self.spam_time)
            ]
            u_msg.append(current_time)
            self.last_msg_time[_id] = u_msg

            return len(u_msg) < int(self.spam_limit)

        return filters.create(func, name="is_user_spamming")
