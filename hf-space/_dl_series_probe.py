"""Confirm series download works with detailPath + se/ep (no subjectId)."""

import asyncio
import httpx

BASE = "https://h5-api.aoneroom.com"
HEADERS = {
    "Accept": "application/json", "Accept-Encoding": "gzip",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "Referer": "https://videodownloader.site/", "Origin": "https://videodownloader.site/",
}


async def dl(c, detailPath, se, ep, subjectId=""):
    r = await c.get(f"{BASE}/wefeed-h5api-bff/subject/download",
                    params={"subjectId": subjectId, "se": se, "ep": ep, "detailPath": detailPath})
    d = r.json().get("data") or {}
    downs = d.get("downloads", []) or []
    return len(downs), (f"{downs[0]['resolution']}p {int(downs[0]['size'])//1024//1024}MB" if downs else "none")


async def main():
    async with httpx.AsyncClient(headers=HEADERS, timeout=20) as c:
        # find a series
        r = await c.post(f"{BASE}/wefeed-h5api-bff/subject/search",
                         json={"keyword": "Merlin", "page": 1, "perPage": 20, "subjectType": 2})
        items = [i for i in (r.json().get("data") or {}).get("items", []) if i.get("subjectType") == 2]
        s = items[0]
        print("Series:", s["title"], "| detailPath:", s["detailPath"], "| subjectId:", s["subjectId"])
        print("S1E1 (detailPath only):", await dl(c, s["detailPath"], 1, 1))
        print("S1E2 (detailPath only):", await dl(c, s["detailPath"], 1, 2))
        print("S1E1 (subjectId+path) :", await dl(c, s["detailPath"], 1, 1, s["subjectId"]))


if __name__ == "__main__":
    asyncio.run(main())
