"use client";

import { useSyncExternalStore } from "react";

import {
  EMPTY_TOASTS,
  dismissToast,
  getToasts,
  subscribeToasts,
  type ToastTone,
} from "@/lib/toast";

const TONES: Record<ToastTone, { className: string; icon: string }> = {
  seen: { className: "border-emerald-400/50 text-emerald-400", icon: "✓" },
  watchlist: { className: "border-azure-400/50 text-azure-400", icon: "＋" },
  dismissed: { className: "border-ink-500 text-mist-300", icon: "✕" },
  neutral: { className: "border-gold-500/50 text-gold-400", icon: "●" },
  error: { className: "border-rose-400/60 text-rose-400", icon: "!" },
};

/** Affiche le message courant au-dessus de la barre d'onglets. */
export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, () => EMPTY_TOASTS);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + 12px)" }}
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.tone];
        return (
          <button
            className={`animate-toast pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border bg-ink-850/95 px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${tone.className}`}
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            type="button"
          >
            <span aria-hidden className="text-base leading-none">
              {tone.icon}
            </span>
            <span className="text-mist-200">{toast.message}</span>
          </button>
        );
      })}
    </div>
  );
}
