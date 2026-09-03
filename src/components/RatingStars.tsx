"use client";

import { useState } from "react";

interface RatingStarsProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

// Plus grandes sur téléphone : chaque demi-étoile doit rester visable au doigt.
const SIZES = {
  sm: "text-base",
  md: "text-[32px] sm:text-2xl",
  lg: "text-4xl",
};

/** Notation sur 5 étoiles par demi-étoile (moitié gauche = demi, droite = pleine). */
export function RatingStars({ value, onChange, readOnly = false, size = "md" }: RatingStarsProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value ?? 0;

  /**
   * L'aperçu au survol n'a de sens qu'à la souris : sur un écran tactile, il
   * resterait affiché après le geste et donnerait une note fantôme.
   */
  const previewOnHover = (event: React.PointerEvent, next: number) => {
    if (event.pointerType === "mouse") setPreview(next);
  };

  const fillFor = (index: number) => `${Math.max(0, Math.min(1, shown - index)) * 100}%`;

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
            onClick={() => {
              setPreview(null);
              onChange?.(index + 0.5);
            }}
            onPointerEnter={(event) => previewOnHover(event, index + 0.5)}
            type="button"
          />
          <button
            aria-label={`Noter ${index + 1} sur 5`}
            className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
            onClick={() => {
              setPreview(null);
              onChange?.(index + 1);
            }}
            onPointerEnter={(event) => previewOnHover(event, index + 1)}
            type="button"
          />
        </>
      )}
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div
        aria-label={
          readOnly
            ? `Note personnelle : ${value ?? 0} sur 5`
            : "Attribuer une note personnelle sur 5"
        }
        className="flex gap-1"
        onPointerLeave={() => setPreview(null)}
        role={readOnly ? "img" : "group"}
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <Star index={index} key={index} />
        ))}
      </div>

      <span className="text-sm tabular-nums text-mist-400">
        {shown > 0 ? `${shown.toFixed(1).replace(".", ",")}/5` : "Non noté"}
      </span>

      {!readOnly && value !== null && (
        <button
          className="text-xs text-mist-400 underline-offset-2 active:text-rose-400"
          onClick={() => onChange?.(null)}
          type="button"
        >
          effacer
        </button>
      )}
    </div>
  );
}
