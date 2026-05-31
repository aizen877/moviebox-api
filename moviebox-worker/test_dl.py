import asyncio
from moviebox_api.v3.http_client import MovieBoxHttpClient
from moviebox_api.v3.core import DownloadableVideoFilesDetail

async def main():
    async with MovieBoxHttpClient() as client:
        d = DownloadableVideoFilesDetail(client)
        res = await d.get_content('8353689103061451688')
        print(res.keys())
        if res.get('files'):
            print(res['files'][0])
        else:
            print("No files found!")

asyncio.run(main())
