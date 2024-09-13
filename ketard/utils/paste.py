from httpx import AsyncClient

class Paste:
    def __init__(self) -> None:
        self.dpaste_api = "https://dpaste.org/api/"

    async def dpaste(self, text: str, lexer: str = "_text"):
        async with AsyncClient() as dpc:
            data = {"content": text, "lexer": lexer, "expires": "never"}
            resp = await dpc.post(self.dpaste_api, data=data)

            if resp.status_code != 200:
                return None
            else:
                return resp.text.replace('"', "")
