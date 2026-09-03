/**
 * File de messages éphémères affichés en bas de l'écran.
 *
 * Sur mobile, l'action est souvent déclenchée loin de l'endroit où son effet
 * s'affiche : ce retour immédiat confirme ce qui vient d'être enregistré.
 */

export type ToastTone = "seen" | "watchlist" | "dismissed" | "neutral" | "error";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const DURATION = 2600;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): Toast[] {
  return toasts;
}

/** Instantané stable pour le pré-rendu (aucun message côté serveur). */
export const EMPTY_TOASTS: Toast[] = [];

export function dismissToast(id: number): void {
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function showToast(message: string, tone: ToastTone = "neutral"): void {
  const id = nextId++;
  // Un seul message à la fois : le dernier remplace le précédent.
  toasts = [{ id, message, tone }];
  emit();
  setTimeout(() => dismissToast(id), DURATION);
}
