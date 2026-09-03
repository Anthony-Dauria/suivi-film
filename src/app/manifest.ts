import type { MetadataRoute } from "next";

// Fichier généré une fois au build : l'export statique n'a pas de serveur.
export const dynamic = "force-static";

/**
 * Manifeste d'application web : permet d'installer le site sur l'écran
 * d'accueil et de l'ouvrir en plein écran, sans barre d'adresse.
 *
 * Les chemins sont relatifs au manifeste, ce qui les rend valides aussi bien à
 * la racine d'un domaine que dans le sous-dossier d'un site GitHub Pages.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suivi Film",
    short_name: "SuiviFilm",
    description:
      "Suivez les films que vous avez vus, consultez leur fiche complète et recevez des recommandations à votre goût.",
    lang: "fr",
    dir: "ltr",
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07090e",
    theme_color: "#07090e",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "./icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "./icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "./icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
