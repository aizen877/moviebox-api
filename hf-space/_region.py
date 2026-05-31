"""Probe how region/host affects homepage content + whether there is a
country param. Goal: figure out how to get Bangladeshi (BD) content."""

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


def titles(data, n=8):
    out = []
    for op in (data or {}).get("operatingList", []):
        banner = op.get("banner")
        if banner:
            for it in banner.get("items", []):
                subj = it.get("subject") or {}
                t = subj.get("title") or it.get("title")
                if t:
                    out.append(t)
    return out[:n]


async def probe(client, label, params=None, headers=None):
    try:
        r = await client.get(
            f"{BASE}/wefeed-h5api-bff/home",
            params=params or {},
            headers=headers,
        )
        j = r.json()
        data = j.get("data", {})
        platforms = [p.get("name") for p in (data or {}).get("platformList", [])]
        print(f"\n[{label}] http={r.status_code} code={j.get('code')}")
        print("  platforms:", platforms[:6])
        print("  sample titles:", titles(data))
    except Exception as e:
        print(f"\n[{label}] ERROR {e}")


async def main():
    async with httpx.AsyncClient(headers=HEADERS, timeout=20) as c:
        await probe(c, "host=moviebox.ph (current)", {"host": "moviebox.ph"})
        await probe(c, "host=moviebox.com.bd", {"host": "moviebox.com.bd"})
        await probe(c, "no host param", {})
        # try a country / region hint header
        await probe(
            c,
            "X-Client-Info BD timezone",
            {"host": "moviebox.ph"},
            headers={**HEADERS, "X-Client-Info": '{"timezone":"Asia/Dhaka"}'},
        )
        # try explicit country params commonly used
        await probe(c, "host + countryCode=BD", {"host": "moviebox.ph", "countryCode": "BD"})
        await probe(c, "host + region=BD", {"host": "moviebox.ph", "region": "BD"})


if __name__ == "__main__":
    asyncio.run(main())
