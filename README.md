# 🎬 Suivi Film

Application web personnelle pour **suivre les films que vous avez vus**, garder une liste de ce
que vous voulez voir, consulter une **fiche complète pour chaque film** (comme sur Google :
synopsis, casting, durée, notes, budget, bande-annonce…), savoir **sur quelles plateformes le
regarder**, et recevoir des **recommandations construites à partir de vos propres goûts**.

Tout tourne en local : vos notes et votre historique restent sur votre machine, dans un simple
fichier JSON.

---

## Fonctionnalités

### Bibliothèque personnelle
- Trois statuts par film : **vu**, **à voir**, **pas intéressé** (ce dernier exclut le film des
  recommandations).
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

## Installation

### Prérequis
- Node.js **20.9 ou supérieur**
- Une clé API TMDB (gratuite)

### 1. Installer les dépendances

```bash
npm install
```

### 2. Obtenir une clé API TMDB

1. Créez un compte gratuit sur [themoviedb.org](https://www.themoviedb.org/signup).
2. Rendez-vous sur [la page API de votre compte](https://www.themoviedb.org/settings/api) et
   demandez une clé (usage personnel).
3. Copiez soit la **clé API (v3)**, soit le **jeton d'accès en lecture (v4)** : l'application
   détecte automatiquement le format.

### 3. Configurer l'environnement

```bash
cp .env.example .env.local
```

Puis renseignez votre clé dans `.env.local` :

```dotenv
TMDB_API_KEY=votre_clé_ici
TMDB_REGION=FR        # pays des plateformes et des dates de sortie
TMDB_LANGUAGE=fr-FR   # langue des fiches
```

### 4. Lancer l'application

```bash
npm run dev
```

L'application est disponible sur <http://localhost:3000>.

Pour un usage quotidien, préférez la version optimisée :

```bash
npm run build
npm run start
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

---

## Stockage des données

La bibliothèque est enregistrée dans `data/bibliotheque.json` (créé au premier ajout, ignoré par
Git). Les écritures sont **atomiques** — écriture d'un fichier temporaire puis renommage — et
sérialisées, pour ne jamais corrompre le fichier.

- Pour changer d'emplacement : variable d'environnement `DATA_FILE`.
- Pour sauvegarder : **Réglages → Exporter ma bibliothèque** (ou copiez simplement le fichier).
- `data/exemple-bibliotheque.json` contient un jeu de données d'exemple ; copiez-le en
  `data/bibliotheque.json` pour voir l'application remplie.

---

## Structure du projet

```
src/
├── app/
│   ├── page.tsx                 Accueil : tableau de bord et sélection du jour
│   ├── recherche/               Recherche instantanée dans le catalogue TMDB
│   ├── bibliotheque/            Bibliothèque personnelle, filtres et tris
│   ├── recommandations/         Recommandations expliquées + filtres
│   ├── statistiques/            Tableaux de bord de visionnage
│   ├── reglages/                Clé API, plateformes, sauvegarde
│   ├── film/[id]/               Fiche détaillée d'un film
│   └── api/                     Routes serveur (recherche, fiches, bibliothèque, réglages…)
├── components/                  Composants d'interface réutilisables
└── lib/
    ├── tmdb.ts                  Client TMDB (auth v3/v4, cache, normalisation)
    ├── store.ts                 Persistance JSON atomique de la bibliothèque
    ├── profile.ts               Construction du profil de goût
    ├── reco.ts                  Moteur de recommandation
    ├── stats.ts                 Calcul des statistiques
    └── types.ts                 Types partagés
```

La clé API n'est **jamais** exposée au navigateur : tous les appels TMDB passent par le serveur
Next.js, qui met les réponses en cache (de 10 minutes pour une recherche à une semaine pour la
liste des genres).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |

## Pile technique

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · API TMDB.
Aucune base de données à installer, aucun compte à créer en dehors de TMDB.

---

## Crédits

Ce produit utilise l'API TMDB sans être approuvé ou certifié par TMDB.
Les disponibilités de streaming sont fournies par JustWatch via TMDB.
