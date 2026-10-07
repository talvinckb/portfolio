---
id: irgpu
name: "IRGPU"
title: "Détection de mouvement vidéo — portage GPU"
tagline: "Portage CPU → GPU d'un algorithme de détection de mouvement en temps réel : ×24 grâce à CUDA et à six optimisations guidées par Nsight."
thumbnail: "/assets/projects/irgpu/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/irgpu/thumbnail-16x9-light.webp"
stack: ["C++", "CUDA", "GStreamer", "Nsight Systems", "Nsight Compute"]
period: "4 semaines"
team: 4
github: null
demo: null
report: null
brief:
  problem: "La version C++ de référence plafonne à 5,29 FPS, loin des 30 FPS du temps réel."
  approach: "Un thread par pixel, puis six optimisations mesurées avec Nsight : allocation mémoire, float, générateur aléatoire, shared memory, tuilage et géométrie des blocs."
  result: "129,5 FPS, soit ×24,47, avec une sortie quasi identique au CPU (SSIM 0,9949)."
---

## L'objectif : 30 FPS avec CUDA

La détection de mouvement en temps réel sert en vidéosurveillance, en analyse de flux vidéo et en robotique. Nous devions concevoir un filtre de soustraction d'arrière-plan capable de tenir 30 FPS ou plus en haute résolution, en nous appuyant uniquement sur NVIDIA CUDA et le framework multimédia GStreamer.

Trois points rendaient l'exercice délicat :

- la version C++ séquentielle de référence ne dépasse pas 5,29 FPS, loin du seuil de 30 FPS ;
- chaque pixel de chaque image passe par cinq traitements successifs, indépendants d'un pixel à l'autre : un cas idéal pour le GPU, mais dont les goulots d'étranglement (mémoire, génération aléatoire, morphologie) demandent une analyse fine ;
- chaque optimisation CUDA doit garder une sortie quasi identique à la référence CPU (SSIM proche de 1,0000).

## Le pipeline en cinq étapes

Chaque image traverse cinq étapes successives, et dans chacune, chaque pixel est traité indépendamment des autres : une structure qui se prête bien à la parallélisation sur GPU.

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Image source</span>
    <span class="pipeline-step__sub">RGB brut</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Fond estimé</span>
    <span class="pipeline-step__sub">Modèle à K = 3 réservoirs</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Masque de mouvement</span>
    <span class="pipeline-step__sub">Norme L₁</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Ouverture morpho.</span>
    <span class="pipeline-step__sub">Érosion + dilatation</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Seuillage par hystérésis</span>
    <span class="pipeline-step__sub">Propagation 4-connexe</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Résultat final</span>
    <span class="pipeline-step__sub">Coloration du mouvement</span>
  </div>
</div>

## Détail de chaque étape

### Étape 1 : estimation de l'arrière-plan

C'est l'étape la plus complexe. Pour chaque pixel, l'algorithme maintient K = 3 réservoirs de couleur (`color` + `weight`), qui modélisent les différents fonds possibles (bruit, changements d'éclairage…).

À chaque nouvelle image, pour chaque pixel :

- si sa couleur est proche d'un réservoir existant (tolérance de ±10 par canal), la couleur de ce réservoir est mise à jour par moyenne pondérée glissante et son poids augmente ;
- si aucun réservoir ne correspond, le plus faible est remplacé de façon aléatoire, avec une probabilité inversement proportionnelle à son poids.

Le fond estimé d'un pixel est la couleur de son réservoir de poids le plus élevé.

### Étape 2 : masque de mouvement

L'écart entre le pixel courant et le fond estimé se mesure avec la norme L₁ (moyenne des différences absolues sur R, G et B). Un score élevé signale un pixel en mouvement.

### Étape 3 : ouverture morphologique

Le masque brut contient du bruit (feuillages, artefacts vidéo). Une ouverture morphologique par un disque de rayon R = 3 élimine ces faux positifs :

- l'érosion supprime les pixels isolés ;
- la dilatation rend aux objets détectés leur taille réelle.

### Étape 4 : seuillage par hystérésis

Ce seuillage assure la cohérence spatiale. Les pixels de score fort (> 45) servent de graines sûres ; les pixels de score faible (> 20) ne sont gardés que s'ils touchent un pixel fort (propagation en 4-connexité), et la propagation se répète jusqu'à convergence.

### Étape 5 : coloration du mouvement

Les pixels retenus sont teintés de rouge semi-transparent sur l'image d'origine : le mouvement apparaît sans masquer la scène.

## Du CPU au GPU, guidé par Nsight

Nous n'avons rien optimisé à l'aveugle : chaque choix part d'une mesure, avec NVIDIA Nsight Systems pour l'analyse temporelle globale et NVIDIA Nsight Compute pour l'analyse fine de chaque kernel.

### Point de départ : 5,29 FPS sur CPU

La version séquentielle de référence parcourt les pixels un à un, dans deux boucles imbriquées. Elle sert de vérité terrain pour valider la fidélité de chaque version GPU (sa propre SSIM vaut 1,0000 par définition).

| Implémentation  | Temps (s) |   FPS    | Accélération |
| :-------------- | :-------: | :------: | :----------: |
| C++ (référence) | 616,78 s  | 5,29 FPS |    ×1,00     |

À 5,29 FPS, le traitement vidéo en direct est hors de portée.

### Portage CUDA naïf : ×9,24

La première version CUDA transpose directement le code : un thread GPU par pixel (grille 2D, blocs de 16×16). Sans aucune optimisation, elle franchit déjà les 30 FPS.

| Implémentation  | Temps (s) |    FPS    | Accélération |  SSIM  |
| :-------------- | :-------: | :-------: | :----------: | :----: |
| C++ (référence) | 616,78 s  | 5,29 FPS  |    ×1,00     | 1,0000 |
| CUDA naïf       |  52,72 s  | 48,92 FPS |  **×9,24**   | 0,9951 |

Il restait des goulots d'étranglement importants, que le profilage a mis au jour.

### Six optimisations mesurées

#### Optimisations 1 et 2 : allocation unique et `float` (×18)

La version naïve réallouait les buffers GPU à chaque image. Avec une initialisation paresseuse, la mémoire est allouée une seule fois au démarrage, et il ne reste que deux transferts PCIe par image : l'image entrante vers le GPU, le résultat vers le CPU.

Nsight Compute signalait aussi le coût des calculs en `double` sur un GPU grand public. Passer en `float` (avec `lroundf()`) accélère nettement les calculs flottants.

![Nsight Compute : avertissement sur le coût du FP64 (`double`) sur ce GPU](/assets/projects/irgpu/nsight_fp64_precision_warning.webp)

| Implémentation               |    FPS    | Accélération |
| :--------------------------- | :-------: | :----------: |
| CUDA naïf                    | 48,92 FPS |    ×9,24     |
| + allocation unique et float | 95,43 FPS |  **×18,03**  |

#### Optimisation 3 : un LCG à la place de `cuRAND` (×18,7)

Nsight Systems montre que `cuRAND` alloue en VRAM un état interne de **48 octets par pixel** : en 1080p, près de 95 Mo rien que pour le générateur aléatoire.

![Nsight Systems : la VRAM occupée par les états `curandState`](/assets/projects/irgpu/nsight-curand.webp)

| Résolution | Taille de `curandState` |
| :--------- | :---------------------: |
| 320×240    |         ~3,5 Mo         |
| 1920×1080  |        ~94,9 Mo         |

|                          Allocation cuRAND (320×240)                           |                          Allocation cuRAND (1080p)                           |
| :----------------------------------------------------------------------------: | :--------------------------------------------------------------------------: |
| ![cuRAND 320x240](/assets/projects/irgpu/cudamalloc_vram_profiling_small.webp) | ![cuRAND 1080p](/assets/projects/irgpu/cudamalloc_vram_profiling_large.webp) |

Nous l'avons remplacé par un générateur congruentiel linéaire (LCG), calculé à la volée à partir de l'index du pixel et du numéro d'image : aucun octet de VRAM en plus.

|                        Débit avec `cuRAND`                         |                         Débit avec `fast_rand`                          |
| :----------------------------------------------------------------: | :---------------------------------------------------------------------: |
| ![Débit cuRAND](/assets/projects/irgpu/throughput-curand.webp) | ![Débit fast_rand](/assets/projects/irgpu/throughput-fast-rand.webp) |

#### Optimisation 4 : l'hystérésis en shared memory (×23,5)

La propagation de l'hystérésis demande plusieurs passes jusqu'à convergence. Sans optimisation, chaque itération provoque une synchronisation CPU/GPU et sature la bande passante de la VRAM.

![Accès VRAM saturés sans shared memory](/assets/projects/irgpu/vram_saturation_no_shared_memory.webp)

Nous découpons l'image en tuiles de 16×16 chargées en shared memory, avec un halo d'un pixel : la propagation des pixels forts vers leurs voisins faibles se fait localement, sans accès à la VRAM.

|                              Analyse VRAM avant                               |                             Analyse VRAM après                              |
| :---------------------------------------------------------------------------: | :-------------------------------------------------------------------------: |
| ![Avant la shared memory](/assets/projects/irgpu/hysteresis_memory_before.webp) | ![Après la shared memory](/assets/projects/irgpu/hysteresis_memory_after.webp) |

Les requêtes VRAM sont divisées par 8 (de 139 k à 17,7 k par itération), et ce kernel gagne 26 % de vitesse à lui seul.

#### Optimisation 5 : ouverture morphologique tuilée (×24,1)

L'érosion et la dilatation lisaient 29 voisins par thread directement dans la mémoire globale. Avec des tuiles en shared memory (halo de 2×R) et les décalages du disque en constant memory, le trafic VRAM est divisé par deux (de 10,69 à 5,44 Go/s).

#### Optimisation 6 : blocs de 32×8 threads (×24,5)

Nsight Compute montre qu'avec des blocs de 32×8 (256 threads), la largeur d'un bloc correspond à celle d'un warp CUDA (32 threads), ce qui maximise la coalescence des accès mémoire sur les lignes de l'image.

![Nsight Compute : coalescence des accès et alignement sur les warps (blocs 32×8)](/assets/projects/irgpu/analyse-blocks-32x8.webp)

### Motifs de programmation parallèle

Nous avons aussi vérifié quels motifs parallèles classiques s'appliquaient au projet :

- le motif stencil sert à l'ouverture morphologique et à l'hystérésis (voisinage local en shared memory) ;
- une réduction n'est pas nécessaire : le drapeau de convergence de l'hystérésis ne passe que de `false` à `true` (écriture idempotente), donc aucune race condition et pas besoin d'`atomicOr` ;
- un scan ne convient pas à un traitement local, pixel par pixel.

## De 5,29 à 129,51 FPS

### Comparaison globale des performances

<figure class="bars" data-bars style="--max: 160; --goal: 30">
<p class="bars__title">Images par seconde, version par version</p>
<div class="bars__axis" aria-hidden="true"><span class="bars__track"><span class="bars__goal">30 FPS, temps réel</span></span></div>
<ol class="bars__rows" role="list">
<li class="bars__row is-base" style="--v: 5.29; --i: 0" tabindex="0"><span class="bars__label">C++ (référence)</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">5,29 FPS</span><span class="bars__more">×1,00 · 616,78 s · SSIM 1,0000</span></span></li>
<li class="bars__row" style="--v: 48.92; --i: 1" tabindex="0"><span class="bars__label">CUDA naïf</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">48,92 FPS</span><span class="bars__more">×9,24 · 52,72 s · SSIM 0,9951</span></span></li>
<li class="bars__row" style="--v: 95.43; --i: 2" tabindex="0"><span class="bars__label">+ allocation unique et float</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">95,43 FPS</span><span class="bars__more">×18,03 · 18,18 s · SSIM 0,9950</span></span></li>
<li class="bars__row" style="--v: 98.96; --i: 3" tabindex="0"><span class="bars__label">+ générateur LCG</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">98,96 FPS</span><span class="bars__more">×18,70 · 17,01 s · SSIM 0,9950</span></span></li>
<li class="bars__row" style="--v: 124.34; --i: 4" tabindex="0"><span class="bars__label">+ hystérésis en shared memory</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">124,34 FPS</span><span class="bars__more">×23,49 · 10,80 s · SSIM 0,9949</span></span></li>
<li class="bars__row" style="--v: 127.57; --i: 5" tabindex="0"><span class="bars__label">+ ouverture tuilée</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">127,57 FPS</span><span class="bars__more">×24,10 · 10,65 s · SSIM 0,9949</span></span></li>
<li class="bars__row" style="--v: 129.51; --i: 6" tabindex="0"><span class="bars__label">+ blocs 32×8 (version finale)</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">129,51 FPS</span><span class="bars__more">×24,47 · 10,56 s · SSIM 0,9949</span></span></li>
</ol>
<figcaption>Débit de chaque version sur le jeu de données. Le trait vertical marque les 30 FPS du temps réel ; le tableau ci-dessous détaille chaque version.</figcaption>
</figure>

De 5,29 FPS à 129,51 FPS, soit **×24,47**, pour une sortie quasi identique à la référence (**SSIM 0,9949**). Chaque optimisation, de la gestion mémoire au générateur aléatoire, apporte sa part du gain.

### Les sept versions mesurées

| Implémentation                    | Temps (s) |    FPS     | Accélération |  SSIM  |
| :-------------------------------- | :-------: | :--------: | :----------: | :----: |
| C++ (référence)                   | 616,78 s  |  5,29 FPS  |    ×1,00     | 1,0000 |
| CUDA naïf                         |  52,72 s  | 48,92 FPS  |    ×9,24     | 0,9951 |
| + allocation unique et float      |  18,18 s  | 95,43 FPS  |    ×18,03    | 0,9950 |
| + générateur LCG                  |  17,01 s  | 98,96 FPS  |    ×18,70    | 0,9950 |
| + hystérésis en shared memory     |  10,80 s  | 124,34 FPS |    ×23,49    | 0,9949 |
| + ouverture tuilée                |  10,65 s  | 127,57 FPS |    ×24,10    | 0,9949 |
| **+ blocs 32×8 (version finale)** |  10,56 s  | 129,51 FPS |    ×24,47    | 0,9949 |

### Démonstration en temps réel

<video preload="none" poster="/assets/projects/irgpu/motion_detection_demo-poster.webp" controls src="/assets/projects/irgpu/motion_detection_demo.mp4" loop muted playsinline class="project-video-demo" title="Le filtre de détection de mouvement CUDA en temps réel"></video>
