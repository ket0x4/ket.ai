
import os
import asyncio
import urllib3
from datetime import datetime

from git import Repo
from git.exc import GitCommandError, InvalidGitRepositoryError

from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import paste, LOGGER
from ketard.config import BotConfig, LogConfig, DataConfig


urllib3.disable_warnings(
    urllib3.exceptions.InsecureRequestWarning
)


@Client.on_message(
    filters.command(["getlog"])
    & filters.user([DataConfig.OWNER_ID])
)
async def get_log(_, message: Message):
    try:
        if LogConfig.LOG_TO_FILE:
            if os.path.exists(LogConfig.LOG_FILE_PATH):
                l = open(LogConfig.LOG_FILE_PATH)
                lines = l.readlines()
                data = ""
                try:
                    num_line = int(message.text.split(None, 1)[1])
                except:
                    num_line = 100
                for x in lines[-num_line:]:
                    data += x
                link = await paste.dpaste(data)
                return await message.reply_text(link)
            else:
                await message.reply_text(
                    "Log file not found.",
                    quote=True
                )
        else:
            await message.reply_text(
                    "Logging to file is disabled.",
                    quote=True
                )
    except Exception as e:
        LOGGER(__name__).error(f"Error: {str(e)}")


@Client.on_message(
    filters.command(["update"])
    & filters.user([DataConfig.OWNER_ID])
)
async def update_(_, message: Message):
    msg = await message.reply_text(
        "Checking for available updates...",
        quote=True
    )
    try:
        repo = Repo()
    except GitCommandError:
        return await msg.edit("Git command error!")
    except InvalidGitRepositoryError:
        return await msg.edit(
            "Invalid git repository!"
        )

    to_exc = f"git fetch origin {BotConfig.UPSTREAM_BRANCH} &> /dev/null"

    os.system(to_exc)
    await asyncio.sleep(8)
    verification = ""
    REPO_ = repo.remotes.origin.url.split(".git")[0]

    for checks in repo.iter_commits(
        f"HEAD..origin/{BotConfig.UPSTREAM_BRANCH}"
    ):
        verification = str(checks.count())

    if verification == "":
        return await msg.edit(f"{BotConfig.BOT_NAME} is up-to-date!")

    updates = f"""
A new update is available for the {BotConfig.BOT_NAME}!

Pushing Updates Now

Updates:\n\n
    """
    ordinal = lambda format: "%d%s" % (
        format,
        "tsnrhtdd"[
            (format // 10 % 10 != 1)
            * (format % 10 < 4)
            * format
            % 10 :: 4
        ],
    )
    for info in repo.iter_commits(
        f"HEAD..origin/{BotConfig.UPSTREAM_BRANCH}"
    ):
        _updates = f"""
#{info.count()}: [{info.summary}]({REPO_}/commit/{info}) by -> {info.author}
        Commited on: {ordinal(int(datetime.fromtimestamp(info.committed_date).strftime('%d')))} {datetime.fromtimestamp(info.committed_date).strftime('%b')}, {datetime.fromtimestamp(info.committed_date).strftime('%Y')}\n\n
        """

    final_updates = updates + _updates
    if len(final_updates) > 4096:
        url = await paste.dpaste(_updates)
        update_msg = await msg.edit(
            f"{updates}[Click here to checkout updates]({url})"
        )
    else:
        update_msg = await msg.edit(
            final_updates,
            disable_web_page_preview=True
        )

    os.system("git stash &> /dev/null && git pull")

    await msg.edit(
        f"""
{update_msg.text}

{BotConfig.BOT_NAME} was updated successfully!

Now, wait for 1 - 2 mins until the {BotConfig.BOT_NAME} reboots!
        """
    )
    os.system("pip3 install -r requirements.txt")
    os.system(f"kill -9 {os.getpid()} && bash start")
    exit()
