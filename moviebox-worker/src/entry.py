import logging

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from moviebox_api.v1.constants import SubjectType
from moviebox_api.v2 import (
    DownloadableSingleFilesDetail,
    DownloadableTVSeriesFilesDetail,
    Homepage,
    ItemDetails,
    Search,
    Session,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("moviebox_worker")

app = FastAPI(
    title="Moviebox Unofficial v2 API Gateway",
    description="High-speed Python API proxy for the MovieBox H5 REST backend "
    "(h5-api.aoneroom.com). Returns all stream links + subtitles in a single "
    "request.",
    version="2.0.0",
)

# Enable CORS so the user can easily query this API from any client web app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _map_subject_type(type_str: str) -> SubjectType:
    """Map a string content type to the SubjectType enum."""
    mapping = {
        "all": SubjectType.ALL,
        "movies": SubjectType.MOVIES,
        "movie": SubjectType.MOVIES,
        "tv_series": SubjectType.TV_SERIES,
        "tv": SubjectType.TV_SERIES,
        "series": SubjectType.TV_SERIES,
        "anime": SubjectType.ANIME,
        "music": SubjectType.MUSIC,
        "education": SubjectType.EDUCATION,
    }
    return mapping.get(type_str.lower().strip(), SubjectType.ALL)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Moviebox Unofficial API (v2 H5 REST Backend)",
        "docs": "/docs",
        "message": "Welcome to the high-speed Moviebox v2 API on Cloudflare "
        "Workers! 🚀",
    }


@app.get("/homepage")
async def get_homepage():
    """Landing-page content listings."""
    try:
        session = Session()
        hp_engine = Homepage(session=session)
        contents = await hp_engine.get_content()
        return {"status": "success", "data": contents}
    except Exception as e:
        logger.error(f"Error fetching homepage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search")
async def search(
    q: str = Query(..., description="Search keyword"),
    type: str = Query(
        "all",
        description="Content type filter (all, movies, tv_series, anime, "
        "music, education)",
    ),
    page: int = Query(1, ge=1, description="Page number"),
):
    """Search movies / tv-series / music etc."""
    try:
        subject_type = _map_subject_type(type)

        session = Session()
        search_engine = Search(
            session=session,
            query=q,
            subject_type=subject_type,
            page=page,
        )
        contents = await search_engine.get_content()
        return {
            "status": "success",
            "query": q,
            "type": type,
            "page": page,
            "data": contents,
        }
    except Exception as e:
        logger.error(f"Error executing search for query '{q}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/details/{detail_path}")
async def get_details(detail_path: str):
    """Specific item details. `detail_path` is the slug returned by /search
    (e.g. `titanic-QOuOQeUejq8`)."""
    try:
        session = Session()
        details_engine = ItemDetails(session=session)
        details = await details_engine.get_content(detail_path)
        return {
            "status": "success",
            "detail_path": detail_path,
            "data": details,
        }
    except Exception as e:
        logger.error(f"Error fetching details for '{detail_path}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{detail_path}")
async def get_download_links(
    detail_path: str,
    season: int = Query(
        0, ge=0, description="Season number (TV series only)"
    ),
    episode: int = Query(
        0, ge=0, description="Episode number (TV series only)"
    ),
):
    """All available stream / download links + subtitles in a single request.

    For movies/anime/music/education just pass the `detail_path`.
    For tv-series also pass `season` and `episode`.
    """
    try:
        session = Session()

        # Recover the full item (subjectId + detailPath) from its details
        details_engine = ItemDetails(session=session)
        details_model = await details_engine.get_content_model(detail_path)
        item = details_model.subject

        # Fetch stream/download links (all qualities in one shot)
        if item.subjectType == SubjectType.TV_SERIES:
            dl_engine = DownloadableTVSeriesFilesDetail(
                session=session, item=item
            )
            files_metadata = await dl_engine.get_content_model(
                season=season or 1, episode=episode or 1
            )
        else:
            dl_engine = DownloadableSingleFilesDetail(
                session=session, item=item
            )
            files_metadata = await dl_engine.get_content_model()

        # Build a clean files list with all qualities
        direct_files = []
        for media in files_metadata.downloads:
            direct_files.append(
                {
                    "resolution": f"{media.resolution}p",
                    "resolution_value": media.resolution,
                    "size_bytes": media.size,
                    "size_mb": round(media.size / (1024 * 1024), 2),
                    "ext": media.ext,
                    "id": media.id,
                    "stream_link": str(media.url),
                }
            )

        # Subtitles
        subtitles = []
        for caption in files_metadata.captions:
            subtitles.append(
                {
                    "language": caption.lanName,
                    "lang_code": caption.lan,
                    "size_bytes": caption.size,
                    "delay": caption.delay,
                    "url": str(caption.url),
                }
            )

        return {
            "status": "success",
            "detail_path": detail_path,
            "subject_id": item.subjectId,
            "title": item.title,
            "subject_type": item.subjectType.name,
            "release_date": str(item.releaseDate),
            "cover_image": str(item.cover.url) if item.cover else None,
            "has_resource": files_metadata.hasResource,
            "limited": files_metadata.limited,
            "qualities_count": len(direct_files),
            "files": direct_files,
            "subtitles": subtitles,
        }
    except Exception as e:
        logger.error(f"Error fetching download files for '{detail_path}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


from workers import WorkerEntrypoint
import asgi


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        return await asgi.fetch(
            app,
            request.js_object if hasattr(request, "js_object") else request,
            self.env,
        )
