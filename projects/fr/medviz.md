---
id: medviz
name: "MedViz"
title: "Prédiction médicale & visualisation 3D"
tagline: "Application médicale qui traite des scanners CT 3D, prédit le déclin de la fibrose pulmonaire par régression quantile et affiche les poumons en 3D dans le navigateur (WebGL)."
thumbnail: "/assets/projects/medviz/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/medviz/thumbnail-16x9-light.webp"
stack:
  ["Python", "FastAPI", "XGBoost", "Next.js", "Three.js", "Docker", "DICOM"]
period: "1 mois"
team: 4
github: "https://github.com/talvinckb/Medviz"
demo: null
report: null
brief:
  problem: "Prédire l'évolution de la capacité respiratoire (FVC) de patients atteints de fibrose pulmonaire à partir de scanners CT."
  approach: "Biomarqueurs radiomiques extraits des volumes 3D, régression quantile avec XGBoost, visualisation 3D dans le navigateur (FastAPI, Next.js, Docker)."
  result: "MAE de 87,1 mL avec XGBoost ; les biomarqueurs 3D réduisent l'erreur de 7,6 mL."
---

## Prédire la FVC à partir de scanners CT

La fibrose pulmonaire idiopathique (IPF) est une maladie chronique : du tissu cicatriciel se forme peu à peu dans les poumons et réduit la capacité respiratoire de façon irréversible. On suit son évolution par la capacité vitale forcée (FVC), mesurée en mL.

Avec MedViz, notre objectif était une application capable de :

- traiter des scanners CT 3D au format DICOM pour en extraire des biomarqueurs radiomiques quantitatifs ;
- prédire l'évolution de la FVC à 3, 6 ou 12 mois, avec l'incertitude de chaque prédiction ;
- afficher les poumons en 3D, en temps réel, dans une interface web interactive.

Les données viennent du challenge OSIC (Open Source Imaging Consortium) : des séries DICOM volumétriques et des mesures cliniques tabulaires (âge, sexe, tabagisme, historique de FVC).

| Type de données   | Format         | Description                                 |
| :---------------- | :------------- | :------------------------------------------ |
| Scanners CT 3D    | DICOM (`.dcm`) | Séries de coupes axiales volumétriques      |
| Données cliniques | CSV (`.csv`)   | Métadonnées des patients, historique de FVC |

![Coupes axiales CT volumétriques (patient OSIC)](/assets/projects/medviz/slices.webp)

## Du DICOM brut au score de maladie

Le pipeline enchaîne six étapes, du scanner brut au score affiché dans l'interface :

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma du workflow">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">DICOM brut</span>
    <span class="pipeline-step__sub">Scanner CT 3D</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Normalisation HU</span>
    <span class="pipeline-step__sub">Prétraitement DICOM</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Segmentation</span>
    <span class="pipeline-step__sub">K-Means + morpho 3D</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Radiomique 3D</span>
    <span class="pipeline-step__sub">Biomarqueurs + maillage GLB</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Prédiction ML</span>
    <span class="pipeline-step__sub">XGBoost quantile</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Score de maladie</span>
    <span class="pipeline-step__sub">Visualisation web 3D</span>
  </div>
</div>

## Traiter les scanners CT en 3D

### 1. Normalisation en unités Hounsfield

Les niveaux de gris bruts d'un fichier DICOM dépendent du constructeur du scanner et n'ont pas de sens physique direct. Nous les convertissons en unités Hounsfield (HU), une échelle absolue calibrée sur la densité des tissus :

| Tissu                 |    Plage HU    |
| :-------------------- | :------------: |
| Air externe           |   ≈ −1000 HU   |
| Parenchyme pulmonaire | −900 à −400 HU |
| Tissus mous / eau     |     ≈ 0 HU     |
| Tissu fibrosé         |   > −250 HU    |

Une fois en HU, un seuillage isole les zones d'intérêt clinique et rend les données comparables d'un patient à l'autre.

![Normalisation HU : (1) coupe DICOM brute, (2) seuillage Hounsfield](/assets/projects/medviz/hounsfield_normalization.webp)

### 2. Rééchantillonnage isotrope

L'épaisseur des coupes varie d'un équipement à l'autre. Pour que les mesures géométriques et volumétriques restent comparables entre patients, nous rééchantillonnons chaque volume à 1 voxel = 1 mm³ (interpolation d'ordre 3 avec `scipy.ndimage.zoom`).

### 3. Segmentation des poumons

La segmentation sépare le parenchyme pulmonaire des tissus voisins (os, muscles, air externe). Elle suit six étapes, numérotées comme sur la figure :

1. la coupe axiale d'origine ;
2. le masquage du champ de vision (FOV), qui exclut les bords du scanner ;
3. un seuillage adaptatif par K-Means ($K=2$), qui sépare l'air des tissus ;
4. l'analyse des composantes connexes, qui isole les deux cavités d'air principales ;
5. le masque final : morphologie 3D (fermetures, dilatations) et nettoyage du bruit (< 5 % du volume max) ;
6. les poumons segmentés, avec le masque appliqué à l'image d'origine.

![Étapes de la segmentation pulmonaire 3D](/assets/projects/medviz/segmentation_steps_3d.webp)

### 4. Reconstruction 3D des poumons

Les masques 2D des coupes axiales sont empilés en un volume. L'algorithme des marching cubes (`skimage.measure.marching_cubes`) en extrait l'isosurface du parenchyme, ce qui donne un modèle 3D des deux poumons.

![Reconstruction 3D du parenchyme pulmonaire à partir des coupes segmentées](/assets/projects/medviz/lungs_3d_reconstruction.webp)

### 5. Biomarqueurs radiomiques

Du volume reconstruit et de son masque, nous extrayons trois biomarqueurs par patient :

- le volume pulmonaire total : le nombre de voxels du masque multiplié par l'espacement isotrope (en cm³) ;
- la moyenne et l'écart-type des densités Hounsfield dans le parenchyme ;
- le ratio de fibrose : la part des voxels pulmonaires plus denses que −250 HU (tissu fibrosé dense).

### 6. Maillage 3D et export GLB

Le maillage est ensuite préparé pour l'affichage interactif, en deux étapes :

1. lissage et simplification de la surface (normalisation des sommets, calcul des normales) ;
2. export en GLB / glTF 2.0 avec `trimesh`, que Three.js affiche en temps réel dans le navigateur (WebGL).

## Régression quantile avec XGBoost

Plutôt qu'une valeur unique, nous prédisons une distribution : cinq modèles XGBoost distincts, un par quantile de la FVC.

|   Quantile   | Interprétation médicale                        |
| :----------: | :--------------------------------------------- |
|  q = 0,025   | Borne inférieure de l'IC à 95 % (pire cas)     |
|   q = 0,10   | Borne inférieure de l'IC à 80 %                |
|   q = 0,50   | Médiane, prédiction centrale                   |
|   q = 0,90   | Borne supérieure de l'IC à 80 %                |
|  q = 0,975   | Borne supérieure de l'IC à 95 % (meilleur cas) |

Chaque modèle prend en entrée la semaine cible, l'âge, le volume pulmonaire, la moyenne et l'écart-type HU, le ratio de fibrose, le sexe, le statut tabagique, la FVC et la semaine de référence, et le delta temporel.

### Indice de confiance et score de sévérité

Un indice de confiance continu, $C \in [0.01, 0.99]$, est tiré de la largeur de l'intervalle à 95 % : plus l'intervalle est étroit, plus l'indice est élevé.

![Prédictions de la FVC dans le temps et intervalles quantiles](/assets/projects/medviz/predictions.webp)

Pour situer le patient par rapport à une référence médicale, le score de sévérité rapporte sa FVC initiale à la FVC optimale donnée par les équations GLI-2012 (Global Lung Function Initiative), qui dépendent de l'âge, de la taille et du sexe :

<div style="text-align: center; font-size: 1.1rem; margin-block: 1rem;">
$$ \text{Score} = \frac{\text{FVC}_{\text{Baseline}}}{\text{FVC}_{\text{Optimale}}} $$
</div>

![Score de sévérité GLI et statut de risque du patient](/assets/projects/medviz/disease_score_severity.webp)

## Résultats : l'apport des biomarqueurs 3D

Pour mesurer ce qu'apportent les biomarqueurs 3D, nous avons entraîné trois modèles avec et sans eux, en plus des données cliniques :

| Modèle        | MAE avec radiomique | MAE sans radiomique | Gain de MAE | Apport radiomique |
| :------------ | :-----------------: | :-----------------: | :---------: | :---------------: |
| SVR (RBF)     |      119,4 mL       |      116,7 mL       |   −2,7 mL   |     Pas utile     |
| **XGBoost**   |     **87,1 mL**     |       94,7 mL       |   +7,6 mL   |       Utile       |
| Random Forest |       98,6 mL       |      109,4 mL       |  +10,8 mL   |       Utile       |

Avec les biomarqueurs 3D, XGBoost atteint une MAE de **87,1 mL**, le meilleur résultat, contre 94,7 mL sans eux. Ils réduisent aussi l'erreur de Random Forest (de 109,4 à 98,6 mL), mais pas celle du SVR, qui passe de 116,7 à 119,4 mL.

![Score LLL avec et sans biomarqueurs radiomiques](/assets/projects/medviz/metrics_radiomics_comparison.webp)

![Erreurs MAE et RMSE par modèle, comparées à la baseline](/assets/projects/medviz/metrics-mae-rmse.webp)

## Deux conteneurs : FastAPI et Next.js

L'application tient en deux conteneurs Docker indépendants :

- le backend FastAPI expose des routes REST documentées (Swagger OpenAPI), traite les DICOM en tâche de fond (`BackgroundTasks`) et stocke résultats ML et maillages 3D dans une base SQLite thread-safe ;
- le frontend Next.js, PulmoSight, affiche le maillage pulmonaire `.glb` en 3D temps réel avec `@react-three/fiber`, ainsi que les graphiques de FVC interactifs, la jauge du score de sévérité et l'import des DICOM.

![Architecture conteneurisée : backend et frontend (Docker)](/assets/projects/medviz/docker.webp)

### Tests et intégration continue

Les tests couvrent **91 %** du backend Python. Le pipeline CI/CD (GitLab CI) enchaîne trois phases automatiques : vérification du style (`ruff`, `prettier`), tests unitaires (`pytest`) et analyse statique des types (`ty check`, `tsc`).

| Module du backend        | Couverture pytest |
| :----------------------- | :---------------: |
| `database.py`            |       100 %       |
| `schemas.py`             |       100 %       |
| `logger.py`              |       94 %        |
| `services.py`            |       94 %        |
| `routes.py`              |       89 %        |
| `processing/pipeline.py` |       80 %        |
| **Total**                |     **91 %**      |

![Pipeline d'intégration continue (GitLab CI)](/assets/projects/medviz/pipeline-cicd.webp)

### L'interface PulmoSight

![Vue d'ensemble de l'interface utilisateur de MedViz](/assets/projects/medviz/user_interface_overview.webp)
