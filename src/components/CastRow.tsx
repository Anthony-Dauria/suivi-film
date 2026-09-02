import Image from "next/image";

import type { TmdbCredit } from "@/lib/types";

/** Casting principal avec photos, facon fiche Google. */
export function CastRow({ cast }: { cast: TmdbCredit[] }) {
  if (cast.length === 0) return null;

  return (
    <ul className="scroll-row">
      {cast.map((person) => (
        <li className="w-28 shrink-0 snap-start text-center" key={`${person.id}-${person.order}`}>
          <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-800">
            {person.profile_path ? (
              <Image
                alt={person.name}
                className="h-auto w-full object-cover"
                height={168}
                src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                width={112}
              />
            ) : (
              <div
                className="flex items-center justify-center text-2xl text-ink-500"
                style={{ aspectRatio: "2 / 3" }}
              >
                👤
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs font-medium leading-snug text-mist-200">{person.name}</p>
          {person.character && (
            <p className="text-[11px] leading-snug text-mist-400">{person.character}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
