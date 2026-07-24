---
id: pogl
name: "POGL"
title: "Simulation de fluide temps réel"
tagline: "Moteur de simulation SPH 3D temps réel avec 75 000+ particules à 60 FPS — physique GPU complète via Compute Shaders et rendu de surface par Screen-Space Fluid Rendering."
thumbnail: "/assets/projects/pogl/thumbnail.png"
stack: ["C++20", "OpenGL 4.6", "GLSL", "Compute Shaders", "CMake", "Dear ImGui"]
period: "1 mois"
team: 2
github: null
demo: null
report: null
---

## Contexte & Objectifs

Ce projet est un moteur de **simulation de fluide 3D en temps réel** développé en **C++20** et **OpenGL 4.6 Core Profile**, réalisé dans le cadre du cours de Programmation Orientée Objet et OpenGL (POGL) à l'EPITA.

L'objectif était de concevoir un système capable d'exécuter en parallèle deux piliers techniques de l'informatique graphique moderne :

- **Simulation physique particulaire GPU** via la méthode *Smoothed Particle Hydrodynamics* (SPH), entièrement calculée par des **Compute Shaders**, accélérée par un **Hachage Spatial 3D** et un **Tri Bitonic GPU** en $O(N \log^2 N)$.
- **Rendu de surface fluide en espace écran** (SSFR — *Screen-Space Fluid Rendering*), un pipeline multi-passes transformant un nuage de particules discrètes en une surface continue d'eau réaliste, incorporant filtrage bilatéral, réfraction (Loi de Beer-Lambert) et réflexions de Fresnel.

![Simulation SPH 3D temps réel avec 75 000 particules à 60 FPS](/assets/projects/pogl/demo.gif)

---

## Architecture : Data-Oriented Design GPU

La conception du moteur repose sur le paradigme **Data-Oriented Design (DOD)** : toutes les données des particules résident en **VRAM** sous forme de *Shader Storage Buffer Objects* (SSBOs) en `std430`, annulant tout transfert PCIe superflu entre le CPU et le GPU à chaque frame.

Le pipeline suit deux boucles distinctes qui s'enchaînent chaque frame :

| Phase | Responsabilité | Outil |
| :---- | :------------- | :---- |
| **CPU** | Gestion des entrées, paramètres (SimSettings) | C++20, Dear ImGui |
| **GPU — Physique** | 7 passes Compute Shaders | GLSL 4.60 |
| **GPU — Rendu** | 5 passes Graphics Shaders (SSFR) | GLSL 4.60 |

Les 8 SSBOs alloués en VRAM maintiennent positions, vitesses, densités, hachage spatial et buffers de rendu — sans jamais repasser par le CPU durant la simulation.

---

## Simulation Physique SPH sur GPU

La méthode **SPH** est une formulation *lagrangienne* des équations de Navier-Stokes : le fluide est représenté par des particules discrètes dont les propriétés (densité, pression, viscosité) sont estimées par interpolation pondérée sur leurs voisines via des **noyaux de lissage**.

### Densité & Pression

La densité locale $\rho_i$ d'une particule est la somme des contributions de ses voisines $j$ dans un rayon $h$ :

$$\rho_i = \sum_{j} W_{\text{spiky2}}(\|\mathbf{r}_i - \mathbf{r}_j\|, h)$$

Une densité secondaire à très courte portée $\rho_{\text{near}, i}$ (noyau *Spiky Power 3*) repousse fortement les particules trop proches, évitant leur regroupement excessif. La pression découle directement de l'écart à la densité cible $\rho_0$ :

$$P_i = k \cdot (\rho_i - \rho_0), \qquad P_{\text{near}, i} = k_{\text{near}} \cdot \rho_{\text{near}, i}$$

### Forces & Intégration

Les forces de pression et de viscosité sont appliquées de manière **symétrique** (3ème loi de Newton) :

$$\mathbf{F}_{\text{pression}, i} = -\sum_{j} \frac{P_i + P_j}{2 \rho_j} \nabla W_{\text{spiky2}}(\|\mathbf{r}_{ij}\|, h) \cdot \hat{\mathbf{r}}_{ij}$$

$$\mathbf{F}_{\text{viscosité}, i} = \mu \sum_{j} (\mathbf{v}_j - \mathbf{v}_i) \cdot W_{\text{poly6}}(\|\mathbf{r}_{ij}\|, h)$$

![Cartes de densité SPH et comportement des noyaux de lissage](/assets/projects/pogl/density.png)

---

### Accélération par Hachage Spatial & Tri Bitonic GPU

Sans optimisation, la recherche de voisins est en $O(N^2)$, rédhibitoire pour 75 000 particules. Le domaine 3D est subdivisé en une grille régulière (cellules de taille $h$) pour ramener la recherche à $O(1)$.

**Pipeline d'accélération (3 passes Compute)** :

1. **Hachage Spatial** : Chaque particule calcule un hash de sa cellule 3D $\lfloor \mathbf{P}/h \rfloor$ par une fonction de dispersion à coefficients premiers.
2. **Tri Bitonic GPU** : Les paires `(particuleIndex, cellKey)` sont triées en parallèle sur GPU en $O(\log^2 N)$ étapes — aucun transfert CPU requis.
3. **Table des Indices de Début** : Une passe rapide identifie le premier indice de chaque cellule dans le tableau trié. Chaque particule n'explore alors que ses **27 cellules 3D adjacentes**.

![Évolution et transition du solveur SPH du domaine 2D au volume 3D](/assets/projects/pogl/2D-to-3D.gif)

---

## Pipeline de Rendu : Screen-Space Fluid Rendering (SSFR)

Rendre les particules comme de simples sphères donne un rendu discontinu. Le **Screen-Space Fluid Rendering** transforme ce nuage de points en une surface liquide continue et réaliste en **5 passes de shaders** successives.

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma du workflow">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Depth Map</span>
    <span class="pipeline-step__sub">Point Sprites (R32F)</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Bilateral Blur</span>
    <span class="pipeline-step__sub">Lissage des profils</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Normal Map</span>
    <span class="pipeline-step__sub">Reconstruction 3D</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Thickness Map</span>
    <span class="pipeline-step__sub">Beer-Lambert</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Composite</span>
    <span class="pipeline-step__sub">Fresnel + Réfraction</span>
  </div>
</div>

### Passe 1 — Carte de Profondeur Initiale

Chaque particule est émise comme un *Point Sprite*, projetée en sphère 3D dans `fluid_depth.frag`. Les fragments hors du rayon sont rejetés et la profondeur exacte $z_{\text{eye}}$ est stockée dans une texture `GL_R32F`.

![Passe 1 : carte de profondeur brute des sphères individuelles](/assets/projects/pogl/base_depth.png)

### Passe 2 — Filtrage Bilatéral Adaptatif

Un **filtre bilatéral séparable** (deux passes H/V) lisse la carte de profondeur sans flouter les contours. Les échantillons sont pondérés à la fois par leur distance spatiale et leur écart de profondeur :

$$W(i, j) = \exp\!\left(-\frac{\|\mathbf{x}_i - \mathbf{x}_j\|^2}{2 \sigma_s^2}\right) \cdot \exp\!\left(-\frac{|z_i - z_j|^2}{2 \sigma_r^2}\right)$$

![Passe 2 : carte de profondeur lissée, surface continue](/assets/projects/pogl/smoothed_depth.png)

### Passe 3 — Reconstruction des Normales en Espace Écran

À partir de la profondeur lissée $z(u, v)$, la position 3D $\mathbf{P}(u, v)$ est reconstruite par pixel. Le champ de normales est déduit par produit vectoriel des dérivées partielles :

$$\mathbf{N} = \text{normalize}\!\left( \frac{\partial \mathbf{P}}{\partial x} \times \frac{\partial \mathbf{P}}{\partial y} \right)$$

![Passe 3 : champ de normales 3D reconstruit en espace écran](/assets/projects/pogl/smoothed_normal.png)

### Passe 4 — Épaisseur & Absorption Optique (Beer-Lambert)

L'épaisseur du volume d'eau traversé est accumulée par **blending additif** (`GL_ONE, GL_ONE`). L'atténuation chromatique suit la loi de Beer-Lambert :

$$I_{\text{réfracté}} = I_{\text{scène}} \cdot \exp\!\left(-\text{épaisseur} \cdot \alpha \cdot (1 - \mathbf{C}_{\text{eau}})\right)$$

![Passe 4 : carte d'épaisseur de la masse d'eau](/assets/projects/pogl/thickness_map.png)

### Passe 5 — Composition Finale : Réfraction & Réflexions de Fresnel

La passe finale combine tous les buffers :

- **Réfraction** : Décalage UV proportionnel à la normale de surface ($\text{UV}_{\text{réfracté}} = \text{UV} + \mathbf{N}_{xy} \cdot s_{\text{réfraction}}$).
- **Réflexions de Fresnel (Schlick)** : $F(\theta) = R_0 + (1 - R_0)(1 - \cos\theta)^p$ — l'eau devient miroir à angle rasant.
- **Ciel procédural & brillance spéculaire** : Mélange selon le coefficient de Fresnel entre réfraction absorbée et réflexion du ciel/soleil.

| Passe 5 : Réflexion & Réfraction Globales | Passe 5 : Réflexions Spéculaires du Soleil |
| :---------------------------------------: | :----------------------------------------: |
| ![Passe 5 : Réflexion et réfraction de Fresnel](/assets/projects/pogl/reflection.png) | ![Passe 5 : Réflexions spéculaires du soleil](/assets/projects/pogl/sun-reflection.png) |

---

## Interface & Contrôles Interactifs

L'application intègre **Dear ImGui** pour permettre un ajustement dynamique de tous les paramètres en cours d'exécution : nombre de particules, gravité $g$, rigidité $k$, viscosité $\mu$, couleur de l'eau, absorption, puissance de Fresnel et rayon de flou bilatéral.

La caméra est **orbitale** (clic gauche + glisser) avec zoom à la molette.

---

## Optimisations GPU

- **Workgroup de 256 threads** par groupe Compute, optimisé pour l'occupation des SM NVIDIA (Warps) et AMD (Wavefronts).
- **Barrières mémoire explicites** (`GL_SHADER_STORAGE_BARRIER_BIT`) garantissant la cohérence des données entre les passes de physique et les passes de rendu.
- **FBOs redimensionnables** s'adaptant dynamiquement aux redimensionnements fenêtre sans réallocation inutile.
- Zéro transfert CPU ↔ GPU pendant la boucle de simulation : toute la physique est calculée et consommée entièrement en VRAM.
