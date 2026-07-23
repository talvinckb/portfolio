---
id: irgpu
name: "IRGPU"
title: "Détection de mouvement vidéo — Portage GPU"
tagline: "Portage CPU → GPU d'un algorithme de détection de mouvement temps réel, accéléré de ×24 grâce à CUDA et 6 optimisations guidées par Nsight."
thumbnail: "/assets/projects/irgpu/example_output.gif"
stack: ["C++", "CUDA", "GStreamer", "Nsight Systems", "Nsight Compute"]
period: "4 semaines"
team: 4
github: null
demo: null
report: null
---

## Contexte & Problématique

La détection de mouvement en temps réel est une brique fondamentale des systèmes de vidéosurveillance, d'analyse de flux vidéo ou de robotique. L'objectif de ce projet était de concevoir un filtre de **soustraction d'arrière-plan** capable de fonctionner à **30 FPS ou plus** en haute résolution, sous la contrainte de s'appuyer uniquement sur **NVIDIA CUDA** et le framework multimédia **GStreamer**.

### Les Défis Techniques

- **Goulot d'étranglement CPU** : L'implémentation séquentielle C++ de référence ne dépasse pas **5.29 FPS** — bien en dessous du seuil temps réel de 30 FPS.
- **Pipeline à fort parallélisme de données** : Chaque pixel de chaque frame doit subir 5 traitements successifs indépendants, un cas d'usage idéal pour le GPU, mais dont les goulots d'étranglement (mémoire, random, morphologie) demandent une analyse fine.
- **Validation rigoureuse** : Toute optimisation CUDA doit maintenir une précision visuelle quasi-parfaite par rapport à la référence CPU (SSIM ≈ 1.0000).

---

## Vue d'ensemble du Pipeline

Le traitement s'effectue image par image selon **5 étapes séquentielles**, où chaque pixel est traité indépendamment — une architecture parfaitement adaptée à la parallélisation GPU :

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma du workflow">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Image Source</span>
    <span class="pipeline-step__sub">RGB brut</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Fond Estimé</span>
    <span class="pipeline-step__sub">Modèle K=3 réservoirs</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Masque de Mouvement</span>
    <span class="pipeline-step__sub">Norme L₁</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Ouverture Morpho.</span>
    <span class="pipeline-step__sub">Érosion + Dilatation</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Seuillage Hystérésis</span>
    <span class="pipeline-step__sub">Propagation 4-connexe</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Résultat Final</span>
    <span class="pipeline-step__sub">Coloration mouvement</span>
  </div>
</div>

---

## L'Algorithme de Détection de Mouvement

### Étape 1 — Estimation de l'Arrière-Plan

L'étape la plus complexe du pipeline. Pour chaque pixel, on maintient un ensemble de **K = 3 réservoirs de couleur** (`color` + `weight`) qui modélisent les différents fonds possibles (bruit, changements d'éclairage, etc.).

À chaque nouvelle frame, pour chaque pixel :

- Si la couleur du pixel est **proche** d'un réservoir existant (tolérance de ±10 par canal), sa couleur est mise à jour par **moyenne pondérée glissante** et son poids augmente.
- Si **aucun réservoir ne correspond**, le réservoir le plus faible est remplacé de manière **stochastique** (probabilité inversement proportionnelle à son poids).

Le fond estimé de chaque pixel est simplement la couleur du réservoir au poids le plus élevé.

### Étape 2 — Calcul du Masque de Mouvement

On mesure l'écart entre le pixel courant et le fond estimé via la norme **L₁** (moyenne des différences absolues sur R, G, B). Un score élevé indique un pixel en mouvement.

### Étape 3 — Ouverture Morphologique

Le masque brut contient du bruit (feuilles, artefacts vidéo). Une **ouverture morphologique** sur un disque de rayon R=3 élimine les faux positifs :

- **Érosion** : supprime les pixels isolés.
- **Dilatation** : restaure la taille des vrais objets détectés.

### Étape 4 — Seuillage par Hystérésis

Garantit la cohérence spatiale : les pixels avec un score fort (> 45) sont des **graines sûres**. Les pixels faibles (> 20) ne sont conservés que s'ils sont **adjacents à un pixel fort** (propagation par 4-connexité), jusqu'à convergence globale.

### Étape 5 — Coloration du Mouvement

Les pixels validés sont colorés en rouge transparent sur l'image originale, permettant de visualiser le mouvement tout en conservant l'image sous-jacente.

---

## Du C++ Séquentiel au GPU : Une Démarche Guidée par le Profiling

L'optimisation ne s'est pas faite à l'aveugle — chaque décision a été justifiée par des mesures précises via **NVIDIA Nsight Systems** (analyse temporelle globale) et **NVIDIA Nsight Compute** (analyse fine des noyaux GPU).

### Baseline : Implémentation C++ (CPU)

L'implémentation séquentielle de référence traite les pixels un à un dans deux boucles imbriquées. Elle sert de **vérité terrain** pour valider la précision de chaque version GPU (SSIM = 1.0000).

| Implémentation    | Temps (s) |   FPS    | Speedup |
| :---------------- | :-------: | :------: | :-----: |
| **C++ Référence** | 616.78 s  | 5.29 FPS |  1.00×  |

5.29 FPS — le traitement vidéo en direct est impossible.

### Portage Naïf CUDA (×9.24)

La première version CUDA consiste en une **transposition directe** : chaque pixel est assigné à un thread GPU (grille 2D, blocs 16×16). Sans aucune optimisation, le passage au GPU franchit immédiatement le cap des 30 FPS.

| Implémentation | Temps (s) |    FPS    |  Speedup  |  SSIM  |
| :------------- | :-------: | :-------: | :-------: | :----: |
| C++ Référence  | 616.78 s  | 5.29 FPS  |   1.00×   | 1.0000 |
| **CUDA Naïf**  |  52.72 s  | 48.92 FPS | **9.24×** | 0.9951 |

Des goulots d'étranglement majeurs subsistent, que le profiling va révéler.

---

### Les 6 Optimisations Majeures

#### Opti 1 & 2 — Mémoire Paresseuse + Passage au `float` (×18)

**Opti 1 :** La version initiale réallouait les buffers GPU à chaque frame. Avec la **Lazy Initialization**, une seule allocation mémoire au démarrage, et seulement 2 transferts PCIe par frame (image entrante → GPU, résultat → CPU).

**Opti 2 :** Nsight Compute a émis un avertissement explicite sur l'utilisation de `double` sur GPU grand public. Le passage à `float` avec `lroundf()` accélère significativement les calculs flottants.

![Avertissement Nsight Compute sur le type double](/assets/projects/irgpu/nsight-warning-float-bis.png)

| Implémentation            |    FPS    |  Speedup   |
| :------------------------ | :-------: | :--------: |
| CUDA Naïf                 | 48.92 FPS |   9.24×    |
| **CUDA Lazy Mem + Float** | 95.43 FPS | **18.03×** |

#### Opti 3 — Remplacement de `cuRAND` par un LCG léger (×18.7)

Nsight Systems révèle que `cuRAND` alloue une structure de **48 octets par pixel** en VRAM pour son état interne : sur une vidéo HD 1080p, cela représente ~95 Mo uniquement pour le générateur aléatoire !

![Overhead cuRAND dans Nsight Systems](/assets/projects/irgpu/nsight-curand.png)

| Résolution | Taille `curandState` |
| :--------- | :------------------: |
| 320×240    |       ~3.5 Mo        |
| 1920×1080  |       ~94.9 Mo       |

|                   Allocation cuRAND (320×240)                    |                          Allocation cuRAND (1080p)                          |
| :--------------------------------------------------------------: | :-------------------------------------------------------------------------: |
| ![cuRAND 320x240](/assets/projects/irgpu/cudamalloc-video03.png) | ![cuRAND 1080p](/assets/projects/irgpu/cudamalloc-3630-172488409_large.png) |

**Solution :** Un **Linear Congruential Generator (LCG)** calculé à la volée à partir de l'index du pixel et du numéro de frame — zéro octet de VRAM supplémentaire.

|                        Throughput `cuRAND`                         |                          Throughput `fast_rand`                          |
| :----------------------------------------------------------------: | :----------------------------------------------------------------------: |
| ![Throughput cuRAND](/assets/projects/irgpu/throughput-curand.png) | ![Throughput fast_rand](/assets/projects/irgpu/throughput-fast-rand.png) |

#### Opti 4 — Hystérésis en Shared Memory (×23.5)

La propagation par hystérésis nécessite plusieurs passes jusqu'à convergence. Sans optimisation, chaque itération déclenche des synchronisations CPU/GPU et une saturation de la bande passante VRAM.

![Saturation des transferts mémoire sans Shared Memory](/assets/projects/irgpu/nsync-no-shared-memory-wrapped.png)

**Solution :** Tuilage 16×16 en **Shared Memory** avec un halo de +1 pixel. La propagation des pixels forts aux pixels faibles voisins s'effectue localement, sans accès VRAM.

|                                Analyse VRAM avant                                 |                                Analyse VRAM après                                |
| :-------------------------------------------------------------------------------: | :------------------------------------------------------------------------------: |
| ![Avant Shared Memory](/assets/projects/irgpu/hysteresis-mem-analysis-before.png) | ![Après Shared Memory](/assets/projects/irgpu/hysteresis-mem-analysis-after.png) |

Résultat : les requêtes VRAM sont divisées par 8 (de 139 K à 17.7 K par itération), soit **+26% de vitesse pure** sur ce seul noyau.

#### Opti 5 — Ouverture Morphologique Tuilée (×24.1)

L'érosion et la dilatation lisaient 29 pixels voisins par thread directement en VRAM globale. Avec le tuilage en **Shared Memory** (halo 2×R) et les offsets du disque en **Constant Memory**, le trafic VRAM est divisé par deux (10.69 → 5.44 Go/s).

#### Opti 6 — Géométrie des Blocs 32×8 (×24.5)

Nsight Compute révèle qu'un bloc **32×8** (256 threads) s'aligne parfaitement avec la taille d'un warp CUDA (32 threads) dans la direction horizontale, maximisant la **coalescence mémoire** lors des accès aux lignes d'image.

![Analyse de la géométrie des blocs Nsight Compute](/assets/projects/irgpu/analyse-blocks-32x8.png)

---

### Analyse des Motifs de Conception CUDA (Design Patterns)

Dans le cadre de l'architecture CUDA du projet, nous avons analysé la pertinence des principaux motifs de conception parallèles :

- **Stencil Pattern** ✅ : Utilisé intensivement pour l'ouverture morphologique et l'hystérésis (voisinage local en Shared Memory).
- **Reduction Pattern** ❌ : Le flag de convergence de l'hystérésis (écriture idempotente `false → true`) ne crée aucune race condition — pas besoin d'`atomicOr`.
- **Scan Pattern** ❌ : Inadapté au traitement local par pixel.

---

## Résultats & Benchmarks

### Tableau Récapitulatif

| Implémentation               |  Temps (s)  |      FPS       |  Speedup   |    SSIM    |
| :--------------------------- | :---------: | :------------: | :--------: | :--------: |
| C++ Référence                |  616.78 s   |    5.29 FPS    |   1.00×    |   1.0000   |
| CUDA Naïf                    |   52.72 s   |   48.92 FPS    |   9.24×    |   0.9951   |
| CUDA Lazy Mem + Float        |   18.18 s   |   95.43 FPS    |   18.03×   |   0.9950   |
| CUDA Fast Random             |   17.01 s   |   98.96 FPS    |   18.70×   |   0.9950   |
| CUDA Hystérésis Shared Mem   |   10.80 s   |   124.34 FPS   |   23.49×   |   0.9949   |
| CUDA Tiling Opening          |   10.65 s   |   127.57 FPS   |   24.10×   |   0.9949   |
| **CUDA Finale (32×8 Blocs)** | **10.56 s** | **129.51 FPS** | **24.47×** | **0.9949** |

### Comparaison Globale des Performances

![Comparaison du débit FPS sur l'ensemble des vidéos du dataset](/assets/projects/irgpu/all_videos_fps_comparison.png)

De **5.29 FPS** à **129.51 FPS** : un gain de **×24.47** avec une précision visuelle quasi-parfaite (SSIM = 0.9949), prouvant que chaque étape d'optimisation — de la mémoire au générateur aléatoire — contribue au résultat final.
