import json
import asyncio
import aiosqlite


class Database:
    async def get(self, module: str, variable: str, default=None):
        raise NotImplementedError

    async def set(self, module: str, variable: str, value):
        raise NotImplementedError

    async def remove(self, module: str, variable: str):
        raise NotImplementedError

    async def get_collection(self, module: str) -> dict:
        raise NotImplementedError

    async def close(self):
        raise NotImplementedError


class SqliteDatabase(Database):
    def __init__(self, file=None):
        self._file = file
        self._conn = None

    async def _connect(self):
        if not self._conn:
            self._conn = await aiosqlite.connect(self._file)
            self._conn.row_factory = aiosqlite.Row
            self._cursor = await self._conn.cursor()
            self._lock = asyncio.Lock()

    @staticmethod
    def _parse_row(row: aiosqlite.Row):
        parse_func = {
            "bool": lambda x: x == "1",
            "int": int,
            "str": lambda x: x,
            "json": json.loads,
        }
        return parse_func[row["type"]](row["val"])

    async def _create_table(self, module: str):
        sql = f"""
        CREATE TABLE IF NOT EXISTS '{module}' (
        var TEXT UNIQUE NOT NULL,
        val TEXT NOT NULL,
        type TEXT NOT NULL
        )
        """
        await self._cursor.execute(sql)
        await self._conn.commit()

    async def _execute(self, module: str, *args, **kwargs) -> aiosqlite.Cursor:
        try:
            return await self._cursor.execute(*args, **kwargs)
        except aiosqlite.OperationalError as e:
            if str(e).startswith("no such table"):
                await self._create_table(module)
                return await self._cursor.execute(*args, **kwargs)
            raise e from None

    async def get(self, module: str, variable: str, default=None):
        if not self._conn:
            await self._connect()
        sql = f"SELECT * FROM '{module}' WHERE var=:var"
        cur = await self._execute(module, sql, {"var": variable})

        row = await cur.fetchone()
        result = default if row is None else self._parse_row(row)
        await self.close()
        return result

    async def set(self, module: str, variable: str, value) -> bool:
        if not self._conn:
            await self._connect()
        sql = f"""
        INSERT INTO '{module}' VALUES ( :var, :val, :type )
        ON CONFLICT (var) DO
        UPDATE SET val=:val, type=:type WHERE var=:var
        """

        if isinstance(value, bool):
            val = "1" if value else "0"
            typ = "bool"
        elif isinstance(value, str):
            val = value
            typ = "str"
        elif isinstance(value, int):
            val = str(value)
            typ = "int"
        else:
            val = json.dumps(value)
            typ = "json"

        await self._execute(module, sql, {"var": variable, "val": val, "type": typ})
        await self._conn.commit()
        await self.close()
        return True

    async def remove(self, module: str, variable: str):
        if not self._conn:
            await self._connect()
        sql = f"DELETE FROM '{module}' WHERE var=:var"
        await self._execute(module, sql, {"var": variable})
        await self._conn.commit()
        await self.close()

    async def get_collection(self, module: str) -> dict:
        if not self._conn:
            await self._connect()
        sql = f"SELECT * FROM '{module}'"
        cur = await self._execute(module, sql)
        result = {row["var"]: self._parse_row(row) async for row in cur}
        await self.close()
        return result

    async def close(self):
        await self._conn.commit()
        await self._cursor.close()
        await self._conn.close()
        self._conn = None


from ketard.config import DbConfig

db = SqliteDatabase(file=DbConfig.DB_NAME)
