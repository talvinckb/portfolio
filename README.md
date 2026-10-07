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
- **Trois moments de mouvement, pas plus.** Le nom qui se lève à
  l'arrivée, avec la lentille qui le traverse une fois ; les cartes qui
  s'empilent au scroll ; les sections qui montent en entrant dans
  l'écran. Le reste ne bouge qu'au survol, ou dans une étude de cas
  (graphiques, étapes). Les vignettes des projets, elles, restent fixes.
  Tout disparaît sous `prefers-reduced-motion`.

## Direction artistique

**« Galerie claire ».** Un site clair et calme où les visuels des projets
apportent toute la couleur : une typographie très grande, un seul accent
bleu outremer, des surfaces blanches arrondies. Volontairement à l'opposé de
la page `/freelance` (sombre, jaune et violet, ombres décalées).

| Rôle | Police | Usage |
|---|---|---|
| Titres | Funnel Display, 300–800 | nom, titres de section et de carte, accroches |
| Texte | Funnel Sans, 300–800 | paragraphes, boutons, navigation |
| Données | Geist Mono, 400–500 | périodes, stacks, index, libellés |
| Bouton Freelance | Bricolage Grotesque | uniquement ce bouton, qui reprend /freelance |

Les quatre polices sont auto-hébergées dans `assets/fonts/` (sous-ensemble
latin, poids variables). Funnel Display et Funnel Sans sont préchargées.

### Règles

- **Un seul accent.** `--accent` sert à l'action principale, aux mots clés
  des cartes, aux index et à l'état sélectionné. Le texte courant reste en
  `--ink` / `--ink-2`. Le bleu plein n'apparaît en aplat qu'une fois : le
  bloc contact (`--block`), identique dans les deux thèmes.
- **Arrondis partout**, sur trois rayons : pastilles (`99px`) pour les
  boutons et étiquettes, `--radius` pour les images et cartes moyennes,
  `--radius-lg` pour les grandes cartes.
- **Les surfaces portent la hiérarchie** : `--surface` (blanc) pour ce qui
  se détache du fond, un filet `--rule` en `box-shadow: inset` pour le
  contour, `--shade` pour ce qui flotte (cartes, ligne survolée).
- **Le bouton Freelance est la seule exception**, et elle reste discrète :
  au repos, une pastille neutre en Bricolage avec un point jaune et violet ;
  au survol, il prend toutes les couleurs de `/freelance` (`--fl-*`, ombre
  décalée) pour annoncer qu'on change d'univers. Le site sert d'abord à
  trouver un stage : la porte vers le freelance ne doit pas attirer l'œil
  avant le reste.
- **Aucun projet n'est mis en avant** plus qu'un autre : les cartes les
  montrent tous de la même façon.
- **La mono est réservée aux données** et métadonnées, jamais à un
  paragraphe.

Les couleurs sont des tokens redéfinis sous `:root[data-theme="dark"]` —
`--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-2`, `--ink-3`, `--rule`,
`--rule-2`, `--accent`, `--on-accent`, `--accent-text`, `--accent-soft`,
`--overlay`, `--shade`, et `--thumb-top` / `--thumb-bottom`, le fond cuit
dans les vignettes, que reprend le cadre de la couverture. **Aucune couleur en dur dans une règle**, sinon un
thème décroche. Le clair est l'aspect par défaut ; sans JavaScript, le site
suit la préférence système.

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
│       └── contact-actions.njk  # contactBlock() du bloc contact
├── projects/
│   ├── fr/*.md            # Études de cas FR  → /projects/<id>/
│   └── en/*.md            # Études de cas EN  → /en/projects/<id>/
├── css/style.css          # Design system complet
├── js/
│   ├── ui.js              # Comportements partagés (thème, menu, toasts…)
│   ├── main.js            # Page d'accueil (hero, cartes, parcours, compétences)
│   └── project.js         # Pages projet (sommaire, lightbox, graphiques, KaTeX…)
├── scripts/fetch-cv.js    # Récupère les CV PDF depuis les releases GitHub
├── sitemap.njk            # Sitemap généré à partir de la collection projets
└── .eleventy.js
```

## Structure de la page d'accueil

| Section | Ancre | Source |
|---|---|---|
| Hero — rôle, disponibilité, nom, accroche, actions | — | `hero` |
| Projets sélectionnés + autres réalisations | `#work` | `projects` |
| Parcours — graphe en branches, du plus récent au plus ancien | `#background` | `background` |
| Compétences — une matrice compétences × projets | `#skills` | `skills` |
| Contact | `#contact` | `contact` |

Les ancres sont volontairement en anglais des deux côtés : les deux locales
partagent le même gabarit, donc les mêmes `id`.

### Le hero

Le nom (`h1`) occupe exactement la largeur de la colonne et se lève
lettre par lettre ; les lettres sont `aria-hidden` et le nom complet reste
lisible par les lecteurs d'écran. L'animation ne se joue qu'une fois : un
changement de langue reconstruit le hero sans la rejouer
(`html.hero-played`).

Le nom est traité comme un logotype, aux lettres serrées jusqu'à se
toucher (`-0.06em`) :

- **Les lettres restent `inline`.** Une boîte `inline-block` par lettre
  casse le crénage de la police (« Ta », « Ac »…) ; en `inline`, il
  s'applique, et la montée anime `top` plutôt qu'un `transform`.
- **La taille vient de la colonne** : `calc(100cqi / 4.39)`, 4,39 em étant
  la largeur de l'encre de « Ackbaraly ». À remesurer si le nom, la police
  ou l'approche changent.

**La lentille.** Une seconde copie du nom, en contours sur une trame de
points, apparaît dans un cercle sous la souris, comme un détecteur de bords
verrait les lettres (`initHeroLens`, masques CSS). Elle traverse le nom une
fois après l'entrée, pour les écrans tactiles aussi. Rien de tout cela sous
`prefers-reduced-motion`.

### Les cartes de projets

Sur un écran assez grand (960 × 620 px et plus), les cartes sont `sticky`
et s'empilent sous le header ; `main.js` mesure la part de chaque carte
recouverte par la suivante (`--p`, de 0 à 1) et le CSS la fait reculer et
s'estomper. Un badge « Lire l'étude » suit le pointeur sur les visuels
(souris uniquement). La variante claire ou sombre du visuel suit le thème.

Sur grand écran, deux flèches entourent l'index de chaque carte (« ‹ 03 / 06
› ») pour passer à la carte précédente ou suivante ; les touches ← et →
font de même tant qu'une carte est à l'écran. Sur téléphone, le carrousel
garde ses propres flèches, à côté du titre.

Les « autres réalisations » restent toujours visibles : en colonnes sur
grand écran, en rangée à faire défiler sur téléphone.

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
`tags` se déplie au clic.

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
     "team": 4,               // 2 s'affiche « binôme »
     "featured": true,        // true = carte + page dédiée
     "github": null,          // URL du dépôt, ou null
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
  (EN), 1200×630.

## Page freelance

`/freelance/` s'adresse aux clients, pas aux recruteurs : elle a son propre
layout (`_includes/freelance.njk`), sa feuille de style et son script, et
reprend l'identité de la vidéo de présentation freelance. Tous ses textes
sont dans `_data/freelance.json`, y compris son adresse pro
(`email`, `contact@talvin-ackbaraly.com`) : le portfolio garde `site.email`.

Ses polices (Bricolage Grotesque, Inter) sont hébergées dans `assets/fonts/`
(sous-ensemble latin de Google Fonts) et préchargées, pour que l'animation
du hero ne démarre pas avec la police de secours. Elles sont servies avec un
cache `immutable` : pour changer une police, changer aussi son nom de fichier.

### Formulaire de contact

Le formulaire est envoyé à la fonction Vercel `api/contact.js`, qui envoie
deux e-mails via [Resend](https://resend.com) : la demande (vers
`CONTACT_TO`, avec le client en « répondre à ») et un accusé de réception
au client. Sans JavaScript, le formulaire est posté normalement et la
fonction redirige vers `#merci` ou `#oups`.

Anti-spam : champ piège invisible, envoi trop rapide ignoré, limite par IP,
refus des requêtes venant d'un autre site.

| Variable (Vercel) | Rôle |
|---|---|
| `RESEND_API_KEY` | **obligatoire** — clé API Resend |
| `CONTACT_TO` | adresse qui reçoit les demandes (défaut : `freelance.email`) |
| `CONTACT_FROM` | expéditeur (défaut : `freelance.email`, au nom de `site.name`) |

L'expéditeur doit appartenir à un domaine vérifié dans Resend
(enregistrements DNS chez OVH). En local, `npm run dev` ne sert pas
`/api` : utiliser `vercel dev` pour tester l'envoi.

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
