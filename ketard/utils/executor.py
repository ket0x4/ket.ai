
import atexit
import asyncio

from typing import Any, Callable
from functools import wraps, partial
from concurrent.futures import ThreadPoolExecutor

from ketard import LOGGER
from ketard.config import LogConfig


ex = ThreadPoolExecutor(LogConfig.WORKERS)
max_ex = ex._max_workers


def run_in_thread(func: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(ex, partial(func, *args, **kwargs))

    return wrapper


def ex_stop():
    ex.shutdown()
    LOGGER(__name__).info(
        f"Stopped Pool: {max_ex} Workers"
    )


atexit.register(ex_stop)
LOGGER(__name__).info(
    f"Started Pool: {max_ex} Workers"
)