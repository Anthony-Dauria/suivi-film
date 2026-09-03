/**
 * Jeu d'icônes de navigation, dessinées à la main pour éviter une dépendance
 * et rester lisibles à 24 px sur un écran de téléphone.
 */
type IconProps = { className?: string };

const base: React.SVGProps<SVGSVGElement> = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  focusable: "false",
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.6V20h13V9.6" />
      <path d="M9.8 20v-5.4h4.4V20" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function LibraryIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4-6.5 4v-16a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M10 3.2 11.6 7.6 16 9.2l-4.4 1.6L10 15.2 8.4 10.8 4 9.2l4.4-1.6Z" />
      <path d="M17.2 13.6 18.1 16l2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9Z" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 20v-6" />
      <path d="M13 20V8" />
      <path d="M18 20v-9" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h10M18 17h2" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="16" cy="17" r="2" />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M14.5 5 8 12l6.5 7" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} fill="currentColor" stroke="none">
      <path d="M8 5.5v13l11-6.5Z" />
    </svg>
  );
}
