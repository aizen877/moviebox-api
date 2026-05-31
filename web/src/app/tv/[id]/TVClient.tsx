"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { Play, Plus, Check, ThumbsUp, Star, Loader2, ChevronDown } from "lucide-react";
import Carousel from "@/components/Carousel";
import {
  getCachedCore,
  getCachedTmdb,
  getCachedRecs,
  fetchCore,
  fetchTmdb,
  fetchRecs,
  prefetchDownload,
} from "@/services/contentCache";
import { img } from "@/services/image";
import { isInMyList, toggleMyList } from "@/services/mylist";

interface TVClientProps {
  id: string;
}

export default function TVClient({ id }: TVClientProps) {
  // Read any warmed cache synchronously so prefetched/cached pages skip the skeleton
  const cachedCore = getCachedCore(id);
  const cachedTmdb = getCachedTmdb(id);
  const cachedRecs = getCachedRecs(id);

  const [movie, setMovie] = useState<any>(cachedCore?.movie ?? null);
  const [cast, setCast] = useState<any[]>(cachedCore?.cast ?? []);
  const [seasonsData, setSeasonsData] = useState<any>(cachedCore?.seasons ?? null);
  const [tmdbBackdropUrl, setTmdbBackdropUrl] = useState<string | null>(cachedTmdb?.backdropUrl ?? null);
  const [tmdbShowMeta, setTmdbShowMeta] = useState<any>(cachedTmdb?.meta ?? null);
  
  const [recommendations, setRecommendations] = useState<any[]>(cachedRecs ?? []);
  
  const [selectedSeason, setSelectedSeason] = useState<number>(
    cachedCore?.seasons?.seasons?.[0]?.season ?? 1
  );
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(!cachedCore);
  const [recsLoading, setRecsLoading] = useState(!cachedRecs);
  const [inList, setInList] = useState(false);

  // Reflect the saved state once we know the show
  useEffect(() => {
    if (movie) {
      setInList(isInMyList({ _id: id, id }));
    }
  }, [movie, id]);

  const handleToggleList = () => {
    if (!movie) return;
    const nowIn = toggleMyList({
      _id: id,
      id,
      title: movie.title,
      poster_path: movie.cover?.url,
      vote_average: movie.imdbRatingValue ? parseFloat(movie.imdbRatingValue) : 0,
      release_date: movie.releaseDate,
      media_type: "tv",
    });
    setInList(nowIn);
  };

  // 1. Core Metadata Fetching & Caching
  useEffect(() => {
    let active = true;

    // Re-sync from cache on id change
    const core = getCachedCore(id);
    const tmdb = getCachedTmdb(id);
    const recs = getCachedRecs(id);

    if (core) {
      setMovie(core.movie);
      setCast(core.cast);
      setSeasonsData(core.seasons);
      if (core.seasons?.seasons?.[0]?.season) {
        setSelectedSeason(core.seasons.seasons[0].season);
      }
      setLoading(false);
    } else {
      setLoading(true);
    }
    setTmdbBackdropUrl(tmdb?.backdropUrl ?? null);
    setTmdbShowMeta(tmdb?.meta ?? null);
    if (recs) {
      setRecommendations(recs);
      setRecsLoading(false);
    } else {
      setRecsLoading(true);
    }

    // CRITICAL PATH: MovieBox details only — render the instant these resolve.
    fetchCore(id)
      .then((data) => {
        if (!active) return;
        setMovie(data.movie);
        setCast(data.cast);
        setSeasonsData(data.seasons);
        if (data.seasons?.seasons?.[0]?.season) {
          setSelectedSeason(data.seasons.seasons[0].season);
        }
        setLoading(false);

        // NON-BLOCKING: TMDB backdrop/logo/meta swaps in (and feeds episode enrichment) when ready.
        if (data.movie?.title) {
          fetchTmdb(id, "tv", data.movie.title)
            .then((enr) => {
              if (!active) return;
              if (enr.backdropUrl) setTmdbBackdropUrl(enr.backdropUrl);
              setTmdbShowMeta(enr.meta);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Failed to load details", err);
        if (active) setLoading(false);
      });

    // NON-CRITICAL: recommendations
    fetchRecs(id)
      .then((mapped) => {
        if (!active) return;
        setRecommendations(mapped);
        setRecsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load recommendations", err);
        if (active) setRecsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  // 3. Load rich season episodes metadata from TMDB when selectedSeason or tmdbShowMeta changes
  useEffect(() => {
    if (!movie) return;

    const loadEpisodes = async () => {
      setEpisodesLoading(true);
      try {
        if (tmdbShowMeta?.id) {
          const { getSeasonEpisodes } = await import("@/services/tmdb");
          const eps = await getSeasonEpisodes(tmdbShowMeta.id, selectedSeason);
          setEpisodes(eps);
        } else {
          setEpisodes([]);
        }
      } catch (err) {
        console.error("Failed to load TMDB season episodes", err);
        setEpisodes([]);
      } finally {
        setEpisodesLoading(false);
      }
    };

    loadEpisodes();
  }, [selectedSeason, tmdbShowMeta, movie]);

  // 4. Enrich local episodes with TMDB metadata
  const currentSeasonInfo = useMemo(() => {
    if (!seasonsData?.seasons) return null;
    return seasonsData.seasons.find((s: any) => s.season === selectedSeason);
  }, [seasonsData, selectedSeason]);

  const enrichedEpisodes = useMemo(() => {
    const count = currentSeasonInfo?.episode_count || 0;
    return Array.from({ length: count }, (_, index) => {
      const epNum = index + 1;
      const tmdbEp = episodes.find((e: any) => e.episode_number === epNum);
      return {
        episode_number: epNum,
        name: tmdbEp?.name || `Episode ${epNum}`,
        overview: tmdbEp?.overview || `Episode ${epNum} of ${movie?.title || "TV Show"}.`,
        still_path: tmdbEp?.still_path || null,
        runtime: tmdbEp?.runtime || null,
        air_date: tmdbEp?.air_date || null,
      };
    });
  }, [currentSeasonInfo, episodes, movie]);

  // Loading / Skeleton State (100% matched to page layout to prevent layout shift)
  if (loading) {
    return (
      <div className={styles.main}>
        {/* Backdrop Skeleton */}
        <div className={styles.backdropContainer}>
          <div className="skeleton" style={{ width: "100%", height: "100%", opacity: 0.15 }} />
          <div className={styles.backdropGradient}></div>
        </div>

        <div className={`container ${styles.contentWrapper}`}>
          <div className={styles.mainContent}>
            {/* Poster Column Skeleton */}
            <div className={styles.posterColumn}>
              <div className={`${styles.poster} skeleton`} style={{ border: "none" }} />
            </div>
            
            {/* Info Column Skeleton */}
            <div className={styles.infoColumn}>
              {/* Title Skeleton */}
              <div className="skeleton" style={{ height: "3.5rem", width: "70%", marginBottom: "1.5rem" }} />
              
              {/* Meta Row Skeleton */}
              <div className={styles.metaRow} style={{ gap: "1rem" }}>
                <div className="skeleton" style={{ height: "1.2rem", width: "80px" }} />
                <div className="skeleton" style={{ height: "1.2rem", width: "60px" }} />
                <div className="skeleton" style={{ height: "1.2rem", width: "50px" }} />
              </div>
              
              {/* Genres Skeleton */}
              <div className={styles.genres} style={{ gap: "0.75rem", marginBottom: "2rem" }}>
                <div className="skeleton" style={{ height: "2rem", width: "100px", borderRadius: "20px" }} />
                <div className="skeleton" style={{ height: "2rem", width: "120px", borderRadius: "20px" }} />
                <div className="skeleton" style={{ height: "2rem", width: "80px", borderRadius: "20px" }} />
              </div>
              
              {/* Description Skeleton */}
              <div style={{ marginBottom: "2.5rem" }}>
                <div className="skeleton" style={{ height: "1.1rem", width: "100%", marginBottom: "0.75rem" }} />
                <div className="skeleton" style={{ height: "1.1rem", width: "95%", marginBottom: "0.75rem" }} />
                <div className="skeleton" style={{ height: "1.1rem", width: "70%", marginBottom: "0.75rem" }} />
              </div>
              
              {/* Action Buttons Skeleton */}
              <div className={styles.actionButtons} style={{ gap: "1rem", marginBottom: "3rem" }}>
                <div className="skeleton" style={{ height: "3.2rem", width: "160px", borderRadius: "8px" }} />
                <div className="skeleton" style={{ height: "3.2rem", width: "48px", borderRadius: "50%" }} />
                <div className="skeleton" style={{ height: "3.2rem", width: "48px", borderRadius: "50%" }} />
              </div>
              
              {/* Cast Skeleton */}
              <div className={styles.castSection}>
                <div className="skeleton" style={{ height: "2rem", width: "120px", marginBottom: "1.5rem" }} />
                <div className={styles.castList} style={{ gap: "1.5rem" }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={styles.castMember} style={{ background: "rgba(255, 255, 255, 0.02)", border: "none" }}>
                      <div className="skeleton" style={{ width: "60px", height: "60px", borderRadius: "50%", flexShrink: 0 }} />
                      <div className={styles.castInfo} style={{ gap: "0.5rem" }}>
                        <div className="skeleton" style={{ height: "1rem", width: "80px" }} />
                        <div className="skeleton" style={{ height: "0.85rem", width: "60px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className={styles.main}>
        <div className={styles.errorContainer}>
          <h1>TV Show not found</h1>
          <Link href="/" className={styles.playButton} style={{ marginTop: "2rem", background: "var(--accent-color)", color: "white" }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const bgImage = tmdbBackdropUrl || movie.cover?.url;

  return (
    <div className={styles.main}>
      <div className={styles.backdropContainer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.backdrop(bgImage)}
          alt={movie.title}
          className={styles.backdropImage}
          style={tmdbBackdropUrl ? { filter: "none", opacity: 0.35 } : undefined}
        />
        <div className={styles.backdropGradient}></div>
      </div>

      <div className={`container ${styles.contentWrapper}`}>
        <div className={styles.mainContent}>
          <div className={styles.posterColumn}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.poster(movie.cover?.url)}
              alt={movie.title}
              className={styles.poster}
            />
          </div>
          
          <div className={styles.infoColumn}>
            {tmdbShowMeta?.logo_url ? (
              <div className={styles.logoContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.logo(tmdbShowMeta.logo_url)}
                  alt={movie.title}
                  className={styles.titleLogo}
                />
              </div>
            ) : (
              <h1 className={styles.title}>{movie.title}</h1>
            )}
            
            <div className={styles.metaRow}>
              {movie.imdbRatingValue && (
                <span className={styles.rating}>
                  <Star fill="#fbbf24" color="#fbbf24" size={16} />
                  {movie.imdbRatingValue}
                </span>
              )}
              {movie.releaseDate && <span>{movie.releaseDate.split("-")[0]}</span>}
              {seasonsData?.total_episodes && <span>{seasonsData.total_episodes} Episodes</span>}
              <span className={styles.hdBadge}>HD</span>
            </div>
            
            {movie.genre && (
              <div className={styles.genres}>
                {movie.genre.split(",").map((g: string) => (
                  <span key={g} className={styles.genreTag}>{g.trim()}</span>
                ))}
              </div>
            )}
            
            <p className={styles.description}>{tmdbShowMeta?.overview || movie.description}</p>
            
            <div className={styles.actionButtons}>
              <Link
                href={`/watch/${id}?season=${selectedSeason}&episode=1`}
                className={styles.playButton}
                onMouseEnter={() => prefetchDownload(id, selectedSeason, 1)}
                onTouchStart={() => prefetchDownload(id, selectedSeason, 1)}
              >
                <Play fill="black" size={24} />
                <span>Play Season {selectedSeason}</span>
              </Link>
              <button
                className={styles.iconButton}
                onClick={handleToggleList}
                title={inList ? "Remove from My List" : "Add to My List"}
              >
                {inList ? <Check size={24} /> : <Plus size={24} />}
              </button>
              <button className={styles.iconButton}>
                <ThumbsUp size={24} />
              </button>
            </div>
            
            {cast.length > 0 && (
              <div className={styles.castSection}>
                <h3>Cast</h3>
                <div className={styles.castList}>
                  {cast.slice(0, 5).map((star: any) => (
                    <div key={star.staffId} className={styles.castMember}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={star.avatarUrl ? img.avatar(star.avatarUrl) : "/placeholder.png"} 
                        alt={star.name} 
                        className={styles.castAvatar}
                      />
                      <div className={styles.castInfo}>
                        <span className={styles.castName}>{star.name}</span>
                        <span className={styles.castRole}>{star.character}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Netflix-Style Season & Episode Catalog */}
            {seasonsData?.seasons && (
              <div className={styles.episodesSection}>
                <div className={styles.episodesHeader}>
                  <h3>Episodes</h3>
                  {seasonsData.seasons.length > 1 && (
                    <div className={styles.seasonSelectorWrapper}>
                      <select
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                        className={styles.seasonSelect}
                      >
                        {seasonsData.seasons.map((s: any) => (
                          <option key={s.season} value={s.season}>
                            Season {s.season} ({s.episode_count} Episodes)
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className={styles.dropdownIcon} />
                    </div>
                  )}
                </div>

                <div className={styles.episodesList}>
                  {episodesLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "150px" }}>
                      <Loader2 size={32} className="animate-spin text-red-600" style={{ color: "var(--accent-color)" }} />
                    </div>
                  ) : enrichedEpisodes.length > 0 ? (
                    enrichedEpisodes.map((ep) => {
                      const fallbackStill = tmdbBackdropUrl || movie.cover?.url || "/placeholder.png";
                      const stillSrc = img.still(ep.still_path || fallbackStill);
                      return (
                        <Link
                          key={ep.episode_number}
                          href={`/watch/${id}?season=${selectedSeason}&episode=${ep.episode_number}`}
                          className={styles.episodeCard}
                          onMouseEnter={() => prefetchDownload(id, selectedSeason, ep.episode_number)}
                          onTouchStart={() => prefetchDownload(id, selectedSeason, ep.episode_number)}
                        >
                          <div className={styles.episodeStillContainer}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={stillSrc}
                              alt={ep.name}
                              className={styles.episodeStill}
                              loading="lazy"
                            />
                            <div className={styles.episodePlayOverlay}>
                              <Play fill="white" size={24} color="white" />
                            </div>
                            <span className={styles.episodeNum}>{ep.episode_number}</span>
                          </div>
                          <div className={styles.episodeDetails}>
                            <div className={styles.episodeMetaRow}>
                              <span className={styles.episodeTitle}>{ep.name}</span>
                              {ep.runtime && (
                                <span className={styles.episodeRuntime}>{ep.runtime}m</span>
                              )}
                            </div>
                            <p className={styles.episodeOverview}>{ep.overview}</p>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>No episodes found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {recsLoading ? (
          <div className={styles.recommendations}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "600", borderLeft: "3px solid var(--accent-color)", paddingLeft: "0.5rem", marginBottom: "1.5rem", color: "var(--text-primary)" }}>More Like This</h3>
            <div style={{ display: "flex", gap: "1rem", overflow: "hidden" }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton" style={{ width: "160px", aspectRatio: "2/3", borderRadius: "8px", flexShrink: 0, opacity: 0.15 }} />
              ))}
            </div>
          </div>
        ) : recommendations.length > 0 ? (
          <div className={styles.recommendations}>
            <Carousel title="More Like This" movies={recommendations} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
