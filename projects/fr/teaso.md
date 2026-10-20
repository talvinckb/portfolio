---
id: teaso
name: "Teaso"
title: "Vidéos promo de SaaS générées depuis une URL"
tagline: "Un SaaS que j'ai conçu, lancé et que je fais tourner seul : on colle l'adresse de son produit, Teaso lit le site, en extrait la marque et en tire une vidéo de motion design de 18 secondes pour X et LinkedIn."
thumbnail: "/assets/projects/teaso/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/teaso/thumbnail-16x9-light.webp"
stack:
  ["TypeScript", "Next.js", "Remotion", "Playwright", "API Claude", "PostgreSQL", "AWS Lambda", "Stripe"]
period: "Depuis oct. 2026"
team: 1
github: null
demo: "https://teaso.app"
liveSite: true
report: null
brief:
  problem: "Un fondateur de SaaS doit montrer chaque nouveauté sur X et LinkedIn, mais une vidéo de motion design lui coûte des heures de montage ou un prestataire."
  approach: "Le site est lu dans un navigateur isolé, la marque est tirée de ce que la page peint, Claude écrit les textes dans un storyboard validé par un schéma, et la vidéo est rendue en MP4 sur AWS Lambda."
  result: "Un produit en ligne et payant en deux semaines : huit templates, quatre formats par rendu, une preview gratuite et immédiate dans le navigateur."
  role: "Tout, seul : produit, design, code, infrastructure, paiement et site."
---

## Une vidéo à chaque fonctionnalité livrée

Les fondateurs de SaaS publient leurs nouveautés sur X et LinkedIn, le plus souvent en simple capture d'écran. Une vidéo arrête mieux le défilement, mais il faut savoir monter, et recommencer à chaque version.

Teaso part de l'adresse du produit. Il en tire une première vidéo de présentation, puis une vidéo par fonctionnalité livrée, à partir d'une phrase et d'une capture : c'est ce second usage qui fait revenir les utilisateurs, et c'est pourquoi chaque marque et son brand kit sont enregistrés dès la première vidéo.

Le format découle de la façon dont ces vidéos sont vues :

- dans le fil, sur téléphone et sans le son : pas de voix off, et l'accroche tombe dans les deux premières secondes ;
- avec le vrai produit : du motion design sur des templates, des textes animés et les captures du site, jamais une vidéo générée par IA ;
- courtes : 18 secondes, une idée par plan, très peu de mots, en très grand.

## De l'URL au MP4

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma du workflow">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">URL</span>
    <span class="pipeline-step__sub">Collée par l'utilisateur</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Lecture du site</span>
    <span class="pipeline-step__sub">Playwright isolé</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Brand kit</span>
    <span class="pipeline-step__sub">Logo, couleurs, police</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Storyboard</span>
    <span class="pipeline-step__sub">Claude + schéma Zod</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Preview</span>
    <span class="pipeline-step__sub">Dans le navigateur</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">MP4</span>
    <span class="pipeline-step__sub">Rendu sur AWS Lambda</span>
  </div>
</div>

Les étapes longues (lire le site, appeler Claude, lancer un rendu) passent par une file de tâches dans PostgreSQL (pg-boss), traitée par un worker à part. Pendant ce temps, l'écran de chargement montre ce qui a déjà été trouvé : le logo, les couleurs, les captures.

La séparation qui compte le plus est entre la preview et le rendu. La preview est la vraie composition vidéo, jouée dans le navigateur avec le Player de Remotion : elle est gratuite, immédiate, et se met à jour pendant la frappe. Le rendu serveur, lui, coûte : il n'est lancé qu'au téléchargement, demande un compte et se paie d'un crédit. On peut donc tout essayer sans rien payer, et rien de coûteux ne part sans une action de l'utilisateur.

## Lire une marque dans les pixels

Pour qu'une vidéo ressemble au produit, il faut ses couleurs, sa police et son logo. Le CSS les déclare, mais ne dit pas toujours ce qui se voit : un titre déclaré vert peut être peint en gris par un effet du site, un bouton peut être un dégradé, un fond peut être une image.

Le site est donc chargé dans Chromium, aux fenêtres d'un ordinateur (1440 × 900) et d'un téléphone (390 × 844), en résolution double, après avoir masqué les bannières de cookies et les bulles de discussion. J'en tire d'abord des candidats dans la page : la couleur du titre d'après ses premiers mots, les dégradés des boutons, la place de chaque couleur dans le premier écran. Puis chaque candidat est vérifié sur la capture.

Pour lire les couleurs d'une zone, ses pixels sont regroupés par 32 niveaux par canal, puis chaque groupe est fusionné avec ses voisins proches (ce que produisent un dégradé ou le lissage d'un texte), en une couleur moyenne. Une couleur peinte assez proche de celle du CSS reprend la valeur exacte du CSS, que la compression JPEG et l'anticrénelage décalent un peu. Le logo est capturé seul, sur fond transparent : sa seule couleur vive compte, même petite, comme le point bleu du logo de Teaso.

Une couleur juste ne suffit pas, il faut aussi qu'elle reste lisible. Toute couleur de texte de la vidéo passe par une fonction qui garantit un contraste d'au moins **4,5:1** avec son fond. Une couleur de la marque sert d'aplat si elle se détache du fond par sa luminance ou par sa teinte : l'accent vert clair d'un site blanc (1,5:1) reste la marque, au lieu de basculer sur le noir.

J'ai aussi cherché à prédire si une couleur vive peut remplir toute l'image sans être criarde. Sur douze sites mesurés, ni la vivacité de la couleur ni la place que lui donne son site ne le disaient. C'est donc resté un choix de l'utilisateur dans le Brand kit, jamais une décision automatique.

## Des textes écrits par Claude, tenus par un schéma

Le storyboard est un JSON interne : le template, le brand kit, et une liste de scènes typées (accroche, mots-chocs, réponse, démo, étapes, appel à l'action). Claude n'écrit que les textes, en sortie structurée, d'après le contenu de la page ; l'application y ajoute le brand kit, les captures et l'adresse.

Chaque texte a une limite, en caractères et en mots pour les titres, fixée par le template d'après sa mise en page et le temps de lecture. L'API ne les impose pas : c'est un schéma Zod qui les vérifie après coup. Un texte trop long est renvoyé à Claude avec la raison, deux fois au plus ; ensuite, les textes facultatifs encore invalides sont retirés. La base ne contient ainsi jamais qu'un storyboard valide, que la vidéo sait afficher.

Le modèle par défaut est Claude Haiku, jamais Opus : le coût de chaque vidéo en dépend, et je le suis par génération dans l'administration.

![L'éditeur : une carte par scène à gauche, la vidéo à droite, qui se met à jour pendant la frappe](/assets/projects/teaso/editor.webp)

Rien n'est imposé avant de voir la vidéo. L'utilisateur corrige ensuite chaque scène dans sa carte, choisit les mots mis en valeur ou demande une autre accroche, que Claude réécrit sous un autre angle avec les mêmes captures. Les modifications s'enregistrent à chaque pause dans la frappe, et le serveur refuse un storyboard dont les parties verrouillées (le déroulé, le brand kit) auraient changé.

## Un storyboard, quatre formats

Le format ne fait pas partie du storyboard : le même storyboard donne une vidéo en 16:9, 1:1, 4:5 et 9:16, et un seul crédit exporte les quatre. Cela suppose que chaque texte tienne dans sa boîte quel que soit le format et quelle que soit la police de la marque, parfois très large. Les titres sont mesurés une fois les polices chargées, puis coupés en lignes équilibrées ; les textes d'une ligne (boutons, pastilles) sont réduits plutôt que de déborder.

![La même vidéo de lancement dans les quatre formats](/assets/projects/teaso/formats.webp)

Teaso propose huit templates, chacun pour un type de vidéo : lancement, nouvelle fonctionnalité, avis client, cap franchi, offre, jour de lancement, nouveautés du mois, avant et après.

![Les huit templates, chacun joué ici sans marque](/assets/projects/teaso/templates.webp)

La vidéo de lancement de Teaso a été faite par Teaso, à partir de teaso.app :

<video preload="none" poster="/assets/projects/teaso/launch-video-poster.webp" controls src="/assets/projects/teaso/launch-video.mp4" loop muted playsinline class="project-video-demo" title="La vidéo de lancement de Teaso, générée par Teaso depuis teaso.app"></video>

## Rendre une vidéo sur 200 fonctions

Le rendu tourne sur Remotion Lambda, dans la région AWS de Paris. La vidéo est découpée entre **jusqu'à 200 fonctions** de 3 Go, qui rendent chacune leur morceau en parallèle, puis le MP4 assemblé est écrit directement dans le stockage de l'application.

Le découpage a ses limites. Le 17 octobre, des morceaux de six images ont produit un MP4 dont toutes les images s'entassaient dans le premier dixième de seconde : ffmpeg assemble mal des morceaux trop courts. Chaque morceau dure désormais au moins 0,2 s.

Les compositions sont déployées sur Lambda à chaque commit, sous un nom tiré de ce commit. Le worker rend toujours avec celles de son propre code : un rendu lancé juste avant un déploiement se termine sur l'ancienne version, et un retour en arrière remet aussi l'ancien template.

## Ouvrir des sites inconnus sans risque

Teaso charge dans un navigateur n'importe quelle adresse qu'on lui donne, ce qui en fait une cible évidente. Le navigateur tourne dans son propre conteneur, sur un réseau Docker interne sans route vers Internet, vers la base ni vers l'hôte. Il ne sort que par un proxy du worker, qui filtre les adresses autorisées. Le bac à sable de Chromium reste actif, sous un utilisateur sans droits.

Les fichiers envoyés par les utilisateurs sont traités comme des données non fiables : le type est lu dans les premiers octets, les dimensions dans l'en-tête avant tout décodage (20 Mo et 50 millions de pixels au plus), puis chaque image est réencodée en WebP sans ses métadonnées.

## Un produit, pas un prototype

Le reste est ce qui sépare une démo d'un service que des inconnus paient :

| Besoin | Choix |
| :--- | :--- |
| Hébergement | Un VPS en France, Docker Compose, Caddy ; sauvegarde de la base chaque nuit vers un stockage à part |
| Déploiement | CI sur chaque pull request, mise en production à chaque fusion, retour en arrière sans recompiler |
| Connexion | Un code à six chiffres par email, sans mot de passe ni lien magique |
| Paiement | Stripe Checkout, à l'unité ou par abonnement, factures conformes à la franchise de TVA |
| Emails | Amazon SES, payé à l'envoi plutôt qu'à l'abonnement |
| Mesure d'audience | Umami auto-hébergé, sans cookie, donc sans bandeau de consentement |
| Erreurs | Sentry, en région UE, limité aux erreurs inattendues |

Vercel a été écarté : sa formule gratuite interdit l'usage commercial, et Playwright n'y tourne pas.

Le lien magique a été écarté pour une raison d'usage : ouvert depuis l'application Gmail, il s'ouvre dans un autre navigateur, et l'utilisateur y perdrait la vidéo qu'il venait de faire sans compte.

Les deux premières semaines, du premier commit le 7 octobre 2026 à la version payante en ligne, représentent **107 pull requests** fusionnées et une centaine de fichiers de tests.

## Ce que j'en retiens

Travailler seul sur un produit, c'est surtout décider de ce qu'on retire. La musique et les effets sonores sont sortis du périmètre : la vidéo est lue sans le son, et ni des effets seuls ni une musique synthétisée n'ont convaincu. La première vidéo offerte à chaque compte a été supprimée le 19 octobre : son écran de fin la gâchait, et elle donnait gratuitement la vidéo de lancement, souvent la seule dont un fondateur a besoin.

Côté technique, Teaso m'a ramené à un réflexe de la vision par ordinateur : se fier à ce que l'image montre plutôt qu'à ce que la source déclare.
