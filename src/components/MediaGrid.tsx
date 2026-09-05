"use client";

import { MediaCard, type MediaCardProps } from "@/components/MediaCard";

const keyOf = (media: MediaCardProps) => `${media.mediaType}:${media.id}`;

/** Grille d'affiches : deux colonnes sur téléphone, jusqu'à six sur grand écran. */
export function MediaGrid({ items }: { items: MediaCardProps[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((media, index) => (
        <li className="flex" key={keyOf(media)}>
          <MediaCard {...media} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Carrousel horizontal. Sur mobile il déborde volontairement des marges de la
 * page pour signaler qu'il défile, tout en gardant l'alignement du texte.
 */
export function MediaRow({ items }: { items: MediaCardProps[] }) {
  return (
    <ul className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0">
      {items.map((media) => (
        <li className="flex w-[42vw] max-w-[190px] shrink-0 snap-start sm:w-44" key={keyOf(media)}>
          <MediaCard {...media} />
        </li>
      ))}
    </ul>
  );
}
