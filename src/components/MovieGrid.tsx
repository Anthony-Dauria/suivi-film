"use client";

import { MovieCard, type MovieCardProps } from "@/components/MovieCard";

/** Grille d'affiches : deux colonnes sur téléphone, jusqu'à six sur grand écran. */
export function MovieGrid({ movies }: { movies: MovieCardProps[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((movie, index) => (
        <li className="flex" key={movie.id}>
          <MovieCard {...movie} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Carrousel horizontal. Sur mobile il déborde volontairement des marges de la
 * page pour signaler qu'il défile, tout en gardant l'alignement du texte.
 */
export function MovieRow({ movies }: { movies: MovieCardProps[] }) {
  return (
    <ul className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0">
      {movies.map((movie) => (
        <li className="flex w-[42vw] max-w-[190px] shrink-0 snap-start sm:w-44" key={movie.id}>
          <MovieCard {...movie} />
        </li>
      ))}
    </ul>
  );
}
