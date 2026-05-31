import asyncio
from moviebox_api.v3.http_client import MovieBoxHttpClient
from moviebox_api.v3.core import Homepage

async def test_homepage():
    print("Initializing MovieBoxHttpClient...")
    async with MovieBoxHttpClient() as client:
        print("Fetching MovieBox v3 Homepage...")
        homepage = Homepage(client)
        try:
            # Fetch the parsed homepage model
            hp_model = await homepage.get_content_model()
            
            print(f"\n---> MovieBox Homepage Version: {hp_model.version}")
            print(f"---> Trending Title: {hp_model.trending_title}")
            print(f"---> Total Homepage Section Blocks: {len(hp_model.items)}\n")
            
            # Loop through homepage blocks
            for idx, section in enumerate(hp_model.items):
                print(f"[{idx+1}] Section Block Title: '{section.title}' | Type: {section.type}")
                
                # Check for banner items
                if section.banner:
                    print(f"    * Contains Banner! Banners count: {len(section.banner.banners)}")
                    for b_idx, banner in enumerate(section.banner.banners[:3]):
                        print(f"      - Banner {b_idx+1}: Content: {banner.content} | DeepLink: {banner.deep_link}")
                
                # Check for list of subjects in this section
                if section.subjects:
                    print(f"    * Movies/Series inside this block ({len(section.subjects)} items):")
                    for s_idx, subject in enumerate(section.subjects[:5]):
                        print(f"      - {s_idx+1}. {subject.title} ({subject.release_date.year}) | Rating: {subject.imdb_rating_value} | Type: {subject.subject_type.name} | ID: {subject.subject_id}")
                
                # Check for custom data (like lists)
                if section.custom_data and section.custom_data.items:
                    print(f"    * Custom lists/categories ({len(section.custom_data.items)} items):")
                    for c_idx, c_item in enumerate(section.custom_data.items[:3]):
                        print(f"      - {c_idx+1}. Content: {c_item.content} | DeepLink: {c_item.deep_link}")
                
                print("-" * 60)
                
        except Exception as e:
            print(f"Error fetching homepage: {e}")

if __name__ == "__main__":
    asyncio.run(test_homepage())
