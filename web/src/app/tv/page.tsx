import { getBrowseSections } from "@/services/api";
import MovieCard from "@/components/MovieCard";
import styles from "../browse.module.css";

export const metadata = {
  title: "TV Shows | CineAura",
};

export default async function TVShowsPage() {
  const sections = await getBrowseSections().catch(() => []);

  // Keep only TV/series content (subjectType 2 = series, 7 = short TV)
  const tvSections = sections
    .map((sec: any) => ({
      title: sec.title,
      subjects: sec.subjects.filter((s: any) => s.subjectType === 2 || s.subjectType === 7),
    }))
    .filter((sec: any) => sec.subjects.length > 0);

  return (
    <main className={styles.main}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            <span>TV</span> Shows
          </h1>
          <p className={styles.subtitle}>Binge-worthy series, dramas, and anime.</p>
        </div>

        {tvSections.length === 0 ? (
          <div className={styles.empty}>
            <h2>Nothing to show right now</h2>
            <p>Please try again in a moment.</p>
          </div>
        ) : (
          tvSections.map((sec: any, idx: number) => (
            <section key={idx} className={styles.section}>
              <h2 className={styles.sectionTitle}>{sec.title}</h2>
              <div className={styles.grid}>
                {sec.subjects.map((show: any) => (
                  <div key={show._id || show.id} className={styles.gridItem}>
                    <MovieCard movie={show} />
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
