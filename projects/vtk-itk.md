---
id: vtk-itk
name: "VTK-ITK"
title: "Recalage & Suivi Longitudinal de Tumeur Cérébrale"
tagline: "Pipeline complet d'alignement 3D d'IRMs cérébraux (ITK) et de segmentation tumorale avec visualisation interactive multi-vues (VTK + PyQt6) — quantification de l'évolution volumétrique d'un gliome."
thumbnail: "/assets/projects/vtk-itk/render-3d.jpg"
stack: ["Python", "ITK", "VTK", "PyQt6", "Matplotlib"]
period: "3 semaines"
team: 4
github: "https://github.com/Axthauvin/vtk-itk-project"
demo: null
report: null
---

## Contexte & Objectifs

Le suivi longitudinal des **gliomes et glioblastomes cérébraux** repose sur la comparaison temporelle de scanners IRM réalisés à plusieurs mois d'intervalle. Ce projet fournit un pipeline complet de traitement et de visualisation 3D permettant :

- **D'aligner géométriquement (recalage 3D)** deux volumes IRM d'un même patient pour compenser les variations de position de la tête entre deux séances.
- **D'isoler et segmenter la masse tumorale** avant et après recalage, sur les deux acquisitions.
- **De calculer l'évolution volumétrique précise** de la tumeur (en $\text{mm}^3$ et $\text{cm}^3$) pour quantifier une régression ou une progression.
- **De visualiser en 2D et 3D** la superposition exacte des structures anatomiques et tumorales.

Le projet exploite deux acquisitions IRM 3D au format **NRRD** :
`case6_gre1.nrrd` (scan initial — image fixe) et `case6_gre2.nrrd` (scan de suivi — image mobile à recaler).

---

## Interface Graphique (PyQt6 + VTK)

L'application est construite sous **PyQt6** avec un thème sombre médical *Deep Slate*. Elle est structurée en deux écrans principaux.

### Tableau de Bord de Résultats

Une fois les algorithmes exécutés en arrière-plan via des `QThread`, le tableau de bord principal s'affiche :

![Tableau de bord — Visualisation 3D et coupes 2D synchronisées](/assets/projects/vtk-itk/dashboard.jpg)

Ce tableau de bord combine :
- **Un viewport VTK 3D** (gauche) : rendu surfacique des deux tumeurs superposées avec la boîte crânienne volumique en semi-transparent.
- **Trois vues de coupes 2D** (droite) : vues Sagittale (X), Coronale (Y) et Axiale (Z) avec sliders interactifs synchronisés, permettant de naviguer dans les tranches de l'IRM.
- **Un panneau analytique** (sidebar) : scores de convergence de la métrique pre/post-recalage, graphique Matplotlib d'optimisation, et volumétries tumorales calculées.

| Donnée | Valeur |
| :--- | :--- |
| Volume Tumeur 1 (initiale) | **4,72 cm³** |
| Volume Tumeur 2 (suivi) | **7,64 cm³** |
| Évolution volumétrique | **+61.8%** |

---

## Recalage d'Images Médicales 3D (ITK)

Le recalage cherche une transformation spatiale $\mathcal{T}: \mathbf{x} \mapsto \mathbf{x}'$ alignant l'image mobile $M(\mathbf{x})$ sur l'image fixe $F(\mathbf{x})$.

### Transformations Implémentées

Trois types de transformations ont été développées :

| Transformation | Degrés de Liberté | Usage |
| :--- | :---: | :--- |
| **Rigide** (`VersorRigid3DTransform`) | 6 DOF | Déplacements de tête entre séances |
| **Affine** (`AffineTransform`) | 12 DOF | Déformations globales d'acquisition |
| **B-Spline** (grille de contrôle) | N DOF | Déformations locales tissulaires |

### Stratégies d'Optimisation Avancées

Le pipeline ITK embarque plusieurs mécanismes pour garantir la robustesse du recalage :

- **Initialisation par moments géométriques** (`CenteredTransformInitializer`) : aligne les centres de masse avant l'optimisation.
- **Métrique d'Information Mutuelle de Mattes** (`MattesMutualInformationImageToImageMetricv4`) avec 50 bins :
$$\text{MI}(F, M) = \sum_{f} \sum_{m} p(f,m) \log \left( \frac{p(f,m)}{p(f)\,p(m)} \right)$$
- **Pyramide multi-résolution à 3 niveaux** (facteurs `[4, 2, 1]`, sigmas gaussiens `[2, 1, 0]`) pour éviter les minima locaux.
- **Échantillonnage aléatoire à 10%** des voxels par itération — gain ×5 en vitesse sans perte de précision.
- **Estimation automatique d'échelle** (`RegistrationParameterScalesFromPhysicalShift`) pour équilibrer rotations (radians) et translations (millimètres).

### Graphique de Convergence de l'Optimiseur

L'évolution de la métrique au fil des itérations illustre la minimisation progressive lors du recalage :

![Historique de convergence de l'optimiseur ITK](/assets/projects/vtk-itk/convergence.png)

---

## Segmentation Tumorale & Volumétrie 3D

### Segmentation Automatique (Multi-Otsu + Solidité Morphologique)

Le pipeline automatique s'enchaîne en trois étapes :

1. **Seuillage Multi-Otsu** (`OtsuMultipleThresholdsImageFilter`) — découpe l'histogramme des niveaux de gris en 4 classes pour isoler les hyper-intensités du noyau tumoral.
2. **Ouverture Morphologique** (`BinaryMorphologicalOpeningImageFilter`) — élimine le bruit et détache les petites structures vasculaires via un élément structurant rectangulaire 2D.
3. **Composantes Connexes & Critère de Solidité** — labélise les régions (`ConnectedComponentImageFilter`). Pour chaque composante de plus de 500 voxels, sa **solidité** est évaluée :

$$\text{Solidité} = \frac{\text{Nombre de voxels de la composante}}{\text{Volume de la Bounding Box 3D}}$$

La région à la solidité géométrique maximale est sélectionnée comme tumeur.

### Segmentation Semi-Automatique (Region Growing)

L'algorithme `ConfidenceConnectedImageFilter` s'étend depuis un point germe au cœur de la tumeur vers les voxels voisins dont l'intensité s'inscrit dans :

$$\left[ \mu - c \cdot \sigma, \; \mu + c \cdot \sigma \right]$$

où $\mu$ et $\sigma$ sont la moyenne et l'écart-type de la région courante ($c = 2.3$).

### Calcul du Volume Physico-Médical

Le volume physique est calculé à partir du spacing ITK $(s_x, s_y, s_z)$ :

$$V_{\text{tumeur}} \; (\text{mm}^3) = N_{\text{voxels}} \times (s_x \times s_y \times s_z)$$
$$V_{\text{tumeur}} \; (\text{cm}^3) = \frac{V_{\text{tumeur}} \; (\text{mm}^3)}{1000}$$

---

## Visualisation 3D Interactive (VTK)

La couche de visualisation s'appuie sur le binding Python de **VTK** et `QVTKRenderWindowInteractor` :

- **Rendu surfacique 3D** (`vtkDiscreteMarchingCubes`) — extrait les isosurfaces 3D des masques binaires. Tumeur 1 en **rouge** `#EF4444`, Tumeur 2 en **bleu** `#3B82F6`, avec opacité 0.95.
- **Rendu volumique anatomique de fond** (`vtkSmartVolumeMapper`) — boîte crânienne et tissu cérébral affichés en arrière-plan semi-transparent (opacité max 0.08) via `vtkColorTransferFunction`.
- **Fusion d'images 2D multi-calques** (`vtkImageBlend`) — blend en temps réel de l'IRM en niveaux de gris avec les masques colorés semi-transparents via `vtkImageMapToColors`.

---

## Discussion & Perspectives

L'analyse visuelle révèle plusieurs éléments cliniques importants sur ce cas :

- **Traces de résection chirurgicale** : une cavité et une cicatrice visibles indiquent une intervention antérieure.
- **Récidive tumorale périphérique** : la tumeur prolifère en bordure de la zone réséquée, et non comme une sphère isolée.
- **Limitation NRRD vs. HU** : contrairement aux données CT en unités Hounsfield, les valeurs IRM du format NRRD sont des intensités relatives non calibrées, rendant impossible le pré-filtrage direct par densité tissulaire.

**Perspectives** : intégration de modèles de deep learning 3D (nnU-Net) pour surmonter les variations de contraste IRM, et extension à la gestion des tumeurs multifocales.
