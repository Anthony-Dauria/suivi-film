"use client";

import type { LibraryEntry, Settings, WatchStatus } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Erreur ${response.status}`);
  }
  return payload as T;
}

export interface EntryPatch {
  status?: WatchStatus;
  rating?: number | null;
  favorite?: boolean;
  watchedAt?: string | null;
  notes?: string;
  rewatchCount?: number;
}

/** Ajoute un film à la bibliothèque (la fiche est completee côté serveur). */
export function saveMovie(movieId: number, patch: EntryPatch = {}) {
  return request<{ entry: LibraryEntry }>("/api/library", {
    method: "POST",
    body: JSON.stringify({ movieId, ...patch }),
  }).then((data) => data.entry);
}

/** Met à jour une entrée existante. */
export function patchMovie(movieId: number, patch: EntryPatch) {
  return request<{ entry: LibraryEntry }>(`/api/library/${movieId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then((data) => data.entry);
}

export function removeMovie(movieId: number) {
  return request<{ ok: boolean }>(`/api/library/${movieId}`, { method: "DELETE" });
}

export function fetchLibrary(status?: WatchStatus) {
  const query = status ? `?status=${status}` : "";
  return request<{ entries: LibraryEntry[] }>(`/api/library${query}`);
}

export function saveSettings(patch: Partial<Settings>) {
  return request<{ settings: Settings }>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(patch),
  }).then((data) => data.settings);
}

export const STATUS_LABELS: Record<WatchStatus, string> = {
  seen: "Vu",
  watchlist: "À voir",
  dismissed: "Pas intéressé",
};
