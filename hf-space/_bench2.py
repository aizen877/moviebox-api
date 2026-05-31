"""Benchmark the optimizations: reused client + gzip + cache."""

import asyncio
import time

import httpx

from moviebox_api.v2.constants import HOST_URL

HOMEPAGE_PATH = "/wefeed-h5api-bff/home?host=moviebox.ph"
URL = HOST_URL.rstrip("/") + HOMEPAGE_PATH

HEADERS_GZIP = {
    "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
    "Accept-Language": "en-US,en;q=0.5",
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "Referer": "https://videodownloader.site/",
}


def stats(label, times):
    s = sorted(times)
    print(f"{label:38} avg={sum(times)/len(times):7.1f}ms  min={s[0]:7.1f}ms  max={s[-1]:7.1f}ms")


async def main():
    # reused client + gzip
    async with httpx.AsyncClient(headers=HEADERS_GZIP, timeout=20, http2=False) as c:
        # warm
        r = await c.get(URL)
        wire = int(r.headers.get("content-length", 0))
        enc = r.headers.get("content-encoding", "none")
        print(f"content-encoding: {enc} | wire size: {wire/1024:.1f} KB | decoded: {len(r.content)/1024:.1f} KB\n")

        times = []
        for _ in range(6):
            t0 = time.perf_counter()
            r = await c.get(URL)
            r.json()
            times.append((time.perf_counter() - t0) * 1000)
        stats("reused client + gzip", times)

    # in-memory cache simulation (second hit is instant)
    cache = {}
    async with httpx.AsyncClient(headers=HEADERS_GZIP, timeout=20) as c:
        async def cached_homepage():
            if "hp" in cache and (time.time() - cache["hp"][0] < 300):
                return cache["hp"][1]
            r = await c.get(URL)
            data = r.json()
            cache["hp"] = (time.time(), data)
            return data

        times = []
        for i in range(6):
            t0 = time.perf_counter()
            await cached_homepage()
            times.append((time.perf_counter() - t0) * 1000)
        stats("reused client + 5min cache", times)


if __name__ == "__main__":
    asyncio.run(main())
