/** Formatage partagé entre serveur et client (aucune dépendance à TMDB). */

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "Durée inconnue";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "Date inconnue";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function releaseYear(date: string | null | undefined): string {
  if (!date) return "—";
  const year = date.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : "—";
}

export function formatMoney(amount: number | null | undefined): string | null {
  if (!amount || amount <= 0) return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: amount >= 1_000_000 ? "compact" : "standard",
  }).format(amount);
}

/** Note TMDB (sur 10) affichée avec une décimale. */
export function formatVote(vote: number | null | undefined): string {
  if (!vote || vote <= 0) return "—";
  return vote.toFixed(1).replace(".", ",");
}

export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return "—";
  return `${rating.toFixed(1).replace(".", ",")}/5`;
}

export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString("fr-FR")} ${count > 1 ? plural : singular}`;
}

const STATUS_LABELS: Record<string, string> = {
  Released: "Sorti",
  "Post Production": "Post-production",
  "In Production": "En production",
  Planned: "Annoncé",
  Rumored: "Rumeur",
  Canceled: "Annulé",
};

export function translateStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  return STATUS_LABELS[status] ?? status;
}

/** "2 h 14 de visionnage" à partir d'un total de minutes. */
export function formatTotalRuntime(minutes: number): string {
  if (minutes <= 0) return "0 h";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days} j ${hours} h`;
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}
