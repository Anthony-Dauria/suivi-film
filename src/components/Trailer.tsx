import type { TmdbVideo } from "@/lib/types";

/** Bande-annonce YouTube (chargement differe par le navigateur). */
export function Trailer({ video }: { video: TmdbVideo }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-700 bg-black">
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube-nocookie.com/embed/${video.key}`}
        title={video.name}
      />
    </div>
  );
}
