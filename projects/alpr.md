---
id: alpr
name: "ALPR"
title: "Reconnaissance automatique de plaques d'immatriculation"
tagline: "Système ALPR complet comparant une approche classique et Machine Learning, avec benchmarks rigoureux Python vs C++."
thumbnail: "/assets/projects/alpr/04_result.png"
stack: ["Python", "C++17", "OpenCV", "Random Forest", "CMake", "Google Test"]
period: "5 semaines"
team: 2
github: null
demo: null
report: null
---

## Contexte & Démarche d'Ingénierie

Le système **ALPR** (_Automatic License Plate Recognition_) vise à localiser et classifier les plaques d'immatriculation automobiles dans des images naturelles haute résolution avec des conditions d'éclairage, d'angle et d'environnement très variées.

Le projet a suivi une démarche d'ingénierie progressive en 3 étapes :

1. **Prototype Python (PoC)** — Conception rapide du pipeline de vision par ordinateur : filtres de candidats, descripteur HOG, classifieur Random Forest avec `scikit-learn` / OpenCV.
2. **Portage en C++17** — Réécriture intégrale pour déploiement temps réel. Maximise l'usage CPU et réduit la latence d'inférence.
3. **Module `MyCV`** — Réécriture manuelle des briques clés (conversion couleur, Sobel, tracé géométrique) pour maîtriser le coût algorithmique élémentaire et s'affranchir des abstractions d'OpenCV.

---

## Dataset : UFPR-ALPR

Le projet s'appuie sur le jeu de données **UFPR-ALPR** (_University Federal of Paraná_) :

- **4 500 images** Full HD 1920×1080 extraites de 150 séquences vidéo.
- **Variété de véhicules** : voitures, motos, bus, camions.
- **Conditions exigeantes** : plein soleil, ombres, pluie, angles inclinés, occultations partielles.
- **Formats de plaques** : brésiliennes traditionnelles et Mercosul.

---

## Résultats & Benchmarks

### Métriques de Détection (Dataset de Test — 1 440 images)

| Métrique | Python | C++ | C++ `(MyCV)` |
| :--- | :---: | :---: | :---: |
| **Vrais Positifs (TP)** | 955 | **963** | 955 |
| **Faux Positifs (FP)** | 158 | **153** | 168 |
| **Précision** | 0.8580 | **0.8629** | 0.8504 |
| **Rappel** | 0.6632 | **0.6687** | 0.6632 |
| **F1-Score** | 0.7481 | **0.7535** | 0.7452 |
| **Mean IoU** | 0.6507 | **0.6518** | 0.6510 |
| **Temps moyen (ms/img)** | 468.50 ms | **402.28 ms** | 583.67 ms |

### Comparaison d'Entraînement

| Implémentation | Durée totale | Utilisation CPU |
| :--- | :---: | :---: |
| **Python** | 3m 46s | 201% |
| **C++** | **2m 48s** | **441%** |
| **C++ `(MyCV)`** | 7m 02s | 306% |

### Analyse

- **C++ optimisé** capture **8 plaques supplémentaires** (TP=963 vs 955), grâce aux légères différences d'arrondi numérique des routines de convolution d'OpenCV C++, et réduit la latence de **14%** (402 ms vs 469 ms).
- **`MyCV`** préserve exactement la fidélité mathématique du prototype Python (TP=955 identiques), mais révèle le coût des boucles sans vectorisation SIMD : +181 ms/image vs C++ natif, illustrant l'efficacité d'OpenCV (AVX2/NEON, multi-threading interne).
- **92.85% des prédictions C++ sont identiques** à Python image par image, validant la correction du portage.

---

## Pipeline Algorithmique

| 1. Image Originale | 2. Prétraitement |
| :---: | :---: |
| ![Originale](/assets/projects/alpr/01_original.png) | ![Prétraitée](/assets/projects/alpr/02_preprocessed.png) |
| **3. Zones Candidates (ROI)** | **4. Résultat de la Classification** |
| ![Candidats](/assets/projects/alpr/03_candidates.png) | ![Résultat](/assets/projects/alpr/04_result.png) |

### Étape 1 — Prétraitement

L'image est redimensionnée à **800 px de large** (ratio conservé) puis convertie en niveaux de gris — par `cv::cvtColor` en standard, ou par la formule entière pondérée `MyCV` :
$$\text{Gray} = \frac{114 \times B + 587 \times G + 299 \times R + 500}{1000}$$

### Étape 2 — Génération de Candidats ROI (3 branches)

Pour maximiser le rappel, trois branches parallèles extraient les régions candidates :

- **Branche principale** : Filtre MMLPF (amplification du contraste local des caractères via Top-Hat et Black-Hat morphologiques) → Sobel vertical → Otsu → Fermeture morphologique (17×3) → CCA.
  $$\text{MMLPF} = \text{Gray} + \text{TopHat} - \text{BlackHat}$$
- **Branche ×2** : Même pipeline sur l'image upscalée 2×, pour capturer les plaques distantes et petites.
- **Branche Canny** : Détection de contours avec seuils adaptatifs ($0.67 \times$ et $1.33 \times$ la médiane des pixels) → fermeture → CCA.

Les candidats des 3 branches sont fusionnés via **NMS (IoU > 0.5)** et filtrés géométriquement (surface : 50–40 000 px, ratio : 1.0–8.0).

### Étape 3 — Extraction de Caractéristiques

Chaque patch candidat (64×32 px) est décrit par **293 features** :
- **HOG (288D)** : gradients orientés, 32 cellules de 8×8 px, 9 bins, normalisation $L_2$.
- **Statistiques (5D)** : ratio d'aspect, surface relative, position X/Y, densité de contours Canny.

### Étape 4 — Classification Random Forest

Un **Random Forest** (`cv::ml::RTrees`) sélectionne le candidat avec le score de confiance le plus élevé. Une détection est validée si $\text{IoU} \ge 0.30$ avec la vérité terrain.

---

## Galerie Visuelle des Étapes Intermédiaires

### Branche Principale (Base Pipeline)

| Step 1 : Filtre MMLPF | Step 2 : Sobel Vertical ($dx=1, dy=0$) |
| :---: | :---: |
| ![MMLPF Base](/assets/projects/alpr/intermediate_steps/base/step_1_mmlpf.png) | ![Sobel Base](/assets/projects/alpr/intermediate_steps/base/step_2_sobel_dx.png) |

| Step 3 : Seuillage d'Otsu | Step 4 : Fermeture Morphologique (17×3) |
| :---: | :---: |
| ![Otsu Base](/assets/projects/alpr/intermediate_steps/base/step_3_otsu.png) | ![Fermeture Base](/assets/projects/alpr/intermediate_steps/base/step_4_fermeture.png) |

| Step 5 : Composantes Connexes (CCA) | |
| :---: | :---: |
| ![CCA Base](/assets/projects/alpr/intermediate_steps/base/step_5_cca.png) | |

### Branche Canny Edges

| Step 1 : Détection de Contours Canny | Step 2 : Fermeture Morphologique | Step 3 : Contours Extraits |
| :---: | :---: | :---: |
| ![Canny Step 1](/assets/projects/alpr/intermediate_steps/canny/step_1_canny.png) | ![Canny Step 2](/assets/projects/alpr/intermediate_steps/canny/step_2_fermeture_canny.png) | ![Canny Step 3](/assets/projects/alpr/intermediate_steps/canny/step_3_contours_canny.png) |

---

## Focus Technique : Module `MyCV`

Afin de démontrer la maîtrise des algorithmes de bas niveau, trois opérateurs ont été réimplémentés manuellement sans dépendance aux routines optimisées d'OpenCV :

1. **`mycv::convert_to_grayscale`** — Conversion BGR→Gris par parcours direct des pointeurs de lignes, calcul entier pur (pas de virgule flottante).

2. **`mycv::sobel`** — Convolution 2D complète avec gestion de bord (_border replicate_), noyaux 3×3 :
   $$K_x = \begin{bmatrix} -1 & 0 & 1 \\\\ -2 & 0 & 2 \\\\ -1 & 0 & 1 \end{bmatrix} \qquad K_y = \begin{bmatrix} -1 & -2 & -1 \\\\ 0 & 0 & 0 \\\\ 1 & 2 & 1 \end{bmatrix}$$

3. **`mycv::rectangle`** — Dessin d'encadrement par manipulation mémoire directe des canaux BGR, avec épaisseur paramétrable.
