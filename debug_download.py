import asyncio
import logging
from moviebox_api.v3.http_client import MovieBoxHttpClient
from moviebox_api.v3.core import DownloadableVideoFilesDetail

# Configure debug logging to see HTTP requests
logging.basicConfig(level=logging.DEBUG)

async def test_download():
    subject_id = "8353689103061451688" # Batman Begins
    print("Initializing MovieBoxHttpClient...")
    async with MovieBoxHttpClient() as client:
        # We can hook or inspect the request by monkeypatching client._request
        original_request = client._request
        async def mock_request(method, path_and_query, **kwargs):
            print("\n" + "="*80)
            print(f"REQUEST METHOD: {method}")
            print(f"PATH AND QUERY: {path_and_query}")
            # Generate headers using _signed_headers
            url = f"{client._active_base}{path_and_query}"
            headers = client._signed_headers(method, url, **kwargs)
            print(f"FULL URL: {url}")
            print("SIGNED HEADERS:")
            for k, v in headers.items():
                print(f"  {k}: {v}")
            print("="*80 + "\n")
            return await original_request(method, path_and_query, **kwargs)
        
        client._request = mock_request

        print("Fetching DownloadableVideoFilesDetail...")
        details = DownloadableVideoFilesDetail(client)
        try:
            content = await details.get_content(subject_id)
            print("SUCCESS! RESPONSE RECEIVED:")
            print(content)
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_download())
