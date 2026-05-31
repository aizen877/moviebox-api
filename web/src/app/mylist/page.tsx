"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MovieCard from "@/components/MovieCard";
import { getMyList } from "@/services/mylist";
import styles from "../browse.module.css";

export default function MyListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(getMyList());
    setLoaded(true);

    // Keep in sync if the list changes in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === "mbx:mylist") setItems(getMyList());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <main className={styles.main}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            My <span>List</span>
          </h1>
          <p className={styles.subtitle}>Titles you saved to watch later.</p>
        </div>

        {loaded && items.length === 0 ? (
          <div className={styles.empty}>
            <h2>Your list is empty</h2>
            <p>Tap the + button on any movie or show to save it here.</p>
            <Link href="/" className={styles.browseLink}>
              Browse titles
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((item: any) => (
              <div key={item._id || item.id} className={styles.gridItem}>
                <MovieCard movie={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
