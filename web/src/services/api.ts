const BASE_URL = "https://movie-api.opsihab.tech";

export async function getHomepage() {
  const res = await fetch(`${BASE_URL}/homepage`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Failed to fetch homepage");
  return res.json();
}

export async function searchContent(query: string, type = "all", page = 1) {
  const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&type=${type}&page=${page}`);
  if (!res.ok) throw new Error("Failed to search");
  return res.json();
}

export async function getDetails(detailPath: string) {
  const res = await fetch(`${BASE_URL}/details/${encodeURIComponent(detailPath)}`);
  if (!res.ok) throw new Error("Failed to fetch details");
  return res.json();
}

export async function getDownloadLinks(detailPath: string, season = 0, episode = 0) {
  const res = await fetch(`${BASE_URL}/download/${encodeURIComponent(detailPath)}?season=${season}&episode=${episode}`);
  if (!res.ok) throw new Error("Failed to fetch download links");
  return res.json();
}

export async function getRecommendations(detailPath: string) {
  const res = await fetch(`${BASE_URL}/recommend/${encodeURIComponent(detailPath)}`);
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

/**
 * Maps a raw homepage/search subject into the shape MovieCard expects.
 */
export function mapSubject(s: any) {
  return {
    id: s.subjectId,
    title: s.title,
    poster_path: s.cover?.url,
    vote_average: parseFloat(s.imdbRatingValue || "0"),
    release_date: s.releaseDate,
    _id: s.detailPath,
    media_type: s.subjectType === 2 ? "tv" : "movie",
    subjectType: s.subjectType,
  };
}

/**
 * Returns the homepage carousel blocks (title + subjects), normalized.
 * Used by the browse pages (Movies / TV / New & Popular).
 */
export async function getBrowseSections() {
  const data = await getHomepage();
  const operatingList = data?.data?.operatingList || [];
  return operatingList
    .filter(
      (op: any) =>
        (op.type === "SUBJECTS_MOVIE" || op.type === "CUSTOM") &&
        op.subjects &&
        op.subjects.length > 0
    )
    .map((op: any) => ({
      title: (op.title || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim(),
      subjects: op.subjects.map(mapSubject),
    }));
}
