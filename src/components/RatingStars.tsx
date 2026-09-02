"use client";

import { useState } from "react";

interface RatingStarsProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "text-base", md: "text-2xl", lg: "text-3xl" };

/** Notation sur 5 étoiles par demi-étoile (clic à gauche = demi, à droite = pleine). */
export function RatingStars({ value, onChange, readOnly = false, size = "md" }: RatingStarsProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value ?? 0;

  const fillFor = (index: number) => {
    const filled = Math.max(0, Math.min(1, shown - index));
    return `${filled * 100}%`;
  };

  const Star = ({ index }: { index: number }) => (
    <span className={`relative inline-block ${SIZES[size]} leading-none`}>
      <span className="text-ink-600">★</span>
      <span
        className="absolute inset-0 overflow-hidden text-gold-500"
        style={{ width: fillFor(index) }}
      >
        ★
      </span>
      {!readOnly && (
        <>
          <button
            aria-label={`Noter ${index + 0.5} sur 5`}
            className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
            onClick={() => onChange?.(index + 0.5)}
            onMouseEnter={() => setPreview(index + 0.5)}
            type="button"
          />
          <button
            aria-label={`Noter ${index + 1} sur 5`}
            className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
            onClick={() => onChange?.(index + 1)}
            onMouseEnter={() => setPreview(index + 1)}
            type="button"
          />
        </>
      )}
    </span>
  );

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex gap-0.5"
        onMouseLeave={() => setPreview(null)}
        role={readOnly ? "img" : "group"}
        aria-label={
          readOnly
            ? `Note personnelle : ${value ?? 0} sur 5`
            : "Attribuer une note personnelle sur 5"
        }
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <Star index={index} key={index} />
        ))}
      </div>

      <span className="text-sm tabular-nums text-mist-400">
        {shown > 0 ? `${shown.toFixed(1).replace(".", ",")}/5` : "Non note"}
      </span>

      {!readOnly && value !== null && (
        <button
          className="text-xs text-mist-400 underline-offset-2 hover:text-rose-400 hover:underline"
          onClick={() => onChange?.(null)}
          type="button"
        >
          effacer
        </button>
      )}
    </div>
  );
}
