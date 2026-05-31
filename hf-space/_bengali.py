"""Check if Bengali/Bangladeshi content is searchable and how it's tagged."""

import asyncio

import httpx

BASE = "https://h5-api.aoneroom.com"
HEADERS = {
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "Referer": "https://videodownloader.site/",
    "Origin": "https://videodownloader.site/",
}


async def search(client, keyword, subject_type=0):
    r = await client.post(
        f"{BASE}/wefeed-h5api-bff/subject/search",
        json={"keyword": keyword, "page": 1, "perPage": 20, "subjectType": subject_type},
    )
    j = r.json()
    items = (j.get("data") or {}).get("items", [])
    print(f"\n[search '{keyword}'] -> {len(items)} items")
    for it in items[:10]:
        genres = it.get("genre", "")
        country = it.get("countryName", "")
        print(f"   - {it.get('title'):45} | country={country!r:20} | genre={genres!r}")


async def main():
    async with httpx.AsyncClient(headers=HEADERS, timeout=20) as c:
        await search(c, "Bengali")
        await search(c, "Bangla")
        await search(c, "Hawa")          # famous BD movie
        await search(c, "Surongo")       # famous BD movie
        await search(c, "Poran")         # famous BD movie


if __name__ == "__main__":
    asyncio.run(main())
