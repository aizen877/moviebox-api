import { getBrowseSections } from "@/services/api";
import MovieCard from "@/components/MovieCard";
import styles from "../browse.module.css";

export const metadata = {
  title: "Movies | CineAura",
};

export default async function MoviesPage() {
  const sections = await getBrowseSections().catch(() => []);

  // Keep only sections that contain movies, and within each keep only movies
  const movieSections = sections
    .map((sec: any) => ({
      title: sec.title,
      subjects: sec.subjects.filter((s: any) => s.subjectType === 1),
    }))
    .filter((sec: any) => sec.subjects.length > 0);

  return (
    <main className={styles.main}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            <span>Movies</span>
          </h1>
          <p className={styles.subtitle}>Blockbusters, classics, and everything in between.</p>
        </div>

        {movieSections.length === 0 ? (
          <div className={styles.empty}>
            <h2>Nothing to show right now</h2>
            <p>Please try again in a moment.</p>
          </div>
        ) : (
          movieSections.map((sec: any, idx: number) => (
            <section key={idx} className={styles.section}>
              <h2 className={styles.sectionTitle}>{sec.title}</h2>
              <div className={styles.grid}>
                {sec.subjects.map((movie: any) => (
                  <div key={movie._id || movie.id} className={styles.gridItem}>
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
