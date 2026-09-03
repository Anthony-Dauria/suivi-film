# 🎬 Suivi Film

Application web personnelle pour **suivre les films que vous avez vus**, garder une liste de ce
que vous voulez voir, consulter une **fiche complète pour chaque film** (comme sur Google :
synopsis, casting, durée, notes, budget, bande-annonce…), savoir **sur quelles plateformes le
regarder**, et recevoir des **recommandations construites à partir de vos propres goûts**.

Pensée pour le téléphone — barre d'onglets, gestes au pouce, installation sur l'écran d'accueil —
et **entièrement statique** : elle s'héberge gratuitement sur GitHub Pages, sans serveur ni base
de données. Vos films, vos notes et votre clé API restent dans votre navigateur.

---

## Fonctionnalités

### Une application, pas un site
- **Barre d'onglets** en bas de l'écran : accueil, recherche, bibliothèque, recommandations et
  statistiques toujours à portée du pouce.
- **Installable** : « Ajouter à l'écran d'accueil » depuis Safari ou Chrome, et l'application
  s'ouvre en plein écran, sans barre d'adresse, avec sa propre icône.
- Marges respectant l'encoche et la barre d'accueil, cibles tactiles confortables, et un
  **message de confirmation** à chaque ajout : on voit ce qui vient d'être enregistré même quand
  le doigt masque la vignette.

### Bibliothèque personnelle
- Trois statuts par film : **vu**, **à voir**, **pas intéressé** (ce dernier exclut le film des
  recommandations). Le statut apparaît en toutes lettres sous chaque affiche, le bouton
  correspondant se remplit de sa couleur, et la vignette prend un liseré assorti.
- **Note sur 5 étoiles** par demi-étoile, **coup de cœur**, **date de visionnage**, **nombre de
  revisionnages** et **notes personnelles** en texte libre.
- Filtres par statut, genre, titre ou réalisateur ; tris par note, date de sortie, date de
  visionnage ou ordre alphabétique.
- Export / import de la bibliothèque au format JSON.

### Fiche film détaillée
Chaque film dispose d'une page complète alimentée par TMDB :
affiche et image d'arrière-plan, titre original, date de sortie, durée, classification,
genres, synopsis en français, note moyenne du public et nombre de votes, réalisation et
scénario, **distribution avec photos**, bande-annonce intégrée, budget et recettes, pays,
langues, sociétés de production, saga d'appartenance, mots-clés, liens IMDb et site officiel,
et une sélection de films dans le même esprit.

### Où regarder
Pour chaque film, les **plateformes disponibles dans votre pays** (données JustWatch via TMDB),
réparties en : inclus avec un abonnement, gratuit, gratuit avec publicité, location, achat —
avec lien direct vers l'offre. Vous pouvez déclarer vos abonnements dans les réglages et
**filtrer les recommandations sur ce que vous pouvez réellement regarder ce soir**.

### Recommandations expliquées
Le moteur croise quatre signaux issus de votre bibliothèque :

| Signal | Ce qu'il apporte |
| --- | --- |
| Films que vous avez le mieux notés | suggestions TMDB associées à chacun d'eux |
| Genres de prédilection | découvertes ciblées, et pénalité sur les genres que vous notez mal |
| Thèmes récurrents (mots-clés) | films partageant les mêmes sujets |
| Réalisateurs et acteurs favoris | leur filmographie que vous n'avez pas encore vue |

Chaque candidat est ensuite repondéré par sa qualité objective (note moyenne, fiabilité du
nombre de votes, notoriété) et par votre affinité de genre calculée sur tout l'historique. Les
films déjà vus ou écartés sont exclus. **Chaque suggestion affiche la raison pour laquelle elle
vous est proposée** (« Parce que vous avez aimé *Inception* », « Par Bong Joon-ho », …).

### Statistiques
Temps de visionnage cumulé, répartition de vos notes, genres les plus vus, décennies de sortie,
films vus par année, réalisateurs et acteurs récurrents, et le classement de vos meilleures
notes.

---

## Publier le site sur GitHub Pages

Le dépôt contient déjà le workflow `.github/workflows/deploy.yml`. Il compile le site et le
publie à chaque envoi sur `main`.

1. Dans le dépôt GitHub : **Settings → Pages → Build and deployment**, choisissez la source
   **GitHub Actions**.
2. Poussez sur `main` (ou lancez le workflow à la main depuis l'onglet **Actions**).
3. Le site est en ligne sur `https://<votre-compte>.github.io/<nom-du-depot>/`.

Le chemin de base est calculé automatiquement par le workflow : `/<nom-du-depot>` en général,
racine du domaine si le dépôt s'appelle `<votre-compte>.github.io`. Pour un domaine
personnalisé, ajoutez un fichier `public/CNAME` contenant votre domaine et laissez
`NEXT_PUBLIC_BASE_PATH` vide dans le workflow.

### Et la clé API TMDB ?

L'application a besoin d'une clé TMDB (gratuite) pour interroger le catalogue. Deux approches :

**1. Chaque visiteur saisit la sienne (par défaut, recommandé).**
Au premier lancement, un bandeau invite à coller une clé dans **Réglages**. Elle est enregistrée
dans le navigateur, n'est envoyée qu'à l'API TMDB, et n'apparaît ni dans le dépôt ni dans les
sauvegardes exportées. C'est le mode adapté à un site public.

**2. Une clé intégrée au site.**
Ajoutez un secret `TMDB_API_KEY` dans **Settings → Secrets and variables → Actions** : le
workflow l'injecte au build et le site fonctionne sans configuration pour le visiteur.
⚠️ **Cette clé devient publique** : toute variable `NEXT_PUBLIC_*` est incluse dans le
JavaScript envoyé au navigateur, donc lisible par n'importe qui. Ne l'utilisez que si le site
reste strictement personnel. Une clé saisie dans les réglages a de toute façon la priorité.

---

## Utiliser l'application en local

### Prérequis
Node.js **20.9 ou supérieur**.

```bash
npm install
npm run dev
```

L'application est disponible sur <http://localhost:3000>. Ouvrez **Réglages**, collez votre clé
TMDB, c'est prêt — aucun fichier `.env` n'est nécessaire.

Pour obtenir une clé : créez un compte sur [themoviedb.org](https://www.themoviedb.org/signup),
puis demandez une clé sur [la page API](https://www.themoviedb.org/settings/api). La **clé v3**
comme le **jeton de lecture v4** fonctionnent, l'application détecte le format.

Pour reproduire la version publiée :

```bash
npm run build     # génère le site statique dans ./out
npx serve out     # ou n'importe quel serveur de fichiers
```

---

## Premiers pas

1. Allez dans **Rechercher** et ajoutez 5 à 10 films que vous avez déjà vus.
2. Notez-les : la note est le signal le plus important pour les recommandations (5/5 = adoré,
   3/5 = neutre, 1/5 = détesté).
3. Renseignez vos abonnements dans **Réglages → Mes plateformes**.
4. Ouvrez **Pour moi** : les suggestions sont désormais calibrées sur vos goûts.

> Le moteur devient réellement personnalisé à partir de trois films notés. En dessous, il
> complète avec des incontournables et les tendances de la semaine.

Pour voir l'interface remplie sans rien saisir, importez le fichier
`public/exemple-bibliotheque.json` depuis **Réglages → Importer une sauvegarde**.

---

## Où sont mes données ?

Tout est stocké dans le **stockage local du navigateur**, sur votre appareil :

| Clé | Contenu |
| --- | --- |
| `suivi-film:bibliotheque` | films suivis, notes, réglages |
| `suivi-film:cle-api` | votre clé TMDB |
| `suivi-film:cache:…` | réponses TMDB mises en cache |

Conséquences à connaître :

- Rien n'est envoyé ailleurs qu'à TMDB : il n'y a pas de compte, pas de serveur, pas de suivi.
- Les données sont **propres à ce navigateur et à cet appareil**. Vider les données du site les
  efface définitivement.
- **Exportez régulièrement** votre bibliothèque (**Réglages → Exporter**) : le fichier JSON
  obtenu se réimporte sur un autre appareil ou après un nettoyage du navigateur.

---

## Structure du projet

```
.github/workflows/deploy.yml   Compilation et publication sur GitHub Pages
public/                        Fichiers servis tels quels (.nojekyll, exemple de bibliothèque)
src/
├── app/
│   ├── page.tsx               Accueil : tableau de bord et sélection du jour
│   ├── recherche/             Recherche instantanée dans le catalogue TMDB
│   ├── bibliotheque/          Bibliothèque personnelle, filtres et tris
│   ├── recommandations/       Recommandations expliquées + filtres
│   ├── statistiques/          Tableaux de bord de visionnage
│   ├── reglages/              Clé API, pays, plateformes, sauvegarde
│   └── film/                  Fiche détaillée (adresse : /film/?id=27205)
├── components/                Composants d'interface
└── lib/
    ├── tmdb.ts                Client TMDB (auth v3/v4, normalisation des réponses)
    ├── cache.ts               Cache des réponses, mutualisation et plafond de requêtes
    ├── store.ts               Bibliothèque persistée dans le navigateur
    ├── hooks.ts               Abonnement React au stockage local
    ├── library.ts             Actions de suivi (ajout, statut, suppression)
    ├── profile.ts             Construction du profil de goût
    ├── reco.ts                Moteur de recommandation
    ├── stats.ts               Calcul des statistiques
    └── types.ts               Types partagés
```

Le site n'ayant pas de serveur, les appels partent du navigateur vers l'API TMDB (qui autorise
les requêtes cross-origin). `cache.ts` conserve les réponses (10 minutes pour une recherche, 12 h
pour une fiche, une semaine pour la liste des plateformes), mutualise les requêtes identiques et
limite le nombre d'appels simultanés.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Génère le site statique dans `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |

## Pile technique

Next.js 15 en export statique · React 19 · TypeScript · Tailwind CSS 4 · API TMDB.
Aucune base de données, aucun serveur, aucun compte à créer en dehors de TMDB.

---

## Crédits

Ce produit utilise l'API TMDB sans être approuvé ou certifié par TMDB.
Les disponibilités de streaming sont fournies par JustWatch via TMDB.
