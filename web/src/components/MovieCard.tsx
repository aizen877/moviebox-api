"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, Loader2 } from "lucide-react";
import styles from "./MovieCard.module.css";
import { prefetchDetails } from "@/services/contentCache";
import { img } from "@/services/image";

interface Movie {
  _id?: string;
  id?: string | number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface MovieCardProps {
  movie: Movie;
  /** Eager-load the image (use for the first few above-the-fold cards). */
  priority?: boolean;
}

export default function MovieCard({ movie, priority = false }: MovieCardProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  // Reset navigating state if the path changes (navigation completed) or user goes back
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const title = movie.title || movie.name;
  const imagePath = movie.poster_path || movie.backdrop_path;
  const rawImageUrl = imagePath
    ? (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("//")
      ? imagePath
      : `https://image.tmdb.org/t/p/w500${imagePath}`)
    : "/placeholder.png";
  // Route through wsrv.nl: resized WebP served from Cloudflare edge cache
  const imageUrl = img.poster(rawImageUrl);
  const date = movie.release_date || movie.first_air_date;
  const year = date ? new Date(date).getFullYear() : "";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "";

  // Use a fallback ID format if _id is not present
  const id = movie._id || movie.id;
  const type = movie.media_type || "movie";
  const linkHref = `/${type === "tv" ? "tv" : "movie"}/${id}`;

  // Warm the detail-page cache on hover/touch so navigation skips the skeleton
  const handlePrefetch = () => {
    if (id) {
      prefetchDetails(String(id), type === "tv" ? "tv" : "movie");
    }
  };

  const handleClick = () => {
    setIsNavigating(true);
  };

  return (
    <Link
      href={linkHref}
      className={`${styles.cardWrapper} ${isNavigating ? styles.navigating : ""}`}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      onFocus={handlePrefetch}
      onClick={handleClick}
      prefetch={true}
    >
      <div className={styles.card}>
        {/* Skeleton lives as the container background; the image paints on top of
            it and covers it as soon as it loads. No JS state, so it can never get
            stuck behind a skeleton. */}
        <div className={`${styles.imageContainer} skeleton`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title || "Movie poster"}
            className={`${styles.image} ${isNavigating ? styles.imagePulse : ""}`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
          <div className={`${styles.overlay} ${isNavigating ? styles.overlayActive : ""}`}>
            <div className={styles.playButton}>
              {isNavigating ? (
                <Loader2 className={styles.spinner} color="white" size={24} />
              ) : (
                <Play fill="white" size={24} />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.bottomInfo}>
        <h3 className={styles.bottomTitle}>{title}</h3>
        <div className={styles.bottomMeta}>
          {year && <span className={styles.year}>{year}</span>}
          {rating && (
            <span className={styles.rating}>
              ★ {rating}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
