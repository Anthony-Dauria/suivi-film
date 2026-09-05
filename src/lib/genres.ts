import type { MediaType } from "./types";

/**
 * Genres TMDB en français. Les identifiants diffèrent entre films et séries
 * (« Action » vaut 28 pour un film, « Action & Aventure » 10759 pour une
 * série) : chaque type a donc sa propre table.
 *
 * Elle sert de repli côté client, pour ne pas dépendre d'un appel réseau pour
 * un simple libellé.
 */
export const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Aventure",
  16: "Animation",
  35: "Comédie",
  80: "Crime",
  99: "Documentaire",
  18: "Drame",
  10751: "Familial",
  14: "Fantastique",
  36: "Histoire",
  27: "Horreur",
  10402: "Musique",
  9648: "Mystère",
  10749: "Romance",
  878: "Science-fiction",
  10770: "Téléfilm",
  53: "Thriller",
  10752: "Guerre",
  37: "Western",
};

export const TV_GENRES: Record<number, string> = {
  10759: "Action & Aventure",
  16: "Animation",
  35: "Comédie",
  80: "Crime",
  99: "Documentaire",
  18: "Drame",
  10751: "Familial",
  10762: "Jeunesse",
  9648: "Mystère",
  10763: "Information",
  10764: "Téléréalité",
  10765: "Science-fiction & Fantastique",
  10766: "Feuilleton",
  10767: "Talk-show",
  10768: "Guerre & Politique",
  37: "Western",
};

export function genreName(id: number, mediaType: MediaType): string {
  return (mediaType === "tv" ? TV_GENRES : MOVIE_GENRES)[id] ?? "Autre";
}

function toList(genres: Record<number, string>) {
  return Object.entries(genres)
    .map(([id, name]) => ({ id: Number(id), name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export const MOVIE_GENRE_LIST = toList(MOVIE_GENRES);
export const TV_GENRE_LIST = toList(TV_GENRES);

export function genreList(mediaType: MediaType) {
  return mediaType === "tv" ? TV_GENRE_LIST : MOVIE_GENRE_LIST;
}

/**
 * Clé d'affinité utilisée par le profil de goût : un même identifiant peut
 * désigner deux genres différents selon le type d'œuvre.
 */
export function genreKey(id: number, mediaType: MediaType): string {
  return `${mediaType}:${id}`;
}
