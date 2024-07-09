
import os
import asyncio
import urllib3
from datetime import datetime

from git import Repo
from git.exc import GitCommandError, InvalidGitRepositoryError

from pyrogram import Client, filters
from pyrogram.types import Message

from ketard import paste, my_filters
from ketard.config import BotConfig, DataConfig, GitConfig
from ketard.logger.logging import LOGGER


urllib3.disable_warnings(
    urllib3.exceptions.InsecureRequestWarning
)


@Client.on_message(
    filters.command(["update"])
    & filters.user(DataConfig.ADMINS)
    & my_filters.is_user_spamming()
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

    to_exc = f"git fetch origin {GitConfig.UPSTREAM_BRANCH} &> /dev/null"

    os.system(to_exc)
    await asyncio.sleep(8)
    verification = ""
    REPO_ = repo.remotes.origin.url.split(".git")[0]

    for checks in repo.iter_commits(
        f"HEAD..origin/{GitConfig.UPSTREAM_BRANCH}"
    ):
        verification = str(checks.count())

    if verification == "":
        return await msg.edit(f"{BotConfig.BOT_NAME} is up-to-date!")

    updates = f"""
A new update is available for the {BotConfig.BOT_NAME}!

Pushing Updates Now

Updates:
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
        f"HEAD..origin/{GitConfig.UPSTREAM_BRANCH}"
    ):
        _updates = f"""
#{info.count()}: [{info.summary}]({REPO_}/commit/{info}) by -> {info.author}
        Commited on: {ordinal(int(datetime.fromtimestamp(info.committed_date).strftime('%d')))} {datetime.fromtimestamp(info.committed_date).strftime('%b')}, {datetime.fromtimestamp(info.committed_date).strftime('%Y')}\n
        """

    final_updates = updates + _updates
    if len(final_updates) > 4096:
        url = await paste.dpaste(
            text=_updates
        )
        update_msg = await msg.edit(
            f"{updates}[Click here to checkout updates]({url})",
            disable_web_page_preview=True
        )
    else:
        update_msg = await msg.edit(
            final_updates,
            disable_web_page_preview=True
        )

    os.system("git stash &> /dev/null && git pull")

    await msg.edit(
        f"""
{update_msg.text.markdown}

{BotConfig.BOT_NAME} was updated successfully!

Now, wait for 1 - 2 mins until the {BotConfig.BOT_NAME} reboots!
        """,
        disable_web_page_preview=True
    )
    os.system("pip3 install -r requirements.txt")
    os.system(f"kill -9 {os.getpid()} && bash start")
    exit()
