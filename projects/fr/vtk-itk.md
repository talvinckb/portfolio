---
id: vtk-itk
name: "VTK-ITK"
title: "Recalage & suivi longitudinal de tumeur cérébrale"
tagline: "Alignement 3D de deux IRM cérébrales avec ITK, segmentation de la tumeur et visualisation multi-vues avec VTK et PyQt6, pour mesurer l'évolution du volume d'un gliome."
thumbnail: "/assets/projects/vtk-itk/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/vtk-itk/thumbnail-16x9-light.webp"
stack: ["Python", "ITK", "VTK", "PyQt6", "Matplotlib"]
period: "3 semaines"
team: 4
github: "https://github.com/Axthauvin/vtk-itk-project"
demo: null
report: null
brief:
  problem: "Quantifier l'évolution d'un gliome entre deux IRM d'un même patient, acquises à plusieurs mois d'intervalle."
  approach: "Recalage 3D avec ITK, segmentation par multi-Otsu et croissance de région, visualisation 2D et 3D avec VTK et PyQt6."
  result: "Le volume de la tumeur passe de 4,72 à 7,64 cm³ entre les deux examens (+61,8 %), avec les deux acquisitions superposées dans une vue interactive."
---

## Comparer deux IRM d'un même patient

Le suivi d'un gliome ou d'un glioblastome repose sur la comparaison d'IRM acquises à plusieurs mois d'intervalle. D'une séance à l'autre, la tête du patient n'est pas dans la même position : il faut aligner les deux volumes avant de comparer les tumeurs.

Nous avons construit une application qui :

1. aligne les deux volumes IRM en 3D (recalage) pour compenser les différences de position de la tête entre les séances ;
2. isole et segmente la tumeur sur les deux acquisitions, avant et après recalage ;
3. calcule son volume en mm³ et en cm³ pour mesurer une progression ou une régression ;
4. affiche en 2D et en 3D la superposition des structures anatomiques et des deux tumeurs.

Les données sont deux acquisitions IRM 3D au format NRRD : `case6_gre1.nrrd` (examen initial, l'image fixe) et `case6_gre2.nrrd` (examen de suivi, l'image mobile à recaler). Sur ce cas, le volume de la tumeur augmente de **61,8 %** entre les deux examens.

## L'application PyQt6 et VTK

L'interface est écrite avec PyQt6, dans un thème sombre (_Deep Slate_), et compte deux écrans principaux.

### Tableau de bord et volumes mesurés

Une fois les calculs terminés (ils tournent en arrière-plan dans des `QThread`), le tableau de bord principal s'affiche :

![Tableau de bord : vue 3D et coupes 2D synchronisées](/assets/projects/vtk-itk/dashboard.webp)

Il réunit trois zones :

- à gauche, une vue 3D VTK : les deux tumeurs superposées, rendues en surface, dans la boîte crânienne affichée en volume semi-transparent ;
- à droite, trois coupes 2D (sagittale X, coronale Y, axiale Z) avec des curseurs synchronisés pour parcourir les tranches de l'IRM ;
- dans la barre latérale, les scores de la métrique avant et après recalage, la courbe d'optimisation tracée avec Matplotlib et les volumes calculés.

| Donnée                                 | Valeur      |
| :------------------------------------- | :---------- |
| Volume de la tumeur 1 (examen initial) | 4,72 cm³    |
| Volume de la tumeur 2 (suivi)          | 7,64 cm³    |
| Évolution du volume                    | **+61,8 %** |

## Recalage 3D avec ITK

Le recalage cherche une transformation spatiale $\mathcal{T}: \mathbf{x} \mapsto \mathbf{x}'$ qui aligne l'image mobile $M(\mathbf{x})$ sur l'image fixe $F(\mathbf{x})$.

### Trois transformations

Nous avons implémenté trois types de transformations :

| Transformation                           | Degrés de liberté | Usage                                        |
| :--------------------------------------- | :---------------: | :------------------------------------------- |
| Rigide (`VersorRigid3DTransform`)        |         6         | Déplacements de la tête entre les séances    |
| Affine (`AffineTransform`)               |        12         | Déformations globales liées à l'acquisition  |
| B-spline (grille de points de contrôle)  |         N         | Déformations locales des tissus              |

### Réglages de l'optimiseur

Le pipeline ITK combine plusieurs réglages :

- une initialisation par moments géométriques (`CenteredTransformInitializer`), qui aligne les centres de masse avant l'optimisation ;
- la métrique d'information mutuelle de Mattes (`MattesMutualInformationImageToImageMetricv4`), avec un histogramme de 50 classes :
  $$\text{MI}(F, M) = \sum_{f} \sum_{m} p(f,m) \log \left( \frac{p(f,m)}{p(f)\,p(m)} \right)$$
- une pyramide multi-résolution à 3 niveaux (facteurs `[4, 2, 1]`, sigmas gaussiens `[2, 1, 0]`) pour éviter les minima locaux ;
- un échantillonnage aléatoire de 10 % des voxels à chaque itération, **5 fois plus rapide** sans perte de précision ;
- une estimation automatique des échelles (`RegistrationParameterScalesFromPhysicalShift`), qui équilibre rotations (en radians) et translations (en millimètres).

### Convergence de l'optimiseur

La courbe de la métrique au fil des itérations montre sa minimisation pendant le recalage :

![Historique de convergence de l'optimiseur ITK](/assets/projects/vtk-itk/convergence.webp)

## Segmentation et volume de la tumeur

### Segmentation automatique (multi-Otsu et solidité)

La segmentation automatique se fait en trois étapes :

1. Un seuillage multi-Otsu (`OtsuMultipleThresholdsImageFilter`) découpe l'histogramme des niveaux de gris en 4 classes pour isoler les hyperintensités du cœur de la tumeur.
2. Une ouverture morphologique (`BinaryMorphologicalOpeningImageFilter`), avec un élément structurant rectangulaire 2D, retire le bruit et détache les petites structures vasculaires.
3. Les composantes connexes sont étiquetées (`ConnectedComponentImageFilter`). Pour chaque composante de plus de 500 voxels, nous calculons sa solidité :

$$\text{Solidité} = \frac{\text{Nombre de voxels de la composante}}{\text{Volume de la boîte englobante 3D}}$$

La composante la plus solide est retenue comme tumeur.

### Segmentation semi-automatique par croissance de région

Le filtre `ConfidenceConnectedImageFilter` part d'un point germe placé au cœur de la tumeur et s'étend aux voxels voisins dont l'intensité reste dans l'intervalle :

$$\left[ \mu - c \cdot \sigma, \; \mu + c \cdot \sigma \right]$$

où $\mu$ et $\sigma$ sont la moyenne et l'écart-type de la région courante, avec $c = 2{,}3$.

### Calcul du volume en cm³

Le volume se déduit du nombre de voxels et de l'espacement des voxels donné par ITK, $(s_x, s_y, s_z)$ :

$$V_{\text{tumeur}} \; (\text{mm}^3) = N_{\text{voxels}} \times (s_x \times s_y \times s_z)$$
$$V_{\text{tumeur}} \; (\text{cm}^3) = \frac{V_{\text{tumeur}} \; (\text{mm}^3)}{1000}$$

## Rendu 2D et 3D avec VTK

L'affichage passe par les bindings Python de VTK et `QVTKRenderWindowInteractor` :

- Le rendu surfacique (`vtkDiscreteMarchingCubes`) extrait les isosurfaces des masques binaires : tumeur 1 en rouge (`#EF4444`), tumeur 2 en bleu (`#3B82F6`), avec une opacité de 0,95.
- Un rendu volumique (`vtkSmartVolumeMapper`) affiche en fond la boîte crânienne et le tissu cérébral, presque transparents (opacité maximale de 0,08), via `vtkColorTransferFunction`.
- En 2D, `vtkImageBlend` superpose en temps réel l'IRM en niveaux de gris et les masques colorés semi-transparents produits par `vtkImageMapToColors`.

![Rendu surfacique 3D de la tumeur cérébrale, superposé au volume](/assets/projects/vtk-itk/render-3d.webp)

## Observations, limites et perspectives

L'analyse visuelle de ce cas fait ressortir trois points :

- Une cavité et une cicatrice visibles indiquent une résection chirurgicale antérieure.
- La tumeur récidive en bordure de la zone réséquée, au lieu de croître comme une sphère isolée.
- Contrairement au scanner, dont les valeurs sont calibrées en unités Hounsfield, les intensités IRM des fichiers NRRD sont relatives et non calibrées : impossible de pré-filtrer directement les tissus par densité.

Pour aller plus loin : intégrer un modèle de deep learning 3D (nnU-Net) pour mieux résister aux variations de contraste entre IRM, et gérer les tumeurs multifocales.
