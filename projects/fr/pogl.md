---
id: pogl
name: "POGL"
title: "Simulation de fluide temps réel"
tagline: "Moteur SPH 3D temps réel : plus de 75 000 particules à 60 FPS, une physique en compute shaders et un rendu de surface en espace écran (SSFR)."
thumbnail: "/assets/projects/pogl/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/pogl/thumbnail-16x9-light.webp"
stack: ["C++20", "OpenGL 4.6", "GLSL", "Compute Shaders", "CMake", "Dear ImGui"]
period: "1 mois"
team: 2
github: "https://github.com/talvinckb/OpenGL-Water-Simulation"
demo: null
report: null
brief:
  problem: "Simuler et rendre un fluide 3D crédible en temps réel."
  approach: "Physique SPH entièrement sur GPU en compute shaders (hachage spatial, tri bitonique), rendu de surface SSFR en cinq passes."
  result: "Plus de 75 000 particules à 60 FPS, sans aucun transfert CPU ↔ GPU pendant la simulation."
---

## Un moteur de fluide 3D temps réel

Nous avons développé ce moteur en binôme, en C++20 et OpenGL 4.6 (core profile), pour le cours de programmation orientée objet et OpenGL (POGL) de l'EPITA. Il simule et affiche **plus de 75 000 particules à 60 FPS**.

Notre objectif était de faire tourner ensemble deux briques de l'informatique graphique :

- la physique, par la méthode SPH (_smoothed particle hydrodynamics_), calculée entièrement en compute shaders et accélérée par un hachage spatial 3D et un tri bitonique sur GPU en $O(N \log^2 N)$ ;
- le rendu de surface en espace écran (SSFR, _screen-space fluid rendering_), un pipeline en plusieurs passes qui transforme le nuage de particules en une surface d'eau continue, avec filtrage bilatéral, réfraction atténuée selon la loi de Beer-Lambert et réflexions de Fresnel.

## Toutes les données restent en VRAM

Le moteur suit une conception orientée données (_data-oriented design_) : toutes les données des particules résident en VRAM, dans des _shader storage buffer objects_ (SSBO) au format `std430`. Ce choix évite tout transfert PCIe superflu entre le CPU et le GPU à chaque frame.

Deux boucles distinctes s'enchaînent à chaque frame :

| Phase          | Responsabilité                                | Outil             |
| :------------- | :-------------------------------------------- | :---------------- |
| CPU            | Gestion des entrées, paramètres (SimSettings) | C++20, Dear ImGui |
| GPU (physique) | 7 passes de compute shaders                   | GLSL 4.60         |
| GPU (rendu)    | 5 passes de shaders graphiques (SSFR)         | GLSL 4.60         |

Les huit SSBO alloués en VRAM contiennent les positions, les vitesses, les densités, le hachage spatial et les buffers de rendu. Ils ne repassent jamais par le CPU : **aucun transfert CPU ↔ GPU pendant la simulation**.

## Physique SPH en compute shaders

La méthode SPH est une formulation lagrangienne des équations de Navier-Stokes : le fluide est un ensemble de particules dont la densité, la pression et la viscosité sont estimées par interpolation pondérée sur leurs voisines, à l'aide de noyaux de lissage.

### Densité et pression

La densité locale $\rho_i$ d'une particule est la somme des contributions de ses voisines $j$ dans un rayon $h$ :

$$\rho_i = \sum_{j} W_{\text{spiky2}}(\|\mathbf{r}_i - \mathbf{r}_j\|, h)$$

Une seconde densité à très courte portée, $\rho_{\text{near}, i}$ (noyau _Spiky Power 3_), repousse fortement les particules trop proches et évite qu'elles s'agglutinent. La pression découle de l'écart à la densité cible $\rho_0$ :

$$P_i = k \cdot (\rho_i - \rho_0), \qquad P_{\text{near}, i} = k_{\text{near}} \cdot \rho_{\text{near}, i}$$

### Forces et intégration

Les forces de pression et de viscosité sont appliquées de façon symétrique (troisième loi de Newton) :

$$\mathbf{F}_{\text{pression}, i} = -\sum_{j} \frac{P_i + P_j}{2 \rho_j} \nabla W_{\text{spiky2}}(\|\mathbf{r}_{ij}\|, h) \cdot \hat{\mathbf{r}}_{ij}$$

$$\mathbf{F}_{\text{viscosité}, i} = \mu \sum_{j} (\mathbf{v}_j - \mathbf{v}_i) \cdot W_{\text{poly6}}(\|\mathbf{r}_{ij}\|, h)$$

![Cartes de densité SPH et comportement des noyaux de lissage](/assets/projects/pogl/density.webp)

### Recherche de voisins : hachage spatial et tri bitonique

Naïve, la recherche de voisins coûte $O(N^2)$, rédhibitoire pour 75 000 particules. Nous avons donc découpé le domaine 3D en une grille régulière (cellules de taille $h$), ce qui ramène la recherche à $O(1)$. Elle tient en trois passes de calcul :

1. Chaque particule calcule le hash de sa cellule 3D $\lfloor \mathbf{P}/h \rfloor$ avec une fonction de dispersion à coefficients premiers.
2. Un tri bitonique trie en parallèle les paires `(particuleIndex, cellKey)` sur le GPU, en $O(\log^2 N)$ étapes et sans aucun transfert vers le CPU.
3. Une dernière passe repère le premier indice de chaque cellule dans le tableau trié. Chaque particule n'explore alors que 27 cellules : la sienne et ses 26 voisines.

<video preload="none" poster="/assets/projects/pogl/fluid_2d_to_3d_transformation-poster.webp" controls src="/assets/projects/pogl/fluid_2d_to_3d_transformation.mp4" loop muted playsinline class="project-video-demo" title="Évolution et transition du solveur SPH du domaine 2D au volume 3D"></video>

## Rendu de surface en espace écran (SSFR)

Affichées comme de simples sphères, les particules donnent un rendu discontinu. Le _screen-space fluid rendering_ transforme ce nuage de points en une surface liquide continue, en **cinq passes de shaders** successives.

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma du workflow">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Profondeur</span>
    <span class="pipeline-step__sub">Point sprites (R32F)</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Flou bilatéral</span>
    <span class="pipeline-step__sub">Lissage des profils</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Normales</span>
    <span class="pipeline-step__sub">Reconstruction 3D</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Épaisseur</span>
    <span class="pipeline-step__sub">Beer-Lambert</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Composition</span>
    <span class="pipeline-step__sub">Fresnel et réfraction</span>
  </div>
</div>

### Passe 1 : carte de profondeur

Chaque particule est émise comme un _point sprite_, puis projetée en sphère 3D dans `fluid_depth.frag` : les fragments hors du rayon sont rejetés et la profondeur exacte $z_{\text{eye}}$ est écrite dans une texture `GL_R32F`.

![Passe 1 : carte de profondeur brute des sphères individuelles](/assets/projects/pogl/base_depth.webp)

### Passe 2 : filtrage bilatéral

Un filtre bilatéral séparable, en deux passes (horizontale et verticale), lisse la carte de profondeur sans flouter les contours. Chaque échantillon est pondéré à la fois par sa distance et par son écart de profondeur :

$$W(i, j) = \exp\!\left(-\frac{\|\mathbf{x}_i - \mathbf{x}_j\|^2}{2 \sigma_s^2}\right) \cdot \exp\!\left(-\frac{|z_i - z_j|^2}{2 \sigma_r^2}\right)$$

![Passe 2 : carte de profondeur lissée, surface continue](/assets/projects/pogl/smoothed_depth.webp)

### Passe 3 : normales en espace écran

La profondeur lissée $z(u, v)$ permet de reconstruire la position 3D $\mathbf{P}(u, v)$ de chaque pixel. Les normales s'obtiennent par le produit vectoriel des dérivées partielles :

$$\mathbf{N} = \text{normalize}\!\left( \frac{\partial \mathbf{P}}{\partial x} \times \frac{\partial \mathbf{P}}{\partial y} \right)$$

![Passe 3 : champ de normales reconstruit en espace écran](/assets/projects/pogl/smoothed_normal.webp)

### Passe 4 : épaisseur et absorption (Beer-Lambert)

L'épaisseur d'eau traversée est accumulée par blending additif (`GL_ONE, GL_ONE`). L'atténuation de la couleur suit la loi de Beer-Lambert :

$$I_{\text{réfracté}} = I_{\text{scène}} \cdot \exp\!\left(-\text{épaisseur} \cdot \alpha \cdot (1 - \mathbf{C}_{\text{eau}})\right)$$

![Passe 4 : carte d'épaisseur de la masse d'eau](/assets/projects/pogl/thickness_map.webp)

### Passe 5 : réfraction et réflexions de Fresnel

La dernière passe combine tous les buffers :

- la réfraction décale les UV proportionnellement à la normale de surface ($\text{UV}_{\text{réfracté}} = \text{UV} + \mathbf{N}_{xy} \cdot s_{\text{réfraction}}$) ;
- les réflexions de Fresnel suivent l'approximation de Schlick, $F(\theta) = R_0 + (1 - R_0)(1 - \cos\theta)^p$ : l'eau devient un miroir aux angles rasants ;
- le coefficient de Fresnel dose le mélange entre la réfraction atténuée et le reflet d'un ciel procédural et du soleil, avec sa brillance spéculaire.

|                    Passe 5 : réflexion et réfraction                     |                  Passe 5 : reflets spéculaires du soleil                   |
| :----------------------------------------------------------------------: | :------------------------------------------------------------------------: |
| ![Passe 5 : réflexion et réfraction de Fresnel](/assets/projects/pogl/reflection.webp) | ![Passe 5 : reflets spéculaires du soleil](/assets/projects/pogl/sun_reflection.webp) |

## Réglages en direct avec Dear ImGui

Une interface Dear ImGui permet de régler les paramètres pendant l'exécution : nombre de particules, gravité $g$, rigidité $k$, viscosité $\mu$, couleur de l'eau, absorption, puissance de Fresnel et rayon du flou bilatéral.

La caméra est orbitale (clic gauche et glisser), avec zoom à la molette.

## Détails d'implémentation GPU

- Les groupes de travail comptent 256 threads, une taille choisie pour bien occuper les GPU NVIDIA (warps) comme AMD (wavefronts).
- Des barrières mémoire explicites (`GL_SHADER_STORAGE_BARRIER_BIT`) garantissent la cohérence des données entre les passes de physique et de rendu.
- Les FBO suivent les redimensionnements de la fenêtre sans réallocation inutile.

## Démonstration en temps réel

<video preload="none" poster="/assets/projects/pogl/fluid_simulation_demo-poster.webp" controls src="/assets/projects/pogl/fluid_simulation_demo.mp4" loop muted playsinline class="project-video-demo" title="Démonstration de la simulation de fluide SPH 3D temps réel"></video>
