"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, User } from "lucide-react";
import styles from "./Navbar.module.css";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tv", label: "TV Shows" },
  { href: "/movies", label: "Movies" },
  { href: "/new", label: "New & Popular" },
  { href: "/mylist", label: "My List" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hide the navbar entirely on the full-screen watch experience
  if (pathname?.startsWith("/watch/")) {
    return null;
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Logo />
          <nav className={styles.navLinks}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(link.href) ? styles.active : ""}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.right}>
          <Link href="/search" className={styles.iconBtn} aria-label="Search">
            <Search size={20} />
          </Link>
          <button className={styles.iconBtn} aria-label="Notifications">
            <Bell size={20} />
          </button>
          <div className={styles.profile}>
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
