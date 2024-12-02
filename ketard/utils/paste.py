
import json

from httpx import AsyncClient

from ketard.logger.logging import LOGGER


class Paste:
    def __init__(self) -> None:
        self.services = [
            self.paste_to_nekobin,
            self.paste_to_spacebin,
            self.paste_to_dpaste,
            self.paste_to_pasty,
            self.paste_to_centos,
            self.paste_to_batbin,
        ]

    async def paste(self, text: str):
        for service in self.services:
            try:
                result = await service(text)
                if result:
                    return result
            except Exception as e:
                LOGGER(__name__).error(f"Service {service.__name__} failed with error: {e}")
        return "**All paste services failed!**"

    async def paste_to_nekobin(self, text: str):
        async with AsyncClient() as client:
            data = {"content": text}
            resp = await client.post("https://nekobin.com/api/documents", json=data)
            if resp.status_code == 201:
                jsned = resp.json()
                return f"https://nekobin.com/{jsned['result']['key']}"
            return None

    async def paste_to_spacebin(self, text: str):
        async with AsyncClient() as client:
            data = {"content": text, "extension": "md"}
            resp = await client.post("https://spaceb.in/api/v1/documents", data=data)
            if resp.status_code == 201:
                jsned = resp.json()
                return f"https://spaceb.in/{jsned['payload']['id']}"
            return None

    async def paste_to_dpaste(self, text: str):
        async with AsyncClient() as client:
            data = {"content": text, "lexer": "_text", "expires": "never"}
            resp = await client.post("https://dpaste.org/api/", data=data)
            if resp.status_code == 200:
                return resp.text.replace('"', "")
            return None

    async def paste_to_pasty(self, text: str):
        async with AsyncClient() as client:
            data = {"content": text}
            resp = await client.post(
                "https://pasty.lus.pm/api/v1/pastes", data=json.dumps(data)
            )
            if resp.status_code == 200:
                jsned = resp.json()
                return f"https://pasty.lus.pm/{jsned['id']}"
            return None

    async def paste_to_centos(self, text: str):
        async with AsyncClient() as client:
            data = {"text": text}
            resp = await client.post(
                "https://paste.centos.org/api/create?apikey=5uZ30dTZE1a5V0WYhNwcMddBRDpk6UzuzMu-APKM38iMHacxdA0n4vCqA34avNyt",
                data=data,
            )
            if resp.status_code == 200:
                return resp.text.replace("\n", "")
            return None

    async def paste_to_batbin(self, text: str):
        async with AsyncClient() as client:
            headers = {"Content-Type": "text/plain;charset=utf-8"}
            resp = await client.post(
                "https://batbin.me/api/v2/paste",
                json={"content": text},
                headers=headers,
            )
            if resp.status_code == 200:
                jsned = resp.json()
                return f"https://batbin.me/{jsned['message']}"
            return None
