---
id: alpr
name: "ALPR"
title: "Reconnaissance automatique de plaques d'immatriculation"
tagline: "Système ALPR complet sans Deep Learning (Vision Classique + Machine Learning), avec benchmarks rigoureux Python vs C++."
thumbnail: "/assets/projects/alpr/04_result.png"
stack: ["Python", "C++17", "OpenCV", "Random Forest", "CMake", "Google Test"]
period: "5 semaines"
team: 2
github: null
demo: null
report: null
---

## Contexte & Problématique

La reconnaissance automatique de plaques d'immatriculation (**ALPR**) est une brique essentielle des systèmes de transport intelligents et du contrôle d'accès routier. L'objectif de ce projet était d'analyser des flux d'images haute résolution et de localiser la plaque d'immatriculation d'un véhicule avec précision, indépendamment du type de véhicule ou de l'environnement.

### Les Défis Techniques

- **Approche Sans Deep Learning** : Une contrainte majeure du projet était de réaliser l'intégralité du pipeline sans réseaux de neurones profonds (sans YOLO ou CNN lourds), en s'appuyant sur la vision par ordinateur classique et le Machine Learning léger pour garantir une parfaite explicabilité et une faible empreinte mémoire.
- **Haute résolution & Variabilité** : Traiter des images Full HD ($1920 \times 1080$) avec d'importantes variations de luminosité (plein soleil, pluie, ombres), des angles inclinés et des occultations partielles.
- **Formats de plaques complexes** : Prendre en charge aussi bien les anciennes plaques brésiliennes que les nouveaux formats Mercosul.

---

## Vue d'ensemble du Workflow

Pour résoudre ce problème de manière robuste, nous avons structuré le traitement selon un pipeline séquentiel en 4 grandes étapes :

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma du workflow">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Image Brute</span>
    <span class="pipeline-step__sub">Full HD 1080p</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Prétraitement</span>
    <span class="pipeline-step__sub">Resize & Gris</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Génération ROI</span>
    <span class="pipeline-step__sub">Filtres & Morpho</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Features HOG</span>
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
    <span class="pipeline-step__sub">Plaque Localisée</span>
  </div>
</div>

1. **Prétraitement** : Normalisation d'échelle et réduction des canaux de couleur.
2. **Génération de candidats (ROI)** : Extraction multi-échelles des zones rectangulaires à forte probabilité de contenir une plaque.
3. **Extraction de caractéristiques** : Représentation numérique de chaque candidat par un vecteur de descripteurs géométriques et HOG.
4. **Classification & Validation** : Évaluation des candidats par un modèle Machine Learning et sélection du meilleur candidat.

---

## Le Pipeline Algorithmique Étape par Étape

### 1. Prétraitement de l'Image

La première étape consiste à préparer l'image pour stabiliser les dimensions des objets et accélérer les calculs ultérieurs :

- **Redimensionnement à 800 pixels de large** en conservant le ratio d'aspect, afin de réduire le temps de calcul.
- **Conversion en niveaux de gris** afin d'éliminer la couleur et d'analyser uniquement les variations de luminance.

|                 1. Image Originale                  |                   2. Image Prétraitée                    |
| :-------------------------------------------------: | :------------------------------------------------------: |
| ![Originale](/assets/projects/alpr/01_original.png) | ![Prétraitée](/assets/projects/alpr/02_preprocessed.png) |

---

### 2. Détection & Extraction des Candidats (ROI)

Pour éviter de balayer naïvement toute l'image, qui serait extrêmement lent, nous générons un ensemble restreint de **Régions d'Intérêt (ROI)** candidates en combinant **3 branches complémentaires** :

1. **Branche Principale (Morphologie + Sobel)** : Amplification du contraste local des caractères (filtre MMLPF), suivie d'un filtre de Sobel vertical, d'un seuillage d'Otsu et d'une fermeture morphologique ($17 \times 3$).
2. **Branche Suréchantillonnée ($\times 2$)** : Application du même pipeline sur l'image agrandie à $2\times$ sa taille afin de capturer les plaques très petites ou éloignées.
3. **Branche Canny** : Détection adaptative des contours basée sur la médiane des intensités de l'image.

> **Filtrage géométrique indépendant** : Chaque branche filtre immédiatement ses propres régions candidates selon leur surface ($50 \text{ px} \le \text{aire} \le 40\,000 \text{ px}$) et leur ratio d'aspect ($1.0 \le w/h \le 8.0$) afin d'éliminer d'emblée les faux candidats évidents.

#### Étapes de la Branche Principale :

|                               1 : Filtre MMLPF                                |                                2 : Sobel Vertical                                |
| :---------------------------------------------------------------------------: | :------------------------------------------------------------------------------: |
| ![MMLPF Base](/assets/projects/alpr/intermediate_steps/base/step_1_mmlpf.png) | ![Sobel Base](/assets/projects/alpr/intermediate_steps/base/step_2_sobel_dx.png) |

|                              3 : Seuil d'Otsu                               |                                     4 : Fermeture                                     |
| :-------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------: |
| ![Otsu Base](/assets/projects/alpr/intermediate_steps/base/step_3_otsu.png) | ![Fermeture Base](/assets/projects/alpr/intermediate_steps/base/step_4_fermeture.png) |

|                          5 : Candidats extraits                           |
| :-----------------------------------------------------------------------: |
| ![CCA Base](/assets/projects/alpr/intermediate_steps/base/step_5_cca.png) |

#### Fusion des 3 branches & Dédoublonnage NMS

De la même manière, la **Branche Suréchantillonnée ($\times 2$)** et la **Branche Canny** extraient et filtrent leurs propres candidats. L'ensemble des régions retenues par les 3 branches est ensuite regroupé puis dédoublonné via une suppression non-maximale (**NMS** basée sur l'IoU) pour éliminer les chevauchements.

![Candidats fusionnés (3 branches) et dédoublonnés via NMS](/assets/projects/alpr/03_candidates.png)

---

### 3. Signature Numérique (Descripteur HOG & Geométrie)

Chaque patch candidat retenu est découpé et redimensionné à une taille fixe de **$64 \times 32$ pixels**, puis converti en un vecteur de **293 caractéristiques** :

- **Descripteur HOG (288D)** : Histogramme des gradients orientés calculé sur 32 cellules de $8 \times 8$ pixels avec 9 bins d'orientation et normalisation $L_2$.
- **Métriques géométriques (5D)** : Ratio d'aspect, surface relative, position relative dans l'image (X/Y) et densité de contours.

---

### 4. Classification & Localisation Finale

Chaque vecteur de caractéristiques est soumis à un classifieur **Random Forest** (`cv::ml::RTrees`). Le modèle attribue un score de confiance à chaque candidat et la région avec le score positif le plus élevé est retenue comme plaque finale.

![Résultat final de la détection de plaque](/assets/projects/alpr/04_result.png)

---

## Démarche d'Ingénierie : Du Prototype Python au C++17

Le projet a évolué en deux étapes majeures :

### 1. Prototype Python (PoC)

Permet de prototyper rapidement le pipeline avec `scikit-learn` et OpenCV Python, de valider les filtres morphologiques et d'entraîner le modèle de classification.

### 2. Portage C++17 & Module Personnalisé `MyCV`

Afin d'atteindre les performances temps réel requises et de s'affranchir des abstractions opaques d'OpenCV, nous avons réécrit le pipeline en **C++17** et conçu un module sur-mesure `MyCV` comprenant :

- **Conversion niveaux de gris dédiée** avec arithmétique entière pondérée.
- **Convolution Sobel 2D personnalisée** avec gestion explicite de la mémoire et des bords.
- **Opérateurs géométriques natifs**.

---

## Résultats & Benchmarks

Évaluation rigoureuse réalisée sur le jeu de test du dataset **UFPR-ALPR** (1 440 images de test) :

### Performances d'Inférence

| Implémentation       | Vrais Positifs (TP) | Précision  |   Rappel   |  F1-Score  |  Temps moyen  |
| :------------------- | :-----------------: | :--------: | :--------: | :--------: | :-----------: |
| **Python**           |         955         |   0.8580   |   0.6632   |   0.7481   |   468.50 ms   |
| **C++17 (Optimisé)** |       **963**       | **0.8629** | **0.6687** | **0.7535** | **402.28 ms** |
| **C++17 (`MyCV`)**   |         955         |   0.8504   |   0.6632   |   0.7452   |   583.67 ms   |

### Enseignements Clés des Benchmarks

- **Gain de vitesse** : Le passage à C++17 réduit le temps de traitement de **14%** (-66 ms par image).
- **Match parfait à 92.85%** entre le prototype Python et l'implémentation C++, confirmant la fidélité de la réécriture.
- **Impact de l'optimisation SIMD** : La version `MyCV` (écrite en boucles C++ basiques sans instructions SIMD) montre l'efficacité des routines vectorisées (AVX2/NEON) d'OpenCV pour les convolutions.
- **Entraînement ML** : Temps d'apprentissage réduit de **3m46s à 2m48s** grâce à une meilleure parallélisation multi-cœurs en C++ (441% CPU usage vs 201% en Python).
