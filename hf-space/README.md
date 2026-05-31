---
title: Moviebox v2 API
emoji: 🎬
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Moviebox Unofficial v2 API

High-speed FastAPI gateway over the MovieBox H5 REST backend
(`h5-api.aoneroom.com`). Returns **every stream quality + all subtitles in a
single request**.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Liveness probe |
| GET | `/docs` | Interactive Swagger UI |
| GET | `/homepage` | Landing-page content |
| GET | `/search?q=Titanic&type=movies&page=1` | Search |
| GET | `/details/{id}` | Item details (`id` = subjectId or detailPath) |
| GET | `/download/{id}?se=1&ep=1` | All stream links + subtitles |

### Examples

```
/search?q=Titanic&type=movies
/details/titanic-QOuOQeUejq8
/download/titanic-QOuOQeUejq8
/download/merlin-sMxCiIO6fZ9?se=1&ep=2     # tv-series
```

`type` accepts: `all, movies, tv_series, anime, music, education`.

## Notes

The H5 backend may rate-limit (HTTP 429) requests coming from some datacenter
IP ranges. If `/search` returns a 429 error, this Space's egress IP is being
throttled by the upstream host — redeploy/restart or try another host region.

## Local run

```bash
pip install -r requirements.txt
python app.py            # serves on http://localhost:7860
```
