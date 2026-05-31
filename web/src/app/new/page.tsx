import { getBrowseSections } from "@/services/api";
import MovieCard from "@/components/MovieCard";
import styles from "../browse.module.css";

export const metadata = {
  title: "New & Popular | CineAura",
};

const HOT_KEYWORDS = ["trending", "hot", "upcoming", "new", "top", "this week", "cinema", "calendar"];

export default async function NewPopularPage() {
  const sections = await getBrowseSections().catch(() => []);

  // Prefer sections whose title signals freshness/popularity; fall back to all
  const matched = sections.filter((sec: any) =>
    HOT_KEYWORDS.some((k) => sec.title.toLowerCase().includes(k))
  );
  const display = matched.length > 0 ? matched : sections;

  return (
    <main className={styles.main}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            <span>New</span> &amp; Popular
          </h1>
          <p className={styles.subtitle}>What everyone is watching right now.</p>
        </div>

        {display.length === 0 ? (
          <div className={styles.empty}>
            <h2>Nothing to show right now</h2>
            <p>Please try again in a moment.</p>
          </div>
        ) : (
          display.map((sec: any, idx: number) => (
            <section key={idx} className={styles.section}>
              <h2 className={styles.sectionTitle}>{sec.title}</h2>
              <div className={styles.grid}>
                {sec.subjects.map((item: any) => (
                  <div key={item._id || item.id} className={styles.gridItem}>
                    <MovieCard movie={item} />
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
