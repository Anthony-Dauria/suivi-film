/**
 * Table des genres TMDB en français. Elle sert de repli côté client (et pour la
 * bibliothèque hors ligne) afin de ne pas dépendre d'un appel réseau pour un
 * simple libellé.
 */
export const GENRES: Record<number, string> = {
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

export function genreName(id: number): string {
  return GENRES[id] ?? "Autre";
}

export function genreNames(ids: number[] | undefined): string[] {
  return (ids ?? []).map(genreName);
}

export const GENRE_LIST = Object.entries(GENRES)
  .map(([id, name]) => ({ id: Number(id), name }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));
