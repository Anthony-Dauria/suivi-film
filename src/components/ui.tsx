import Link from "next/link";

/** Titre de section avec lien optionnel « tout voir ». */
export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "Tout voir",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-mist-400">{subtitle}</p>}
      </div>
      {href && (
        <Link className="text-sm text-gold-400 underline-offset-2 hover:underline" href={href}>
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span aria-hidden className="text-4xl">
        🍿
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-mist-400">{description}</p>
      {action && (
        <Link
          className="mt-2 rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-400"
          href={action.href}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-400"
      role="alert"
    >
      {message}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-mist-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-mist-200">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-mist-400">{hint}</p>}
    </div>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-ink-600 bg-ink-900/60 px-2.5 py-1 text-xs text-mist-300">
      {children}
    </span>
  );
}
