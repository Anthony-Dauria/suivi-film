import Image from "next/image";

const SIZES = {
  small: { width: 154, height: 231, path: "w185" },
  medium: { width: 300, height: 450, path: "w342" },
  large: { width: 400, height: 600, path: "w500" },
} as const;

interface PosterProps {
  path: string | null;
  alt: string;
  size?: keyof typeof SIZES;
  priority?: boolean;
  className?: string;
}

/** Affiche d'un film, avec un repli graphique quand TMDB n'en fournit pas. */
export function Poster({ path, alt, size = "medium", priority, className }: PosterProps) {
  const spec = SIZES[size];

  if (!path) {
    return (
      <div
        aria-label={alt}
        className={`flex items-center justify-center bg-ink-800 text-3xl text-ink-500 ${className ?? ""}`}
        role="img"
        style={{ aspectRatio: "2 / 3" }}
      >
        🎞️
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={spec.height}
      priority={priority}
      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
      src={`https://image.tmdb.org/t/p/${spec.path}${path}`}
      width={spec.width}
    />
  );
}
