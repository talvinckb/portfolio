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
- **Peu de mouvement, et toujours au service d'une idée.** L'arbre du
  parcours se dessine en entrant dans l'écran ; le reste ne bouge qu'au
  survol, au dépliage, ou dans une étude de cas (graphiques, étapes). Tout
  s'arrête sous `prefers-reduced-motion`.

## Direction artistique

**« Plan technique ».** Un portfolio classique dans sa structure (profil,
liens, projets, parcours, compétences, contact), dessiné comme une planche :
une seule colonne de 48 rem entre deux filets verticaux qui courent sur
toute la hauteur, des filets horizontaux sur toute la largeur à chaque
bloc, une petite croix là où ils se croisent, et une bande hachurée entre
les grandes sections. Sombre par défaut, le clair reste un choix (bouton
de la nav, mémorisé).

| Rôle | Police | Usage |
|---|---|---|
| Titres | Funnel Display, 300–800 | nom, titres de section et de carte |
| Texte | Funnel Sans, 300–800 | paragraphes, boutons, navigation |
| Données | Geist Mono, 400–500 | périodes, stacks, index, légendes |

Les trois polices sont auto-hébergées dans `assets/fonts/` (sous-ensemble
latin, poids variables). Funnel Display et Funnel Sans sont préchargées.

### Règles

- **Tout s'aligne sur la colonne.** Un nouveau bloc est un `.block` (filet
  et croix compris) ; une séparation forte, une `.sep`. Rien ne sort des
  rails, sauf le sommaire des études de cas, dans la marge de droite.
- **Les grilles sont tracées par leurs filets** : cellules sur un fond
  `--rule` avec `gap: 1px` (liens, projets, faits, en bref, pager), plutôt
  que des cartes flottantes.
- **Un seul accent, jamais en aplat.** `--accent` sert aux index, aux mots
  clés des cartes, à l'état en cours, au graphe GitHub et à l'icône de
  l'email du contact.
- **Aucun projet n'est mis en avant** plus qu'un autre dans la grille.
- **La mono est réservée aux données** et métadonnées, jamais à un
  paragraphe.

Les couleurs sont des tokens : le sombre est défini sur `:root`, le clair
sous `:root[data-theme="light"]` — `--bg`, `--surface`, `--surface-2`,
`--ink`, `--ink-2`, `--ink-3`, `--rule`, `--rule-2`, `--cross`, `--accent`,
`--on-accent`, `--accent-text`, `--accent-soft`, `--overlay`, `--shade`,
`--thumb-top` / `--thumb-bottom` (le fond cuit dans les vignettes) et
`--heat-0` à `--heat-4` (le graphe GitHub). **Aucune couleur en dur dans
une règle**, sinon un thème décroche. Sans JavaScript, le site reste sombre.

## Arborescence

```
.
├── _data/
│   ├── site.json          # Coordonnées, URLs, image OG, couleurs de thème
│   ├── fr.json            # Contenu FR (méta, a11y, hero, projets, parcours…)
│   ├── en.json            # Contenu EN — mêmes clés que fr.json
│   ├── contributions.js   # Graphe GitHub, lu au build (null si indisponible)
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
│       └── contact-actions.njk  # contactBlock() du bloc contact
├── projects/
│   ├── fr/*.md            # Études de cas FR  → /projects/<id>/
│   └── en/*.md            # Études de cas EN  → /en/projects/<id>/
├── css/style.css          # Design system complet
├── js/
│   ├── ui.js              # Comportements partagés (thème, menu, toasts…)
│   ├── main.js            # Page d'accueil (couverture, graphe, parcours, compétences)
│   └── project.js         # Pages projet (sommaire, lightbox, graphiques, KaTeX…)
├── scripts/fetch-cv.js    # Récupère les CV PDF depuis les releases GitHub
├── sitemap.njk            # Sitemap généré à partir de la collection projets
└── .eleventy.js
```

## Structure de la page d'accueil

| Section | Ancre | Source |
|---|---|---|
| Profil — photo, nom, accroche, disponibilité | — | `hero`, `profile` |
| Liens — GitHub, LinkedIn, CV | — | `site`, `hero.cvUrl` |
| En bref — formation, Teaso, lieu, langues, email | — | `profile.overview` |
| Contributions GitHub | — | `_data/contributions.js` |
| À propos | — | `about` |
| Projets sélectionnés + autres réalisations | `#work` | `projects` |
| Parcours — graphe en branches, du plus récent au plus ancien | `#background` | `background` |
| Compétences — une matrice compétences × projets | `#skills` | `skills` |
| Contact | `#contact` | `contact` |

Les ancres sont volontairement en anglais des deux côtés : les deux locales
partagent le même gabarit, donc les mêmes `id`.

### Le profil

Une fiche : la photo, puis le nom sur sa propre ligne, souligné d'un filet,
et dessous l'accroche à côté de la disponibilité. Pas de bannière : la
page s'ouvre directement sur la personne.

### Le graphe GitHub

`_data/contributions.js` lit au build le calendrier public du profil
GitHub (`site.github`), sans jeton. Si GitHub ne répond pas en 8 s, la
donnée vaut `null` et la section disparaît : le build ne dépend jamais de
GitHub. Pointer une case, ou la toucher, affiche le nombre de
contributions du jour au-dessus d'elle (`data-tip`, `main.js`). Sur
téléphone, le graphe défile et s'ouvre sur les semaines les plus récentes. Les contributions des dépôts privés n'y figurent que si
l'option « Private contributions » est activée sur le profil.

### Les cartes de projets

Une grille de deux colonnes tracée par ses filets ; une carte seule sur sa
ligne prend toute la largeur. Chaque carte n'a qu'un lien vers l'étude de
cas, étendu à toute la carte ; les liens vers le site ou le dépôt passent
au-dessus. La variante claire ou sombre du visuel suit le thème. Sur
téléphone, les cartes défilent de côté.

Les autres réalisations sont repliées par défaut (`<details>`) ; dépliées,
elles forment une liste, ou une rangée à faire défiler sur téléphone.

### Le contact

Un grand titre sur une trame de points qui s'efface, puis les canaux en
grille à filets : l'email sur toute la largeur, avec sa case « Copier »,
puis LinkedIn, GitHub et le CV. L'adresse n'est jamais écrite dans la page
(`mailKey`).

### Les études de cas

**La couverture** est la vignette du projet, fixe, sans cadre de plus :
son propre fond lui sert de cadre.

**Changer de projet.** En tête de page, deux flèches mènent au projet
précédent ou suivant, en bouclant aux extrémités, avec la place du projet
dans la liste (filtre `neighbours`). Les touches ← et → du clavier font
de même, sauf dans un champ, un tableau ou une formule qui défile, les
boutons d'un visualiseur d'étapes ou une image agrandie.

### Le parcours

`background.timeline` liste tout le parcours, **du plus récent au plus
ancien** (l'ordre du fichier est celui de la page). Chaque entrée a un
`start` et un `end` au format `AAAA-MM` (`end: null` = toujours en cours),
un `period` affiché tel quel, `org`, `role`, `type` (la pastille), et en
option `description`, `tags` et `link`. Une entrée avec `description` ou
`tags` se déplie au clic. Son `id` ne doit reprendre aucun `id` de projet :
la matrice des compétences les mélange (la ligne de Teaso s'appelle
`founder`).

Le `period` porte l'année aux deux bouts (« Janv. 2024 — Mai 2024 ») :
sur grand écran, chaque bout a sa ligne. Le chapeau (`background.lede`)
parle du parcours lui-même, pas de la façon de lire le graphe.

- `trunk: true` place l'entrée sur la branche principale (les études) ;
  toute autre entrée est une branche qui part du tronc sous sa ligne et le
  rejoint au-dessus de la première ligne qui ne commence pas après sa fin.
- Passé, en cours et à venir se décident **au build** d'après la date du
  jour (`buildDate`), qui place aussi la ligne « Aujourd'hui » : après ce
  repère, les traits passent en pointillés. Un nouveau déploiement suffit à
  le faire avancer.
- `main.js` dessine le graphe en SVG à partir des dates et des positions
  mesurées, et attribue les couloirs lui-même (les branches courtes près du
  tronc). Sans JavaScript, la liste reste lisible avec un simple trait.

### Compétences → projets

Chaque compétence de `skills.groups[].items` porte la liste `used` des `id`
où elle a servi : un projet (`projects.items[].id`) ou une expérience
(`background.timeline[].id`). La section les montre en matrice : les
compétences en lignes, les projets et expériences en colonnes, un point là
où ils se croisent. Les colonnes se déduisent des `used` (filtre
`skillColumns`) : projets sélectionnés, autres réalisations, puis
parcours, chaque groupe ouvert par un filet. L'en-tête d'une colonne mène
à la carte du projet, à son dépôt public ou à sa ligne du parcours.

Survoler une case allume sa ligne et sa colonne (`initMatrix`). Sur
téléphone (moins de 720 px), la matrice laisse la place à des pastilles
groupées, chacune avec le nombre de projets où la compétence a servi ;
un appui les liste sous le groupe (`initSkillset`). Un `used` doit
refléter ce que l'étude de cas montre : mieux vaut un point de moins
qu'un point inventé.

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
     "highlights": ["mot clé"], // mots du tagline soulignés sur la carte
     "thumbnail": "/assets/projects/mon-projet/thumbnail-16x9.webp",
     "thumbnailLight": "/assets/projects/mon-projet/thumbnail-16x9-light.webp",
     "stack": ["C++", "CUDA"],
     "period": "4 semaines",
     "team": 4,               // 1 s'affiche « seul », 2 « binôme »
     "featured": true,        // true = carte + page dédiée
     "github": null,          // URL du dépôt, ou null
     "site": null,            // URL d'un produit en ligne (lien sur la carte)
     "repoNote": null         // réserve sur ce que le dépôt public contient
   }
   ```

   `stack` est rendu en pastilles mono sur la carte : garder quatre ou cinq
   entrées au plus. Chaque mot de `highlights` doit apparaître tel quel dans
   `tagline`, sinon le build échoue.

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
   liveSite: false            # true : le bouton de demo s'appelle « Voir le site »
   report: null
   brief:                     # le bloc « En bref » en tête de page
     problem: "Le problème, en une phrase."
     approach: "Ce qui a été fait, en une phrase."
     result: "Le résultat mesuré, en une phrase."
     role: "Ce que j'ai fait moi-même dans l'équipe."  # facultatif
   ---
   ```

   Chaque titre `##` de l'étude de cas reçoit un `id` au build et devient
   une entrée du sommaire latéral. Les versions FR et EN gardent les mêmes
   titres (`#` à `####`), dans le même ordre : le changement de langue
   s'en sert pour garder la position de lecture.

   Le `title` est celui de la carte, au caractère près.

3. Le sitemap se met à jour tout seul.

### Écrire une étude de cas

- **Titres en casse de phrase**, comme en français : une majuscule au
  premier mot et aux noms propres seulement, « et » plutôt que « & ».
  Des titres propres au projet, pas un gabarit répété.
- **Cinq passages en gras au plus**, pour les chiffres qu'un lecteur
  pressé doit voir. Aucune liste à intitulés en gras, aucun emoji.
- **« Je » pour ce que j'ai fait, « nous » pour l'équipe**, sans rien
  attribuer que le projet ne montre.
- **Virgule décimale en français** pour les mesures (5,29 FPS).

Deux composants s'écrivent en HTML dans le Markdown, sans ligne vide
à l'intérieur :

- **Graphique en barres** (`<figure class="bars" data-bars>`, voir
  `projects/fr/irgpu.md`) : une mesure, `--max` pour l'échelle, `--goal`
  pour une ligne de seuil, `--v` par ligne. Le tableau qui suit en donne
  les valeurs exactes.
- **Visualiseur d'étapes** (`<figure class="stepper" data-stepper>`, voir
  `projects/fr/alpr.md`) : une étape à la fois, avec ses boutons ; une
  grille simple sans JavaScript.

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
  (EN), 1200×630. La planche du site (rails, filets, croix, bande
  hachurée) autour du nom ; à droite, le portrait en trame de points de
  sa lumière, l'arrière-plan gris de la photo retiré. LinkedIn montre
  l'aperçu à environ 40 % et le recompresse en JPEG : filets de 2 px,
  textes de 20 px au moins et trame de 7 px, sans quoi les textes
  s'effacent et la trame part en moiré. Pour juger, réduire à 520 px de
  large en JPEG qualité 70. Source :
  `scripts/og/og.html` (textes en bas du fichier) et `photo-src.jpg`.
  Pour les refaire (rendu au double, puis réduit) :

  ```bash
  cd scripts/og && for pair in fr:og-image en:og-image-en; do L=${pair%%:*}; N=${pair#*:}; google-chrome-stable --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=2 --window-size=1200,630 --virtual-time-budget=20000 --screenshot=$PWD/$L.png "file://$PWD/og.html?lang=$L" && magick $L.png -resize 1200x630 -strip ../../assets/$N.png && rm $L.png; done
  ```

## Accessibilité & SEO

Points à ne pas régresser :

- tout libellé visible **ou** d'assistance passe par `a11y.*` dans les
  fichiers de locale — jamais de chaîne en dur dans un gabarit partagé ;
- le JSON-LD est sérialisé avec le filtre `| dump`, ce qui garantit un JSON
  valide quel que soit le formatage du gabarit autour ;
- chaque page déclare `og:image`, `canonical` et ses trois `hreflang`
  (`fr`, `en`, `x-default`) ;
- une carte projet n'a qu'un lien focusable vers l'étude de cas (le
  bouton) : le visuel répète ce lien pour la souris seulement
  (`tabindex="-1"`, `aria-hidden`) ;
- les contrastes sont vérifiés dans les deux thèmes, bloc bleu compris
  (AA : texte ≥ 4,5:1, éléments graphiques ≥ 3:1 sur le fond) ;
- les animations sont neutralisées sous `prefers-reduced-motion`.

## Licence

Code sous licence MIT. Le contenu rédactionnel, les visuels de projet et les
CV restent la propriété de Talvin Ackbaraly.
