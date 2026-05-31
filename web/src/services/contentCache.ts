/**
 * Shared content cache + prefetch layer.
 *
 * Goals:
 *  - Decouple the slow TMDB enrichment from the critical render path so the
 *    page paints as soon as the MovieBox details respond.
 *  - Deduplicate in-flight requests (so hover-prefetch + click never double-fetch).
 *  - Persist core details to sessionStorage so reloads / back-forward are instant.
 *  - Allow MovieCards to warm the cache on hover so navigation feels instant
 *    (no skeleton on the destination page).
 */

const BASE_URL = "https://moviebox-v2-api.onrender.com";

export interface CoreDetails {
  movie: any;
  cast: any[];
  seasons: any;
}

export interface TmdbEnrichment {
  backdropUrl: string | null;
  logoUrl: string | null;
  meta: any;
}

// In-memory caches (survive client-side navigation within the session)
const coreCache: Record<string, CoreDetails> = {};
const tmdbCache: Record<string, TmdbEnrichment> = {};
const recsCache: Record<string, any[]> = {};

// In-flight request dedupe maps
const pendingCore: Record<string, Promise<CoreDetails>> = {};
const pendingTmdb: Record<string, Promise<TmdbEnrichment>> = {};
const pendingRecs: Record<string, Promise<any[]>> = {};

// ---------- sessionStorage persistence (core details only) ----------

function persistCore(id: string, data: CoreDetails) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`mbx:core:${id}`, JSON.stringify(data));
  } catch {
    /* storage full or unavailable — ignore, in-memory cache still works */
  }
}

function loadPersistedCore(id: string): CoreDetails | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`mbx:core:${id}`);
    return raw ? (JSON.parse(raw) as CoreDetails) : null;
  } catch {
    return null;
  }
}

// ---------- synchronous cache getters ----------

export function getCachedCore(id: string): CoreDetails | null {
  if (coreCache[id]) return coreCache[id];
  const persisted = loadPersistedCore(id);
  if (persisted) {
    coreCache[id] = persisted; // hydrate in-memory cache
    return persisted;
  }
  return null;
}

export function getCachedTmdb(id: string): TmdbEnrichment | null {
  return tmdbCache[id] || null;
}

export function getCachedRecs(id: string): any[] | null {
  return recsCache[id] || null;
}

// ---------- fetchers (deduped) ----------

export function fetchCore(id: string): Promise<CoreDetails> {
  const cached = getCachedCore(id);
  if (cached) return Promise.resolve(cached);

  if (!pendingCore[id]) {
    pendingCore[id] = (async () => {
      const res = await fetch(`${BASE_URL}/details/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch details");
      const json = await res.json();
      const data: CoreDetails = {
        movie: json?.data?.subject || null,
        cast: json?.data?.stars || [],
        seasons: json?.seasons || null,
      };
      coreCache[id] = data;
      persistCore(id, data);
      return data;
    })();
    // Clean up the pending entry once settled so failures can be retried
    pendingCore[id].catch(() => {}).finally(() => {
      delete pendingCore[id];
    });
  }
  return pendingCore[id];
}

export function fetchTmdb(
  id: string,
  type: "movie" | "tv",
  title: string
): Promise<TmdbEnrichment> {
  if (tmdbCache[id]) return Promise.resolve(tmdbCache[id]);

  if (!pendingTmdb[id]) {
    pendingTmdb[id] = (async () => {
      let result: TmdbEnrichment = { backdropUrl: null, logoUrl: null, meta: null };
      try {
        if (type === "movie") {
          const { searchMovie } = await import("@/services/tmdb");
          const meta = await searchMovie(title);
          result = {
            backdropUrl: meta?.backdrop_url || null,
            logoUrl: meta?.logo_url || null,
            meta,
          };
        } else {
          const { searchTVShow } = await import("@/services/tmdb");
          const meta = await searchTVShow(title);
          result = {
            backdropUrl: meta?.backdrop_url || null,
            logoUrl: meta?.logo_url || null,
            meta,
          };
        }
      } catch (e) {
        console.error("TMDB enrichment failed:", e);
      }
      tmdbCache[id] = result;
      return result;
    })();
    pendingTmdb[id].catch(() => {}).finally(() => {
      delete pendingTmdb[id];
    });
  }
  return pendingTmdb[id];
}

export function fetchRecs(id: string): Promise<any[]> {
  if (recsCache[id]) return Promise.resolve(recsCache[id]);

  if (!pendingRecs[id]) {
    pendingRecs[id] = (async () => {
      const res = await fetch(`${BASE_URL}/recommend/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      const json = await res.json();
      const items = json?.items || [];
      return items.map((r: any) => ({
        id: r.subject_id,
        title: r.title,
        poster_path: r.cover_image,
        vote_average: parseFloat(r.imdb_rating || "0"),
        release_date: r.release_date,
        _id: r.detail_path,
        media_type: r.subject_type === "TV_SERIES" ? "tv" : "movie",
      }));
    })();
    pendingRecs[id]
      .then((mapped) => {
        recsCache[id] = mapped;
      })
      .catch(() => {})
      .finally(() => {
        delete pendingRecs[id];
      });
  }
  return pendingRecs[id];
}

// ---------- prefetch (fire-and-forget, used on hover) ----------

const prefetched = new Set<string>();

/**
 * Warms the cache for a detail page. Safe to call repeatedly (hover events) —
 * it only triggers the actual network work once per id.
 */
export function prefetchDetails(id: string, type: "movie" | "tv") {
  if (!id || prefetched.has(id)) return;
  prefetched.add(id);

  fetchCore(id)
    .then((core) => {
      if (core?.movie?.title) {
        // Kick off TMDB enrichment so the backdrop/logo are ready too
        fetchTmdb(id, type, core.movie.title).catch(() => {});
      }
    })
    .catch(() => {
      // allow a future retry if the prefetch failed
      prefetched.delete(id);
    });

  fetchRecs(id).catch(() => {});
}

// ---------- download / stream links (per id + season + episode) ----------

const downloadCache: Record<string, any[]> = {};
const pendingDownloads: Record<string, Promise<any[]>> = {};

function downloadKey(id: string, season: number, episode: number) {
  return `${id}:${season}:${episode}`;
}

export function getCachedDownload(id: string, season: number, episode: number): any[] | null {
  return downloadCache[downloadKey(id, season, episode)] || null;
}

export function fetchDownload(id: string, season: number, episode: number): Promise<any[]> {
  const key = downloadKey(id, season, episode);
  if (downloadCache[key]) return Promise.resolve(downloadCache[key]);

  if (!pendingDownloads[key]) {
    pendingDownloads[key] = (async () => {
      const res = await fetch(
        `${BASE_URL}/download/${encodeURIComponent(id)}?season=${season}&episode=${episode}`
      );
      if (!res.ok) throw new Error("Failed to fetch download links");
      const json = await res.json();
      const files = json?.files || [];
      downloadCache[key] = files;
      return files;
    })();
    pendingDownloads[key].catch(() => {}).finally(() => {
      delete pendingDownloads[key];
    });
  }
  return pendingDownloads[key];
}

/**
 * Warms the streaming links for a title so the watch page can open instantly.
 * Call this when the user hovers/clicks a Play button.
 */
export function prefetchDownload(id: string, season: number, episode: number) {
  fetchDownload(id, season, episode).catch(() => {});
}
