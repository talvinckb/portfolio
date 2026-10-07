---
id: alpr
name: "ALPR"
title: "Reconnaissance automatique de plaques d'immatriculation"
tagline: "Localiser des plaques d'immatriculation sans deep learning (vision classique et Random Forest), avec un benchmark Python contre C++17."
thumbnail: "/assets/projects/alpr/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/alpr/thumbnail-16x9-light.webp"
stack: ["Python", "C++17", "OpenCV", "Random Forest", "CMake", "Google Test"]
period: "5 semaines"
team: 2
github: null
demo: null
report: null
brief:
  problem: "Localiser des plaques sur des images Full HD très variables, sans aucun réseau de neurones profond."
  approach: "Vision classique et Random Forest, prototypés en Python puis réécrits en C++17, avec un module maison MyCV."
  result: "F1 de 0,7535 sur les 1 440 images de test UFPR-ALPR, et 14 % de temps en moins par image en C++."
---

## Localiser une plaque sans deep learning

La reconnaissance automatique de plaques d'immatriculation (ALPR) est une brique des systèmes de transport intelligents et du contrôle d'accès routier. Notre objectif : localiser la plaque d'un véhicule dans des images haute résolution, quels que soient le véhicule et l'environnement.

### Contraintes du projet

- Le pipeline ne devait utiliser **aucun réseau de neurones profond** (ni YOLO, ni CNN lourd) : uniquement de la vision par ordinateur classique et un machine learning léger, pour rester explicable et peu gourmand en mémoire.
- Les images sont en Full HD ($1920 \times 1080$), avec de fortes variations de luminosité (plein soleil, pluie, ombres), des angles inclinés et des occultations partielles.
- Le système doit reconnaître aussi bien les anciennes plaques brésiliennes que le nouveau format Mercosul.

## Le pipeline en quatre étapes

Nous avons découpé le traitement en un pipeline séquentiel de quatre étapes :

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Image brute</span>
    <span class="pipeline-step__sub">Full HD 1080p</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Prétraitement</span>
    <span class="pipeline-step__sub">800 px, niveaux de gris</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Génération des ROI</span>
    <span class="pipeline-step__sub">Filtres et morphologie</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Descripteurs HOG</span>
    <span class="pipeline-step__sub">Vecteur 293D</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Classification</span>
    <span class="pipeline-step__sub">Random Forest</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Résultat</span>
    <span class="pipeline-step__sub">Plaque localisée</span>
  </div>
</div>

1. Le prétraitement normalise l'échelle de l'image et réduit ses canaux de couleur.
2. La génération de candidats extrait, à plusieurs échelles, les zones rectangulaires qui ont de bonnes chances de contenir une plaque (ROI).
3. Chaque candidat est décrit par un vecteur qui combine descripteurs HOG et mesures géométriques.
4. Un modèle de machine learning note les candidats et retient le meilleur.

## Les quatre étapes en détail

### 1. Prétraitement

Cette étape stabilise la taille des objets dans l'image et allège les calculs suivants :

- l'image est redimensionnée à 800 pixels de large, ratio d'aspect conservé, pour réduire le temps de calcul ;
- elle est convertie en niveaux de gris : seules les variations de luminance servent ensuite.

|                    1. Image originale                    |                       2. Image prétraitée                        |
| :------------------------------------------------------: | :--------------------------------------------------------------: |
| ![Image originale](/assets/projects/alpr/01_original.webp) | ![Image prétraitée](/assets/projects/alpr/02_preprocessed.webp) |

### 2. Génération des candidats (ROI)

Balayer toute l'image serait beaucoup trop lent. Nous générons donc un petit ensemble de régions d'intérêt (ROI) candidates, issues de trois branches complémentaires :

1. La branche principale (morphologie et Sobel) renforce le contraste local des caractères (filtre MMLPF), puis applique un filtre de Sobel vertical, un seuillage d'Otsu et une fermeture morphologique ($17 \times 3$).
2. La branche suréchantillonnée ($\times 2$) applique le même traitement à l'image agrandie deux fois, pour détecter les plaques petites ou éloignées.
3. La branche Canny détecte les contours de façon adaptative, à partir de la médiane des intensités de l'image.

> Chaque branche filtre aussitôt ses propres candidats selon leur aire ($50 \text{ px} \le \text{aire} \le 40\,000 \text{ px}$) et leur ratio d'aspect ($1.0 \le w/h \le 8.0$), ce qui élimine d'emblée les faux candidats évidents.

#### Étapes de la branche principale

<figure class="stepper" data-stepper>
<ol class="stepper__frames" role="list">
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_1_mmlpf.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_1_mmlpf.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_1_mmlpf.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Étape 1 sur 5 : filtre MMLPF" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">1</span> Filtre MMLPF. Renforce le contraste local des caractères.</p></li>
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_2_sobel_dx.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_2_sobel_dx.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_2_sobel_dx.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Étape 2 sur 5 : Sobel vertical" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">2</span> Sobel vertical. Fait ressortir les bords verticaux de l'image.</p></li>
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_3_otsu.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_3_otsu.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_3_otsu.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Étape 3 sur 5 : seuil d'Otsu" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">3</span> Seuil d'Otsu. Binarise l'image avec un seuil choisi automatiquement.</p></li>
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_4_fermeture.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_4_fermeture.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_4_fermeture.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Étape 4 sur 5 : fermeture" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">4</span> Fermeture. Une fermeture 17 × 3 relie les bords voisins en blocs.</p></li>
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_5_cca.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_5_cca.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_5_cca.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Étape 5 sur 5 : candidats" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">5</span> Candidats. Les composantes connexes deviennent des candidats, filtrés par aire et par ratio.</p></li>
</ol>
<div class="stepper__nav" role="group" aria-label="Étapes de la branche principale" hidden>
<button class="stepper__btn" type="button" aria-pressed="false"><span>1</span>Filtre MMLPF</button>
<button class="stepper__btn" type="button" aria-pressed="false"><span>2</span>Sobel vertical</button>
<button class="stepper__btn" type="button" aria-pressed="false"><span>3</span>Seuil d'Otsu</button>
<button class="stepper__btn" type="button" aria-pressed="false"><span>4</span>Fermeture</button>
<button class="stepper__btn" type="button" aria-pressed="false"><span>5</span>Candidats</button>
</div>
</figure>

#### Fusion des trois branches et dédoublonnage NMS

Les branches suréchantillonnée et Canny extraient et filtrent leurs candidats de la même manière. Les régions retenues par les trois branches sont ensuite regroupées, puis dédoublonnées par suppression non maximale (NMS, fondée sur l'IoU) pour éliminer les chevauchements.

![Candidats des trois branches, fusionnés et dédoublonnés par NMS](/assets/projects/alpr/03_candidates.webp)

### 3. Descripteur HOG et géométrie

Chaque candidat retenu est découpé, redimensionné à $64 \times 32$ pixels, puis converti en un vecteur de 293 caractéristiques :

- 288 valeurs HOG (histogramme des gradients orientés), calculées sur 32 cellules de $8 \times 8$ pixels, avec 9 orientations et une normalisation $L_2$ ;
- 5 mesures géométriques : ratio d'aspect, surface relative, position relative dans l'image (X et Y) et densité de contours.

### 4. Classification et localisation finale

Un classifieur Random Forest (`cv::ml::RTrees`) attribue un score de confiance à chaque vecteur de caractéristiques. La région au score positif le plus élevé est retenue comme plaque.

![Résultat final : la plaque détectée](/assets/projects/alpr/04_result.webp)

## De Python à C++17

Le projet s'est fait en deux temps.

### 1. Prototype Python

Un prototype en Python, avec `scikit-learn` et OpenCV, nous a permis de monter le pipeline rapidement, de valider les filtres morphologiques et d'entraîner le classifieur.

### 2. Portage C++17 et module `MyCV`

Pour atteindre les performances temps réel visées et ne plus dépendre des abstractions opaques d'OpenCV, nous avons réécrit le pipeline en C++17 et écrit notre propre module, `MyCV`, qui contient :

- une conversion en niveaux de gris en arithmétique entière pondérée ;
- une convolution de Sobel 2D avec gestion explicite de la mémoire et des bords ;
- des opérateurs géométriques natifs.

## Résultats sur UFPR-ALPR

Les trois versions sont évaluées sur le jeu de test d'UFPR-ALPR (1 440 images). La version C++17 optimisée est la meilleure sur tous les critères, avec un F1 de **0,7535**.

### Détection et temps d'inférence

| Implémentation       | Vrais positifs (TP) | Précision | Rappel | Score F1 | Temps moyen |
| :------------------- | :-----------------: | :-------: | :----: | :------: | :---------: |
| Python               |         955         |  0,8580   | 0,6632 |  0,7481  |  468,50 ms  |
| **C++17 (optimisé)** |         963         |  0,8629   | 0,6687 |  0,7535  |  402,28 ms  |
| C++17 (`MyCV`)       |         955         |  0,8504   | 0,6632 |  0,7452  |  583,67 ms  |

### Ce que montrent les mesures

- Le passage au C++17 réduit le temps de traitement de **14 %**, soit 66 ms de moins par image.
- Le prototype Python et la version C++ donnent exactement le même résultat dans **92,85 %** des cas : la réécriture est fidèle.
- La version `MyCV`, en boucles C++ simples sans instructions SIMD, est la plus lente (583,67 ms par image) : sur les convolutions, les routines vectorisées d'OpenCV (AVX2/NEON) font la différence.
- L'entraînement passe de 3 min 46 s à 2 min 48 s en C++, grâce à une meilleure parallélisation sur plusieurs cœurs (441 % d'utilisation CPU contre 201 % en Python).
