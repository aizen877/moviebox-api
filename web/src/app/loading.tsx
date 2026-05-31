import styles from "./page.module.css";

export default function Loading() {
  return (
    <main className={styles.main}>
      {/* Hero Banner Skeleton */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className="skeleton" style={{ width: "100%", height: "100%", opacity: 0.15 }} />
          <div className={styles.heroGradient}></div>
        </div>
        
        <div className={`container ${styles.heroContent}`}>
          {/* Title Skeleton */}
          <div className="skeleton" style={{ height: "4.5rem", width: "50%", minWidth: "300px", marginBottom: "1.5rem" }} />
          
          {/* Metadata Row Skeleton */}
          <div className={styles.heroMeta} style={{ gap: "1rem", marginBottom: "2rem" }}>
            <div className="skeleton" style={{ height: "1.2rem", width: "60px" }} />
            <div className="skeleton" style={{ height: "1.2rem", width: "150px" }} />
            <div className="skeleton" style={{ height: "1.2rem", width: "50px" }} />
          </div>
          
          {/* Buttons Skeleton */}
          <div className={styles.heroActions} style={{ gap: "1rem" }}>
            <div className="skeleton" style={{ height: "3rem", width: "140px", borderRadius: "8px" }} />
            <div className="skeleton" style={{ height: "3rem", width: "140px", borderRadius: "8px" }} />
          </div>
        </div>
      </section>

      {/* Content Carousels Skeletons */}
      <div className={`container ${styles.contentWrapper}`} style={{ marginTop: "-5vh" }}>
        {[1, 2].map((carouselIdx) => (
          <div key={carouselIdx} style={{ margin: "3rem 0", position: "relative" }}>
            {/* Carousel Title Skeleton */}
            <div className="skeleton" style={{ height: "2rem", width: "200px", marginBottom: "1.5rem" }} />
            
            {/* Carousel Row Skeleton */}
            <div style={{ display: "flex", gap: "1rem", overflow: "hidden" }}>
              {[1, 2, 3, 4, 5, 6].map((cardIdx) => (
                <div
                  key={cardIdx}
                  style={{
                    flex: "0 0 250px",
                    width: "250px",
                    aspectRatio: "2 / 3",
                    borderRadius: "8px",
                  }}
                  className="skeleton"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
