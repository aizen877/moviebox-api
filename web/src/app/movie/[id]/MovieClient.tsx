"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { Play, Plus, Check, ThumbsUp, Star } from "lucide-react";
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

interface MovieClientProps {
  id: string;
}

export default function MovieClient({ id }: MovieClientProps) {
  // Synchronously read any warmed cache so a prefetched page renders instantly (no skeleton)
  const cachedCore = getCachedCore(id);
  const cachedTmdb = getCachedTmdb(id);
  const cachedRecs = getCachedRecs(id);

  const [movie, setMovie] = useState<any>(cachedCore?.movie ?? null);
  const [cast, setCast] = useState<any[]>(cachedCore?.cast ?? []);
  const [recommendations, setRecommendations] = useState<any[]>(cachedRecs ?? []);
  const [tmdbBackdropUrl, setTmdbBackdropUrl] = useState<string | null>(cachedTmdb?.backdropUrl ?? null);
  const [tmdbLogoUrl, setTmdbLogoUrl] = useState<string | null>(cachedTmdb?.logoUrl ?? null);
  const [loading, setLoading] = useState(!cachedCore);
  const [recsLoading, setRecsLoading] = useState(!cachedRecs);
  const [inList, setInList] = useState(false);

  // Reflect the saved state once we know the movie
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
      media_type: "movie",
    });
    setInList(nowIn);
  };

  useEffect(() => {
    let active = true;

    // Re-read cache on id change (e.g. client-side navigation between movies)
    const core = getCachedCore(id);
    const tmdb = getCachedTmdb(id);
    const recs = getCachedRecs(id);

    if (core) {
      setMovie(core.movie);
      setCast(core.cast);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setTmdbBackdropUrl(tmdb?.backdropUrl ?? null);
    setTmdbLogoUrl(tmdb?.logoUrl ?? null);
    if (recs) {
      setRecommendations(recs);
      setRecsLoading(false);
    } else {
      setRecsLoading(true);
    }

    // 1. CRITICAL PATH: MovieBox details only. Render as soon as this resolves.
    fetchCore(id)
      .then((data) => {
        if (!active) return;
        setMovie(data.movie);
        setCast(data.cast);
        setLoading(false);

        // 2. NON-BLOCKING: TMDB backdrop/logo enrichment swaps in when ready.
        if (data.movie?.title) {
          fetchTmdb(id, "movie", data.movie.title)
            .then((enr) => {
              if (!active) return;
              if (enr.backdropUrl) setTmdbBackdropUrl(enr.backdropUrl);
              if (enr.logoUrl) setTmdbLogoUrl(enr.logoUrl);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Failed to load details", err);
        if (active) setLoading(false);
      });

    // 3. NON-CRITICAL: recommendations (lazy section at the bottom)
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
          <h1>Movie not found</h1>
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
            {tmdbLogoUrl ? (
              <div className={styles.logoContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.logo(tmdbLogoUrl)}
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
              {movie.duration > 0 && <span>{Math.floor(movie.duration / 60)}m</span>}
              <span className={styles.hdBadge}>HD</span>
            </div>
            
            {movie.genre && (
              <div className={styles.genres}>
                {movie.genre.split(",").map((g: string) => (
                  <span key={g} className={styles.genreTag}>{g.trim()}</span>
                ))}
              </div>
            )}
            
            <p className={styles.description}>{movie.description}</p>
            
            <div className={styles.actionButtons}>
              <Link
                href={`/watch/${id}`}
                className={styles.playButton}
                onMouseEnter={() => prefetchDownload(id, 0, 0)}
                onTouchStart={() => prefetchDownload(id, 0, 0)}
              >
                <Play fill="black" size={24} />
                <span>Play</span>
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
