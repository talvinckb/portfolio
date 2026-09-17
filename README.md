# Portfolio — Talvin Ackbaraly

Portfolio personnel bilingue (FR/EN) présentant mes projets en vision par
ordinateur, intelligence artificielle et calcul GPU.

**En ligne :** <https://www.talvin-ackbaraly.com>

---

## Stack

| | |
|---|---|
| Générateur | [Eleventy](https://www.11ty.dev/) 3 (Nunjucks + Markdown) |
| Styles | CSS natif, design tokens, thèmes clair/sombre |
| Scripts | JavaScript ES modules, sans framework ni bundler |
| Maths | [KaTeX](https://katex.org/) (pages projet uniquement) |
| Hébergement | Vercel — build automatique sur push `main` |

Aucune dépendance runtime côté client : les pages sont générées à la
compilation et servies en HTML statique.

## Principes

- **Une page statique par langue.** `/` (FR) et `/en/` (EN) sont deux
  documents complets générés par Eleventy. Le sélecteur de langue est un
  simple lien : aucun rendu côté client, aucune duplication du balisage en
  JavaScript.
- **Le contenu vit dans les données.** `_data/fr.json` et `_data/en.json`
  portent l'intégralité des textes de la page d'accueil ; les études de cas
  sont en Markdown. Les deux locales doivent rester structurellement
  identiques (mêmes clés, mêmes identifiants de projet).
- **Le balisage n'existe qu'une fois.** Navigation, pied de page, icônes et
  actions de contact sont des partials Nunjucks partagés entre la page
  d'accueil et les pages projet.
- **Rien ne bouge sans raison.** Pas de dégradé, pas de flou, pas
  d'animation d'apparition : la hiérarchie est portée par la grille, la
  typographie et les aplats.

## Direction artistique

Typographie internationale : gris froids, angles vifs, grille visible, et
le **bleu comme élément de structure** — des aplats pleine largeur, pas un
liseré décoratif.

| Rôle | Police | Usage |
|---|---|---|
| Titres | Archivo, `font-stretch: 112%`, 800 | accroche, titres de section, titres d'étude de cas |
| Texte | Archivo, 400–700 | paragraphes, titres de carte, navigation, boutons |
| Chiffres | Archivo, `font-stretch: 70%`, 700 | uniquement les chiffres clés du hero |
| Données | IBM Plex Mono | périodes, stacks, index de section, code |

Une seule famille porte toute la page : son axe de largeur (`wdth`,
62→125) fait le travail qu'une deuxième police ferait ailleurs. La mono
est réservée à ce qui est une **donnée** — jamais à un libellé décoratif.

Règles non négociables :

- **`border-radius: 0` partout**, imposé dans le reset. Un seul coin
  arrondi et tout le système s'effondre.
- **Les filets portent la hiérarchie** : 2 px encre pour ouvrir une
  section, 1 px `--rule` pour séparer des lignes de même niveau.
- **Le bleu ne s'utilise pas en petites touches.** Bandeau de
  disponibilité, en-têtes de la matrice de compétences, index des cartes,
  section contact : ce sont des surfaces pleines. Le texte courant reste
  en `--ink`.
- **L'espacement des capitales reste serré** (`0.045em`). Des capitales
  très espacées datent une mise en page instantanément.

Les couleurs sont des tokens redéfinis sous `:root[data-theme="dark"]` —
`--bg`, `--bg-2`, `--surface`, `--ink`, `--ink-2`, `--ink-3`, `--rule`,
`--blue`, `--on-blue`, `--blue-soft`. **Aucune couleur en dur dans une
règle**, sinon le thème sombre décroche.

`.section--block` (la section contact) redéfinit `--ink`, `--rule` et
`--blue` sur elle-même : tout ce qu'elle contient bascule en inversé sans
qu'aucun composant n'ait à connaître le contexte.

## Arborescence

```
.
├── _data/
│   ├── site.json          # Coordonnées, URLs, image OG, couleurs de thème
│   ├── fr.json            # Contenu FR (méta, a11y, hero, projets, parcours…)
│   ├── en.json            # Contenu EN — mêmes clés que fr.json
│   ├── buildYear.js       # Année du pied de page, résolue au build
│   └── buildDate.js       # <lastmod> du sitemap, résolu au build
├── _includes/
│   ├── base.njk           # Gabarit de la page d'accueil
│   ├── project.njk        # Gabarit des études de cas
│   └── partials/
│       ├── head.njk       # <head> commun : SEO, Open Graph, JSON-LD
│       ├── nav.njk        # Navigation + menu mobile
│       ├── footer.njk     # Pied de page + retour en haut + toasts
│       ├── icons.njk      # Macros SVG — source unique des icônes
│       └── contact-actions.njk  # heroActions() et contactBlock()
├── projects/
│   ├── fr/*.md            # Études de cas FR  → /projects/<id>/
│   └── en/*.md            # Études de cas EN  → /en/projects/<id>/
├── css/style.css          # Design system complet
├── js/
│   ├── ui.js              # Comportements partagés (thème, menu, toasts…)
│   ├── main.js            # Page d'accueil
│   └── project.js         # Pages projet (lightbox, tableaux, KaTeX)
├── scripts/fetch-cv.js    # Récupère les CV PDF depuis les releases GitHub
├── sitemap.njk            # Sitemap généré à partir de la collection projets
└── .eleventy.js
```

## Structure de la page d'accueil

| Section | Ancre | Source |
|---|---|---|
| Hero — accroche, intro, disponibilité, chiffres clés | — | `hero` |
| 01 Travaux — projets phares + autres réalisations | `#work` | `projects` |
| 02 Parcours — expériences, formation, langues | `#background` | `background` |
| 03 Compétences | `#skills` | `skills` |
| 04 Contact | `#contact` | `contact` |

Les ancres sont volontairement en anglais des deux côtés : les deux locales
partagent le même gabarit, donc les mêmes `id`.

### Chiffres clés

`hero.facts` est la première chose qu'un recruteur lit. Quatre entrées
maximum, chacune adossée à un projet ou une expérience réelle — jamais un
chiffre qu'une étude de cas ne peut pas justifier.

```jsonc
{ "value": "×24", "label": "d'accélération CPU → GPU sur un pipeline…" }
```

## Développement

```bash
npm install
npm run dev     # serveur local avec rechargement — http://localhost:8080
npm run build   # génère _site/
```

Le build télécharge automatiquement les CV PDF depuis les releases du dépôt
[`talvinckb/cv`](https://github.com/talvinckb/cv) (`scripts/fetch-cv.js`).
Ces fichiers sont ignorés par Git et régénérés à chaque build.

## Ajouter un projet

1. Ajouter l'entrée dans `_data/fr.json` **et** `_data/en.json`, sous
   `projects.items`, avec le même `id` des deux côtés :

   ```jsonc
   {
     "id": "mon-projet",
     "name": "NOM",
     "title": "Titre complet",
     "tagline": "Une phrase de résumé.",
     "thumbnail": "/assets/projects/mon-projet/thumbnail-16x9.webp",
     "thumbnailLight": "/assets/projects/mon-projet/thumbnail-16x9-light.webp",
     "stack": ["C++", "CUDA"],
     "period": "4 semaines",
     "featured": true,        // true = vignette + page dédiée
     "kind": "academic",      // "academic" | "personal"
     "github": null           // URL du dépôt, ou null
   }
   ```

   `stack` est rendu en mono, séparé par ` / ` via CSS — pas de
   pastilles : garder quatre entrées au plus, sinon la ligne double.

2. Pour un projet `featured`, créer l'étude de cas dans `projects/fr/` et
   `projects/en/`. Le front-matter pilote l'en-tête et les métadonnées de
   partage :

   ```yaml
   ---
   id: mon-projet
   name: "NOM"
   title: "Titre complet"
   tagline: "Une phrase de résumé."
   thumbnail: "/assets/projects/mon-projet/thumbnail-16x9.webp"
   thumbnailLight: "/assets/projects/mon-projet/thumbnail-16x9-light.webp"
   stack: ["C++", "CUDA"]
   period: "4 semaines"
   team: 4
   github: null
   demo: null
   report: null
   ---
   ```

3. Le sitemap se met à jour tout seul.

## Conventions médias

- **Images** en WebP. Les vignettes de carte font 16/9 ; fournir une
  variante `-light` quand l'image est illisible sur fond clair.
- **Vidéos** en MP4, toujours avec `preload="none"` et une image `poster`,
  pour qu'une démo de plusieurs mégaoctets ne soit jamais téléchargée sans
  action du visiteur :

  ```bash
  ffmpeg -i demo.mp4 -vf "select=eq(n\,0),scale=1280:-2" \
         -frames:v 1 -c:v libwebp -quality 82 demo-poster.webp
  ```

  ```html
  <video src="/assets/projects/x/demo.mp4" poster="/assets/projects/x/demo-poster.webp"
         preload="none" controls loop muted playsinline class="project-video-demo"></video>
  ```

- **Image Open Graph** : `assets/og-image.png` (FR) et `og-image-en.png`
  (EN), 1200×630.

## Accessibilité & SEO

Points à ne pas régresser :

- tout libellé visible **ou** d'assistance passe par `a11y.*` dans les
  fichiers de locale — jamais de chaîne en dur dans un gabarit partagé ;
- le JSON-LD est sérialisé avec le filtre `| dump`, ce qui garantit un JSON
  valide quel que soit le formatage du gabarit autour ;
- chaque page déclare `og:image`, `canonical` et ses trois `hreflang`
  (`fr`, `en`, `x-default`) ;
- une carte projet n'a qu'un seul lien étendu (`::after` sur le titre) : le
  lien GitHub qui le recouvre doit rester en `z-index: 2` ;
- les aplats bleus sont vérifiés en contraste dans les deux thèmes
  (`--blue` / `--on-blue`, `--block-bg` / `--block-ink`) ;
- les animations sont neutralisées sous `prefers-reduced-motion`.

## Licence

Code sous licence MIT. Le contenu rédactionnel, les visuels de projet et les
CV restent la propriété de Talvin Ackbaraly.
