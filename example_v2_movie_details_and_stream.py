"""
Example: V2 API - Movie Details & Streaming Link
=================================================
এই script দিয়ে moviebox v2 API ব্যবহার করে:
1. Movie search করা যায়
2. Movie details (info) বের করা যায়
3. Streaming/Download link বের করা যায়
"""

import asyncio

from moviebox_api.v2 import (
    DownloadableS
    ItemDetails,
    MovieDetails,
    Search,
    Session,
)
from moviebox_api.v1.constants import SubjectTypeingleFilesDetail,


async def get_movie_details_and_stream_link(movie_title: str):
    """Movie details এবং streaming link বের করে"""

    # Step 1: Session create করো
    session = Session()

    # Step 2: Movie search করো
    print(f"\n🔍 Searching for: '{movie_title}'...")
    search = Search(
        session=session,
        query=movie_title,
        subject_type=SubjectType.MOVIES,
    )
    search_results = await search.get_content_model()

    if not search_results.items:
        print("❌ কোনো result পাওয়া যায়নি!")
        return

    # প্রথম result নাও
    first_item = search_results.first_item
    print(f"\n✅ Found: {first_item.title} ({first_item.releaseDate})")
    print(f"   Subject ID: {first_item.subjectId}")
    print(f"   Detail Path: {first_item.detailPath}")
    print(f"   Subject Type: {first_item.subjectType}")
    print(f"   Genre: {', '.join(first_item.genre)}")
    print(f"   IMDB Rating: {first_item.imdbRatingValue}")

    # Step 3: Movie Details বের করো
    print("\n📋 Fetching movie details...")
    item_details = ItemDetails(session=session)
    details_model = await item_details.get_content_model(first_item)

    print(f"\n--- Movie Details ---")
    print(f"   Title: {details_model.subject.title}")
    print(f"   Release Date: {details_model.subject.releaseDate}")
    print(f"   IMDB Rating: {details_model.subject.imdbRatingValue}")
    print(f"   Is Forbidden: {details_model.isForbid}")
    print(f"   Watch Time Limit: {details_model.watchTimeLimit}")

    # Stars/Cast info
    if details_model.stars:
        print(f"\n   🎭 Cast:")
        for star in details_model.stars[:5]:  # প্রথম 5 জন
            print(f"      - {star.name} as {star.character}")

    # Resource info (seasons/source)
    if details_model.resource:
        print(f"\n   📦 Resource Source: {details_model.resource.source}")
        print(f"   Uploaded By: {details_model.resource.uploadBy}")

    # Step 4: Streaming/Download Link বের করো
    print("\n🎬 Fetching streaming/download links...")
    downloadable = DownloadableSingleFilesDetail(
        session=session,
        item=first_item,
    )
    files_metadata = await downloadable.get_content_model()

    print(f"\n--- Streaming/Download Links ---")
    print(f"   Has Resource: {files_metadata.hasResource}")
    print(f"   Limited: {files_metadata.limited}")

    if files_metadata.downloads:
        print(f"\n   🎥 Available Qualities ({len(files_metadata.downloads)}):")
        for media in files_metadata.downloads:
            size_mb = media.size / (1024 * 1024)
            print(f"      [{media.resolution}p] {size_mb:.1f} MB")
            print(f"         URL: {media.url}")
    else:
        print("   ❌ কোনো download link পাওয়া যায়নি!")

    if files_metadata.captions:
        print(f"\n   📝 Subtitles ({len(files_metadata.captions)}):")
        for caption in files_metadata.captions:
            print(f"      [{caption.lanName}] {caption.url}")

    return {
        "details": details_model,
        "stream_links": files_metadata,
    }


async def main():
    # যেকোনো movie title দাও
    movie_title = "Titanic"
    result = await get_movie_details_and_stream_link(movie_title)
    return result


if __name__ == "__main__":
    asyncio.run(main())
