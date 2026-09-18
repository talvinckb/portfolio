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
- **Rien ne bouge sans raison.** Pas d'animation d'apparition ni d'effet
  décoratif : le mouvement sert un état (survol, détection, section lue) et
  disparaît sous `prefers-reduced-motion`.

## Direction artistique

**« Labo de vision ».** Le site se lit comme l'écran d'un outil de vision
par ordinateur : une grille de mesure en fond, des relevés en mono autour
des images, et une seule couleur vive — le vert des boîtes de détection.

| Rôle | Police | Usage |
|---|---|---|
| Titres & texte | Geist, 400–700 | accroche, titres, paragraphes, boutons |
| Données | Geist Mono, 400–500 | périodes, stacks, index de section, relevés, libellés |

La mono est réservée à ce qui est une **donnée** ou une métadonnée — jamais
à un paragraphe.

### La boîte de détection

C'est l'élément signature (`.detect` + `.detect__label`), et il obéit à une
seule règle : **une boîte encadre une image dans laquelle quelque chose est
réellement détecté.**

- le visage sur le portrait de l'accueil (`hero.photoBox`) ;
- une carte projet, **au survol ou au focus uniquement**, une à la fois.

Jamais autour d'un texte, d'un titre ou d'un bloc décoratif. Les images de
résultats des études de cas portent déjà leurs propres détections : on n'en
ajoute pas par-dessus.

### Règles

- **Angles vifs partout.** Le seul arrondi est la pastille « disponible ».
- **Le vert est un signal, pas un décor** : boîtes de détection, action
  principale, repère de la section en cours, état sélectionné. Le texte
  courant reste en `--ink` / `--ink-2`.
- **Deux tokens pour le vert.** `--accent` est le fond des aplats (texte
  `--on-accent` dessus) ; `--accent-text` et `--detect` sont assombris en
  thème clair, où le vert pur disparaîtrait sur le blanc.
- **Les filets portent la hiérarchie** : `--rule-2` pour les cadres,
  `--rule` pour séparer des lignes de même niveau.
- **Un cadre ne se pose jamais sur un `.wrap`** : sa bordure engloberait la
  gouttière. Le cadre est un enfant du `.wrap`.

Les couleurs sont des tokens redéfinis sous `:root[data-theme="light"]` —
`--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-2`, `--ink-3`, `--rule`,
`--rule-2`, `--grid-line`, `--accent`, `--on-accent`, `--accent-text`,
`--detect`. **Aucune couleur en dur dans une règle**, sinon un thème
décroche. Le sombre est l'aspect par défaut ; sans JavaScript, le site suit
la préférence système.

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
│       ├── theme-init.njk # Choix du thème avant le premier rendu
│       └── contact-actions.njk  # heroActions() et contactBlock()
├── projects/
│   ├── fr/*.md            # Études de cas FR  → /projects/<id>/
│   └── en/*.md            # Études de cas EN  → /en/projects/<id>/
├── css/style.css          # Design system complet
├── js/
│   ├── ui.js              # Comportements partagés (thème, menu, toasts…)
│   ├── main.js            # Page d'accueil (compétences, vidéo du hero)
│   └── project.js         # Pages projet (sommaire, lightbox, tableaux, KaTeX)
├── scripts/fetch-cv.js    # Récupère les CV PDF depuis les releases GitHub
├── sitemap.njk            # Sitemap généré à partir de la collection projets
└── .eleventy.js
```

## Structure de la page d'accueil

| Section | Ancre | Source |
|---|---|---|
| Hero — disponibilité, accroche, intro, actions, portrait (ou démo IRGPU) | — | `hero` |
| 01 Projets sélectionnés + autres réalisations | `#work` | `projects` |
| 02 Parcours — deux frises : expériences, formation | `#background` | `background` |
| 03 Compétences — chaque compétence mène aux projets qui l'utilisent | `#skills` | `skills` |
| 04 Contact | `#contact` | `contact` |

Les ancres sont volontairement en anglais des deux côtés : les deux locales
partagent le même gabarit, donc les mêmes `id`.

### Le portrait

Tant que `hero.photo` vaut `null`, le hero affiche la démo vidéo d'IRGPU (`hero.media`, un extrait recadré en 4:5 et allégé de la démo complète)
(lue seulement quand elle est visible, jamais sous `reduced-motion`). Pour
passer au portrait :

1. déposer l'image, recadrée en **4:5**, en WebP (≈ 800×1000) :
   `assets/portrait.webp` ;
2. renseigner `"photo": "/assets/portrait.webp"` dans `fr.json` **et**
   `en.json` ;
3. ajuster `hero.photoBox` (`x`, `y`, `w`, `h`, en % du cadre) pour que la
   boîte tombe sur le visage.

### Compétences → projets

Chaque compétence de `skills.groups[].items` porte la liste `used` des `id`
où elle a servi : un projet (`projects.items[].id`) ou une expérience
(`background.experiences[].id`). Un projet avec étude de cas renvoie vers
elle, un projet public vers GitHub. Une compétence dont `used` est vide
s'affiche en pointillés, sans être cliquable — mieux vaut ça qu'un lien
inventé.

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
     "github": null,          // URL du dépôt, ou null
     "repoNote": null         // réserve sur ce que le dépôt public contient
   }
   ```

   `stack` est rendu en mono, séparé par ` · ` — pas de pastilles : garder
   quatre entrées au plus, sinon la ligne double.

   Penser aussi à ajouter l'`id` dans le `used` des compétences concernées.

   `repoNote` est facultatif : il s'affiche sous la stack, dans la liste
   des autres réalisations, quand le dépôt public ne représente qu'une
   partie du projet (TinyX, par exemple, dont seul le frontend est public).
   Mieux vaut le dire que laisser un recruteur cliquer et se tromper sur ce
   qu'il regarde.

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
   brief:                     # le bloc « En bref » en tête de page
     problem: "Le problème, en une phrase."
     approach: "Ce qui a été fait, en une phrase."
     result: "Le résultat mesuré, en une phrase."
     role: "Ce que j'ai fait moi-même dans l'équipe."  # facultatif
   ---
   ```

   Chaque titre `##` de l'étude de cas reçoit un `id` au build et devient
   une entrée du sommaire latéral.

3. Le sitemap se met à jour tout seul.

## Conventions médias

- **Images** en WebP. Les vignettes de carte font 16/9 ; fournir une
  variante `-light` quand l'image est illisible sur fond clair.
- **Tableaux Markdown** : trois usages coexistent — données chiffrées,
  cellules de prose et grilles d'images comparatives. Le CSS les traite
  ensemble : les cellules restent dans la police du corps avec
  `font-variant-numeric: tabular-nums` (les colonnes de chiffres s'alignent
  sans imposer du monospace à une phrase), et une image en cellule remplit
  sa colonne sur une table `table-layout: fixed`.
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
- les contrastes sont vérifiés dans les deux thèmes (AA : texte ≥ 4,5:1,
  boîte de détection ≥ 3:1 sur le fond) ;
- les animations sont neutralisées sous `prefers-reduced-motion`.

## Licence

Code sous licence MIT. Le contenu rédactionnel, les visuels de projet et les
CV restent la propriété de Talvin Ackbaraly.
