import time
import json
import aiohttp

# avaible models:
# Mixtral-8x7B-Instruct-v0.1
# Llama-3-70b-chat-hf
# claude-3-haiku-20240307
# gpt-3.5-turbo-0125
# gpt-4o-mini


async def ddg_invoke(prompt, model="gpt-4o-mini"):
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
        "Accept": "text/event-stream",
        "Accept-Language": "en-US;q=0.7,en;q=0.3",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://duckduckgo.com/",
        "Content-Type": "application/json",
        "Origin": "https://duckduckgo.com",
        "Connection": "keep-alive",
        "Cookie": "dcm=1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Pragma": "no-cache",
        "TE": "trailers",
        "x-vqd-accept": "1",
        "Cache-Control": "no-store",
    }

    start_time = time.time()

    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://duckduckgo.com/duckchat/v1/status", headers=headers
        ) as response:
            token = response.headers["x-vqd-4"]
            headers["x-vqd-4"] = token

        url = "https://duckduckgo.com/duckchat/v1/chat"
        data = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
        }

        async with session.post(url, headers=headers, json=data) as response:
            text = await response.text()

    ret = ""
    for line in text.split("\n"):
        if len(line) > 0 and line[6] == "{":
            dat = json.loads(line[6:])
            if "message" in dat:
                ret += dat["message"].replace("\\n", "\n")

    end_time = time.time()
    generation_time = round(end_time - start_time, 2)
    info = f"\n\nTook: `{generation_time}s` | Model: `{model}`"

    return ret, info
