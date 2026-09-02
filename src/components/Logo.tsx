/**
 * Marque de l'application : un clap de cinéma portant une étoile de notation.
 *
 * Le même dessin sert d'icône d'onglet et d'icône d'écran d'accueil
 * (`src/app/icon.svg` et `src/app/apple-icon.png`) : toute retouche doit être
 * reportée sur ces fichiers.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      focusable="false"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="logo-clap">
          <rect height="7.2" rx="1.6" width="25" x="3.5" y="6.4" />
        </clipPath>
      </defs>
      <rect fill="#0b0e15" height="32" rx="7" width="32" />
      <rect fill="#f0b429" height="7.2" rx="1.6" width="25" x="3.5" y="6.4" />
      <path clipPath="url(#logo-clap)" d="M8.6 6.4L11.2 6.4L8.0 13.6L5.4 13.6ZM14.6 6.4L17.2 6.4L14.0 13.6L11.4 13.6ZM20.6 6.4L23.2 6.4L20.0 13.6L17.4 13.6ZM26.6 6.4L29.2 6.4L26.0 13.6L23.4 13.6Z" fill="#0b0e15" />
      <rect fill="#f0b429" height="11.7" rx="2.2" width="25" x="3.5" y="14.9" />
      <polygon fill="#0b0e15" points="16.00,15.35 17.32,18.93 21.14,19.08 18.14,21.45 19.17,25.12 16.00,23.00 12.83,25.12 13.86,21.45 10.86,19.08 14.68,18.93" />
    </svg>
  );
}
