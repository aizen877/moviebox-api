
import Carousel from "@/components/Carousel";
import { getHomepage } from "@/services/api";
import styles from "./page.module.css";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import { img } from "@/services/image";

export default async function Home() {
  const data = await getHomepage();
  const operatingList = data?.data?.operatingList || [];

  // Extract banner
  const bannerBlock = operatingList.find((op: any) => op.type === "BANNER");
  const banners = bannerBlock?.banner?.items || [];
  const heroMovie = banners.length > 0 ? banners[0] : null;

  // Extract carousels
  const carouselBlocks = operatingList.filter(
    (op: any) =>
      (op.type === "SUBJECTS_MOVIE" || op.type === "CUSTOM") &&
      op.subjects &&
      op.subjects.length > 0
  );

  return (
    <main className={styles.main}>

      {heroMovie && (
        <section className={styles.hero}>
          <div className={styles.heroBackground}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.hero(heroMovie.image?.url || heroMovie.subject?.cover?.url)}
              alt={heroMovie.title}
              className={styles.heroImage}
            />
            <div className={styles.heroGradient}></div>
          </div>
          
          <div className={`container ${styles.heroContent}`}>
            <h1 className={styles.heroTitle}>{heroMovie.title}</h1>
            <p className={styles.heroMeta}>
              {heroMovie.subject?.releaseDate && <span>{heroMovie.subject.releaseDate.split("-")[0]}</span>}
              {heroMovie.subject?.genre && <span>{heroMovie.subject.genre.replace(/,/g, " • ")}</span>}
              {heroMovie.subject?.imdbRatingValue && <span className={styles.rating}>★ {heroMovie.subject.imdbRatingValue}</span>}
            </p>
            <div className={styles.heroActions}>
              <Link
                href={`/movie/${heroMovie.detailPath}`}
                className={styles.playButton}
              >
                <Play fill="black" size={20} />
                <span>Play Now</span>
              </Link>
              <Link
                href={`/movie/${heroMovie.detailPath}`}
                className={styles.infoButton}
              >
                <Info size={20} />
                <span>More Info</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className={`container ${styles.contentWrapper}`}>
        {carouselBlocks.map((block: any, idx: number) => {
          const mappedMovies = block.subjects.map((s: any) => ({
            id: s.subjectId,
            title: s.title,
            poster_path: s.cover?.url,
            vote_average: parseFloat(s.imdbRatingValue),
            release_date: s.releaseDate,
            _id: s.detailPath, // Use detailPath as the _id for routing
            media_type: s.subjectType === 2 ? "tv" : "movie",
          }));

          return (
            <Carousel key={idx} title={block.title} movies={mappedMovies} eager={idx === 0} />
          );
        })}
      </div>
    </main>
  );
}
