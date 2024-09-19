from git import Repo
from git.exc import GitCommandError, InvalidGitRepositoryError

from ketard.config import GitConfig
from ketard.logger.logging import LOGGER


def initialize_git():
    UPSTREAM_REPO = "https://github.com/ket0x4/ketard-ai"
    if GitConfig.UPSTREAM_REPO:
        UPSTREAM_REPO = GitConfig.UPSTREAM_REPO

    if GitConfig.GIT_TOKEN:
        git_username = UPSTREAM_REPO.split("com/")[1].split("/")[0]
        temp_repo = UPSTREAM_REPO.split("https://")[1]
        UPSTREAM_REPO = f"https://{git_username}:{GitConfig.GIT_TOKEN}@{temp_repo}"
    try:
        repo = Repo()
        LOGGER(__name__).info(f"Checking updates for {UPSTREAM_REPO}")
    except GitCommandError:
        LOGGER(__name__).info(f"Invalid Git Command")
    except InvalidGitRepositoryError:
        repo = Repo.init()
        if "origin" in repo.remotes:
            origin = repo.remote("origin")
        else:
            origin = repo.create_remote("origin", UPSTREAM_REPO)
        origin.fetch()
        repo.create_head(
            GitConfig.UPSTREAM_BRANCH,
            origin.refs[GitConfig.UPSTREAM_BRANCH],
        )
        repo.heads[GitConfig.UPSTREAM_BRANCH].set_tracking_branch(
            origin.refs[GitConfig.UPSTREAM_BRANCH]
        )
        repo.heads[GitConfig.UPSTREAM_BRANCH].checkout(True)
        try:
            repo.create_remote("origin", UPSTREAM_REPO)
        except BaseException:
            pass
        cspr = repo.remote("origin")
        cspr.fetch(GitConfig.UPSTREAM_BRANCH)
        try:
            cspr.pull(GitConfig.UPSTREAM_BRANCH)
        except GitCommandError:
            repo.git.reset("--hard", "FETCH_HEAD")

        LOGGER(__name__).info(f"Fetched Updates from: {UPSTREAM_REPO}")
