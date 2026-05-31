import Link from "next/link";
import styles from "./Logo.module.css";

interface LogoProps {
  /** Optional href; defaults to home. */
  href?: string;
}

/**
 * CINEAURA brand lockup: a modern play-prism SVG mark + wordmark.
 * Matches the cinematic BrandIntro styling at a compact navbar size.
 */
export default function Logo({ href = "/" }: LogoProps) {
  return (
    <Link href={href} className={styles.logo} aria-label="CineAura home">
      <svg className={styles.mark} viewBox="0 0 120 120" width="30" height="30" aria-hidden="true">
        <defs>
          <linearGradient id="logo-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF2D55" />
            <stop offset="50%" stopColor="#E50914" />
            <stop offset="100%" stopColor="#FF9500" />
          </linearGradient>
        </defs>
        {/* Outer Aura Circle */}
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="url(#logo-ring)"
          strokeWidth="8"
        />
        {/* Split futuristic play-prism */}
        <path d="M48 40 L62 48 L62 72 L48 80 Z" fill="#fff" />
        <path d="M68 51 L84 60 L68 69 Z" fill="url(#logo-ring)" />
      </svg>
      <span className={styles.word}>
        CINE<span className={styles.aura}>AURA</span>
      </span>
    </Link>
  );
}

