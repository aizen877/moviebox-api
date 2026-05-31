// =============================================================================
// Moviebox Unofficial API Worker  (v2 - H5 REST backend)
// =============================================================================
// Targets the dedicated H5 REST-API backend (h5-api.aoneroom.com & mirrors).
// No request signing, no v3->v2 id bridging: the v2 endpoints accept a plain
// subjectId directly and return EVERY stream quality + all subtitles in a
// single /subject/download request, which makes this far faster than the old
// v3 flow that probed each resolution separately.
//
// Endpoints:
//   GET /                      -> service info
//   GET /homepage              -> landing page content
//   GET /search?q=&type=&page= -> search movies/tv/etc
//   GET /details/{id}          -> item details (id = subjectId or detailPath)
//   GET /download/{id}?se=&ep= -> all stream links + subtitles
//   (aliases: /watch/{id}, /stream/{id})
// =============================================================================

// Mirror hosts for the H5 REST backend. Tried in order until one succeeds.
const V2_HOST_POOL = [
  "https://h5-api.aoneroom.com",
  "https://fmoviesunblocked.net",
  "https://moviebox.id",
  "https://sflix.film",
];

const RETRY_STATUS = [403, 407, 429, 500, 502, 503, 504];
const REQUEST_TIMEOUT_MS = 8000;

// IMPORTANT: the H5 backend gates /subject/download on this exact Referer/Origin.
// It must be the web frontend origin, NOT the API mirror host, otherwise the
// server returns hasResource=false with empty downloads. (Matches the Python
// client's moviebox_api.v2.constants.REFERER.)
const WEB_ORIGIN = "https://videodownloader.site/";

// Subject type integer map (matches moviebox_api.v1.constants.SubjectType)
const SUBJECT_TYPE = {
  all: 0,
  movies: 1,
  movie: 1,
  tv: 2,
  tv_series: 2,
  series: 2,
  education: 5,
  music: 6,
  anime: 7,
};
const SUBJECT_TYPE_NAME = {
  0: "ALL",
  1: "MOVIES",
  2: "TV_SERIES",
  5: "EDUCATION",
  6: "MUSIC",
  7: "ANIME",
};

function v2Headers() {
  return {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
    "Accept-Language": "en-US,en;q=0.5",
    Referer: WEB_ORIGIN,
    Origin: WEB_ORIGIN,
  };
}

/**
 * Call a v2 H5 endpoint, trying each mirror host until one responds OK.
 * Returns the unwrapped `data` field of the API envelope.
 */
async function fetchV2(path, { params = {}, method = "GET", body = null } = {}) {
  let lastError = null;

  for (const base of V2_HOST_POOL) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const url = new URL(`${base}${path}`);
      Object.keys(params).forEach((k) => {
        if (params[k] !== undefined && params[k] !== null) {
          url.searchParams.append(k, params[k]);
        }
      });

      const headers = v2Headers();
      const init = { method, headers, signal: controller.signal };
      if (body) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url.toString(), init);
      clearTimeout(timeoutId);

      if (RETRY_STATUS.includes(response.status) || !response.ok) {
        lastError = `Status ${response.status} from ${base}`;
        continue;
      }

      const json = await response.json();
      if (json && json.code !== undefined && json.code !== 0) {
        lastError = `API code ${json.code} (${json.message || ""}) from ${base}`;
        continue;
      }
      return json && "data" in json ? json.data : json;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = `${err.message} from ${base}`;
    }
  }

  throw new Error(`All v2 hosts failed for ${path}. Last error: ${lastError}`);
}

// ---- Endpoint handlers ------------------------------------------------------

async function handleHomepage() {
  const data = await fetchV2("/wefeed-h5api-bff/home", {
    params: { host: "moviebox.ph" },
  });
  return { status: "success", data };
}

async function handleSearch(q, typeParam, page) {
  const subjectType = SUBJECT_TYPE[(typeParam || "all").toLowerCase()] ?? 0;
  const data = await fetchV2("/wefeed-h5api-bff/subject/search", {
    method: "POST",
    body: {
      keyword: q,
      page: parseInt(page) || 1,
      perPage: 20,
      subjectType: subjectType,
    },
  });

  let items = (data && data.items) || [];
  // Server sometimes returns irrelevant items for a filtered search
  if (subjectType !== 0) {
    items = items.filter((it) => it.subjectType === subjectType);
  }

  return {
    status: "success",
    query: q,
    type: typeParam,
    page: parseInt(page) || 1,
    data: { ...data, items },
  };
}

async function handleDetails(id) {
  // v2 /detail accepts EITHER subjectId or detailPath
  const isNumericId = /^\d{15,21}$/.test(id);
  const params = isNumericId ? { subjectId: id } : { detailPath: id };
  const data = await fetchV2("/wefeed-h5api-bff/detail", { params });
  return { status: "success", id, data };
}

async function handleDownload(id, season, episode) {
  // Pull details first for title / cover / type metadata.
  const isNumericId = /^\d{15,21}$/.test(id);
  let details = null;
  try {
    details = await fetchV2("/wefeed-h5api-bff/detail", {
      params: isNumericId ? { subjectId: id } : { detailPath: id },
    });
  } catch (e) {
    console.error("Detail fetch failed (continuing):", e.message);
  }

  const subject = details && details.subject ? details.subject : details || {};
  const subjectId = subject.subjectId || id;
  const subjectType = subject.subjectType || 1;
  const isTvSeries = subjectType === 2;

  // v2 /download returns ALL qualities + subtitles in one call.
  // It works with subjectId alone (detailPath can be empty).
  const dlData = await fetchV2("/wefeed-h5api-bff/subject/download", {
    params: {
      subjectId: subjectId,
      se: isTvSeries ? season || 1 : 0,
      ep: isTvSeries ? episode || 1 : 0,
      detailPath: subject.detailPath || (isNumericId ? "" : id),
    },
  });

  const downloads = (dlData && dlData.downloads) || [];
  const captions = (dlData && dlData.captions) || [];

  const files = downloads.map((f) => {
    const streamUrl = f.url;
    const sizeBytes = f.size || 0;
    return {
      resolution: f.resolution ? `${f.resolution}p` : "unknown",
      resolution_value: f.resolution || 0,
      size_bytes: sizeBytes,
      size_mb: parseFloat((sizeBytes / (1024 * 1024)).toFixed(2)),
      id: f.id || "",
      stream_link: streamUrl,
      url: streamUrl,
    };
  });

  const subtitles = captions.map((c) => ({
    id: c.id || "",
    language: c.lanName || c.lan || "Unknown",
    language_code: c.lan || "",
    size_bytes: c.size || 0,
    delay: c.delay || 0,
    url: c.url,
  }));

  return {
    status: "success",
    subject_id: subjectId,
    detail_path: subject.detailPath || (isNumericId ? null : id),
    title: subject.title || "Unknown",
    subject_type: SUBJECT_TYPE_NAME[subjectType] || String(subjectType),
    release_date: subject.releaseDate || "",
    description: subject.description || "",
    cover_image: subject.cover ? subject.cover.url : null,
    has_resource: dlData ? dlData.hasResource : false,
    limited: dlData ? dlData.limited : false,
    qualities_count: files.length,
    files: files,
    subtitles: subtitles,
  };
}

// ---- Worker entrypoint ------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Content-Type", "application/json");
    headers.set("Cache-Control", "s-maxage=3600");

    if (request.method !== "GET") {
      return new Response('{"error":"Only GET allowed"}', {
        status: 405,
        headers,
      });
    }

    // Edge cache lookup
    const cache = caches.default;
    let response = await cache.match(request);
    if (response) {
      return response;
    }

    try {
      let responseData = null;

      if (url.pathname === "/") {
        responseData = {
          status: "online",
          service: "Moviebox Unofficial API (v2 H5 REST Backend)",
          message:
            "High-speed Moviebox v2 API on Cloudflare Workers. " +
            "All stream qualities + subtitles in a single request. 🚀",
          endpoints: ["/homepage", "/search?q=", "/details/{id}", "/download/{id}"],
        };
      } else if (url.pathname === "/homepage") {
        responseData = await handleHomepage();
      } else if (url.pathname === "/search") {
        const q = url.searchParams.get("q");
        if (!q) {
          return new Response('{"error":"Missing q parameter"}', {
            status: 400,
            headers,
          });
        }
        const page = url.searchParams.get("page") || 1;
        const type = url.searchParams.get("type") || "all";
        responseData = await handleSearch(q, type, page);
      } else if (url.pathname.startsWith("/details/")) {
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        if (!id) {
          return new Response('{"error":"Missing id"}', { status: 400, headers });
        }
        responseData = await handleDetails(id);
      } else if (
        url.pathname.startsWith("/download/") ||
        url.pathname.startsWith("/watch/") ||
        url.pathname.startsWith("/stream/")
      ) {
        const id = decodeURIComponent(url.pathname.split("/")[2] || "");
        if (!id) {
          return new Response('{"error":"Missing id"}', { status: 400, headers });
        }
        const season = parseInt(
          url.searchParams.get("season") || url.searchParams.get("se") || "1"
        );
        const episode = parseInt(
          url.searchParams.get("episode") || url.searchParams.get("ep") || "1"
        );
        responseData = await handleDownload(id, season, episode);
      } else {
        return new Response('{"error":"Not Found"}', { status: 404, headers });
      }

      response = new Response(JSON.stringify(responseData), { headers });
      ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    } catch (err) {
      headers.set("Cache-Control", "no-cache");
      return new Response(
        JSON.stringify({ error: err.message, stack: err.stack }),
        { status: 500, headers }
      );
    }
  },
};
