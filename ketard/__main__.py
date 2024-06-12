
import asyncio
from pyrogram import idle

from ketard import ketard, LOGGER


async def main():
    LOGGER(__name__).info("Bot starting...")
    await ketard.start()
    LOGGER(__name__).info("Bot started.")
    await idle()
    LOGGER(__name__).info("Bot stopping...")
    await ketard.stop()
    LOGGER(__name__).info("Bot stopped.")


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
