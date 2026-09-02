"use client";

import { MovieCard, type MovieCardProps } from "@/components/MovieCard";

/** Grille responsive d'affiches. */
export function MovieGrid({ movies }: { movies: MovieCardProps[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((movie, index) => (
        <li key={movie.id}>
          <MovieCard {...movie} priority={index < 6} />
        </li>
      ))}
    </ul>
  );
}

/** Carrousel horizontal, pour les sections secondaires. */
export function MovieRow({ movies }: { movies: MovieCardProps[] }) {
  return (
    <ul className="scroll-row">
      {movies.map((movie) => (
        <li className="w-[45vw] shrink-0 snap-start sm:w-44" key={movie.id}>
          <MovieCard {...movie} />
        </li>
      ))}
    </ul>
  );
}
