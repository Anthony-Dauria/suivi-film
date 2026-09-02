import type { NextConfig } from "next";

/**
 * Export statique : l'application est compilee en fichiers HTML/JS/CSS servis
 * tels quels par GitHub Pages. Il n'y a donc plus de serveur Node : toute la
 * logique (appels TMDB, bibliotheque, recommandations) s'execute dans le
 * navigateur.
 *
 * `NEXT_PUBLIC_BASE_PATH` vaut par exemple "/suivi-film" quand le site est
 * publie sur https://<compte>.github.io/suivi-film. Le workflow GitHub Actions
 * le calcule automatiquement ; laissez-le vide pour un domaine personnalise ou
 * un depot <compte>.github.io.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    // L'optimiseur d'images de Next.js requiert un serveur : on charge les
    // affiches TMDB directement depuis leur CDN.
    unoptimized: true,
  },
};

export default config;
