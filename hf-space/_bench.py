"""Benchmark homepage fetch: where does the time go?"""

import asyncio
import time

import httpx

from moviebox_api.v2 import Homepage, Session
from moviebox_api.v2.constants import DEFAULT_REQUEST_HEADERS, HOST_URL

HOMEPAGE_PATH = "/wefeed-h5api-bff/home?host=moviebox.ph"
URL = HOST_URL.rstrip("/") + HOMEPAGE_PATH


async def bench_via_package(n=5):
    """How the HF app currently does it: new Session() + Homepage each call."""
    times = []
    for _ in range(n):
        t0 = time.perf_counter()
        session = Session()
        await Homepage(session=session).get_content()
        times.append((time.perf_counter() - t0) * 1000)
    return times


async def bench_raw_new_client(n=5):
    """Raw httpx, brand new client each time (mimics per-request client)."""
    times = []
    for _ in range(n):
        t0 = time.perf_counter()
        async with httpx.AsyncClient(headers=DEFAULT_REQUEST_HEADERS, timeout=20) as c:
            r = await c.get(URL)
            r.json()
        times.append((time.perf_counter() - t0) * 1000)
    return times


async def bench_raw_reused_client(n=5):
    """Raw httpx, ONE reused client (connection pooling / keep-alive)."""
    times = []
    async with httpx.AsyncClient(headers=DEFAULT_REQUEST_HEADERS, timeout=20) as c:
        for _ in range(n):
            t0 = time.perf_counter()
            r = await c.get(URL)
            r.json()
            times.append((time.perf_counter() - t0) * 1000)
    return times


async def bench_response_size():
    async with httpx.AsyncClient(headers=DEFAULT_REQUEST_HEADERS, timeout=20) as c:
        r = await c.get(URL)
        return len(r.content)


def stats(label, times):
    times_sorted = sorted(times)
    avg = sum(times) / len(times)
    print(
        f"{label:32} avg={avg:7.1f}ms  min={times_sorted[0]:7.1f}ms  "
        f"max={times_sorted[-1]:7.1f}ms  (n={len(times)})"
    )


async def main():
    print("Host:", HOST_URL)
    size = await bench_response_size()
    print(f"Homepage payload size: {size / 1024:.1f} KB\n")

    # warm DNS/TLS first
    await bench_raw_new_client(1)

    stats("package (new Session each)", await bench_via_package(5))
    stats("raw httpx (new client each)", await bench_raw_new_client(5))
    stats("raw httpx (reused client)", await bench_raw_reused_client(5))


if __name__ == "__main__":
    asyncio.run(main())
