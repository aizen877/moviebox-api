"use client";

import { useState, useEffect } from "react";

import { searchContent } from "@/services/api";
import MovieCard from "@/components/MovieCard";
import styles from "./page.module.css";
import { Search as SearchIcon, Loader2 } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.trim() === "") {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await searchContent(debouncedQuery);
        // Map API response to MovieCard format
        const subjects = data?.data?.items || [];
        const mappedMovies = subjects.map((s: any) => ({
          id: s.subjectId,
          title: s.title,
          poster_path: s.cover?.url,
          vote_average: parseFloat(s.imdbRatingValue || "0"),
          release_date: s.releaseDate,
          _id: s.detailPath,
          media_type: s.subjectType === 2 ? "tv" : "movie",
        }));
        setResults(mappedMovies);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  return (
    <main className={styles.main}>
      <div className={`container ${styles.container}`}>
        <div className={styles.searchBar}>
          <SearchIcon className={styles.searchIcon} size={24} />
          <input
            type="text"
            placeholder="Search for movies, TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
          {loading && <Loader2 className={styles.spinner} size={24} />}
        </div>

        {results.length > 0 && (
          <div className={styles.resultsGrid}>
            {results.map((movie) => (
              <div key={movie.id} className={styles.gridItem}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        )}

        {query.trim() !== "" && !loading && results.length === 0 && (
          <div className={styles.noResults}>
            <p>No results found for "{query}"</p>
          </div>
        )}

        {query.trim() === "" && (
          <div className={styles.emptyState}>
            <h2>What are you looking for?</h2>
            <p>Search by title, character, or genre.</p>
          </div>
        )}
      </div>
    </main>
  );
}
