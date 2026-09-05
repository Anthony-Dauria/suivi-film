"use client";

import type { MediaType } from "@/lib/types";

export type TypeChoice = MediaType | "all";

const CHOICES: { key: TypeChoice; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "movie", label: "Films" },
  { key: "tv", label: "Séries" },
];

/** Sélecteur films / séries, partagé par la recherche et les recommandations. */
export function TypeFilter({
  value,
  onChange,
  counts,
}: {
  value: TypeChoice;
  onChange: (value: TypeChoice) => void;
  counts?: Partial<Record<TypeChoice, number>>;
}) {
  return (
    <div
      aria-label="Type d'œuvre"
      className="inline-flex rounded-xl border border-ink-600 p-1"
      role="group"
    >
      {CHOICES.map((choice) => {
        const active = value === choice.key;
        return (
          <button
            aria-pressed={active}
            className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${
              active ? "bg-gold-500 text-ink-950" : "text-mist-300"
            }`}
            key={choice.key}
            onClick={() => onChange(choice.key)}
            type="button"
          >
            {choice.label}
            {counts?.[choice.key] !== undefined && (
              <span className="ml-1.5 tabular-nums opacity-70">{counts[choice.key]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
