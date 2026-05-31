"""Can /download work from detailPath alone (no separate /detail call)?
And does the download response itself carry title/subjectType?"""

import asyncio
import json

import httpx

BASE = "https://h5-api.aoneroom.com"
HEADERS = {
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "Referer": "https://videodownloader.site/",
    "Origin": "https://videodownloader.site/",
}

DETAIL_PATH = "titanic-QOuOQeUejq8"


async def main():
    async with httpx.AsyncClient(headers=HEADERS, timeout=20) as c:
        # download using detailPath + empty subjectId
        r = await c.get(
            f"{BASE}/wefeed-h5api-bff/subject/download",
            params={"subjectId": "", "se": 0, "ep": 0, "detailPath": DETAIL_PATH},
        )
        j = r.json()
        data = j.get("data") or {}
        print("download(detailPath only) code:", j.get("code"))
        print("  downloads:", len(data.get("downloads", []) or []))
        print("  top-level keys:", list(data.keys()))
        # does it carry any title/subject metadata?
        for k in ("title", "subject", "subjectId", "subjectType", "cover"):
            if k in data:
                print(f"  has {k}: {str(data[k])[:60]}")


if __name__ == "__main__":
    asyncio.run(main())
