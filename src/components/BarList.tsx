export interface BarItem {
  label: string;
  value: number;
  hint?: string;
}

/** Petit graphique en barres horizontales, sans dependance externe. */
export function BarList({ items, unit = "film" }: { items: BarItem[]; unit?: string }) {
  const maximum = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0) {
    return <p className="text-sm text-mist-400">Pas encore assez de données.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-mist-200">{item.label}</span>
            <span className="shrink-0 tabular-nums text-mist-400">
              {item.value.toLocaleString("fr-FR")} {unit}
              {item.value > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gold-500"
              style={{ width: `${(item.value / maximum) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
