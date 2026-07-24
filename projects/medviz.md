---
id: medviz
name: "MedViz"
title: "Prédiction médicale & Visualisation 3D"
tagline: "Application médicale complète combinant traitement de scanners CT 3D, Machine Learning quantile et visualisation WebGL pour prédire le déclin de la fibrose pulmonaire."
thumbnail: "/assets/projects/medviz/interface-utilisateur.png"
stack:
  ["Python", "FastAPI", "XGBoost", "Next.js", "Three.js", "Docker", "DICOM"]
period: "1 mois"
team: 4
github: null
demo: null
report: null
---

## Contexte & Problématique

La **fibrose pulmonaire idiopathique (IPF)** est une maladie chronique qui entraîne la formation progressive de tissu cicatriciel dans les poumons, diminuant irréversiblement la capacité respiratoire. Le paramètre clinique clé pour mesurer son évolution est la **Capacité Vitale Forcée (FVC)**, exprimée en mL.

L'objectif de **MedViz** était de concevoir une application médicale complète capable de :

- **Traiter des scanners CT 3D** au format DICOM pour extraire des biomarqueurs radiométriques quantitatifs.
- **Prédire l'évolution de la FVC** sur 3, 6 ou 12 mois avec un modèle ML intégrant l'incertitude médicale.
- **Visualiser les poumons en 3D** dans une interface web interactive en temps réel.

Le projet s'appuie sur le challenge **OSIC (Open Source Imaging Consortium)**, dont les données comprennent des séries volumétriques DICOM et des mesures cliniques tabulaires (âge, sexe, tabagisme, historique FVC).

| Type de Données   | Format         | Description                            |
| :---------------- | :------------- | :------------------------------------- |
| Scanners CT 3D    | DICOM (`.dcm`) | Séries de coupes axiales volumétriques |
| Données Cliniques | CSV (`.csv`)   | Métadonnées patients & historique FVC  |

![Coupes axiales CT volumétriques (patient OSIC)](/assets/projects/medviz/slices.png)

---

## Vue d'ensemble du Pipeline

<div class="pipeline-workflow" title="Cliquer pour agrandir le schéma du workflow">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">DICOM Brut</span>
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
    <span class="pipeline-step__sub">K-Means + Morpho 3D</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Radiomics 3D</span>
    <span class="pipeline-step__sub">Biomarqueurs + Maillage GLB</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Prédiction ML</span>
    <span class="pipeline-step__sub">XGBoost Quantile</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Score de Maladie</span>
    <span class="pipeline-step__sub">Visualisation Web 3D</span>
  </div>
</div>

---

## Traitement d'Images Médicales 3D

### 1. Normalisation Hounsfield (Prétraitement DICOM)

Les valeurs de gris brutes d'un scanner DICOM sont propres à chaque constructeur et sans signification physique directe. Elles doivent être converties en **Unités Hounsfield (HU)**, une échelle absolue calibrée sur la densité des tissus biologiques :

| Tissu                 |    Plage HU    |
| :-------------------- | :------------: |
| Air externe           |   ≈ −1000 HU   |
| Parenchyme pulmonaire | −900 à −400 HU |
| Tissus mous / eau     |     ≈ 0 HU     |
| Tissu fibrosé         |   > −250 HU    |

Une fois en HU, un seuillage permet d'isoler les zones d'intérêt clinique et de normaliser les données entre patients.

![Standardisation HU : (1) Coupe DICOM brute, (2) Seuillage Hounsfield](/assets/projects/medviz/HU-bis-bis.png)

### 2. Rééchantillonnage Isotrope 3D

Les épaisseurs de coupe CT varient selon les équipements. Pour garantir la cohérence des mesures géométriques et volumétriques entre patients, le volume 3D est rééchantillonné à **1 voxel = 1 mm³** (interpolation d'ordre 3 via `scipy.ndimage.zoom`).

### 3. Segmentation Automatique des Poumons

La segmentation isole le parenchyme pulmonaire des tissus environnants (os, muscles, air externe) selon 6 étapes numérotées :

1. **Coupe CT originale** : Image axiale d'entrée brute.
2. **Frontière externe (FOV)** : Masquage du champ de vision pour exclure les bordures du scanner.
3. **Air brut (K-Means)** : Seuillage adaptatif $K=2$ séparant l'air des tissus.
4. **Poumons internes** : Analyse des composantes connexes pour isoler les 2 cavités d'air principales.
5. **Masque final** : Opérations morphologiques 3D (fermetures, dilatations) et nettoyage du bruit (< 5% du volume max).
6. **Poumons segmentés** : Résultat final appliqué à l'image d'origine.

![Étapes de la segmentation pulmonaire 3D](/assets/projects/medviz/segmantation-steps-bis-bis.png)

### 4. Extraction de Biomarqueurs Radiométriques

À partir du masque 3D validé, trois biomarqueurs quantitatifs sont extraits par patient :

- **Volume Pulmonaire Total** : Somme des voxels du masque multipliée par l'espacement isotrope (en cm³).
- **Statistiques HU** : Moyenne et écart-type des densités Hounsfield au sein du parenchyme.
- **Ratio de Fibrose** : Proportion de voxels pulmonaires dont la densité > −250 HU (tissu fibrosé dense).

### 5. Génération du Maillage 3D (GLB)

Le masque booléen 3D est transformé en maillage polygonal interactif en deux étapes :

1. Algorithme des **Marching Cubes** (`skimage.measure.marching_cubes`) : reconstruction de la surface isosurface avec sommets, faces et normales.
2. Export au format **GLB / glTF 2.0** via `trimesh` pour un rendu WebGL direct dans le navigateur via Three.js.

---

## Modèle de Prédiction : XGBoost Quantile

Plutôt qu'une simple prédiction ponctuelle, MedViz entraîne **5 modèles XGBoost distincts** correspondant à des quantiles de la distribution de la FVC :

|   Quantile   | Interprétation médicale                |
| :----------: | :------------------------------------- |
|  q = 0.025   | Borne inférieure IC 95% (pire cas)     |
|   q = 0.10   | Borne inférieure IC 80%                |
| **q = 0.50** | **Médiane — prédiction centrale**      |
|   q = 0.90   | Borne supérieure IC 80%                |
|  q = 0.975   | Borne supérieure IC 95% (meilleur cas) |

Chaque modèle prend en entrée : semaine cible, âge, volume pulmonaire, moyenne HU, écart-type HU, ratio de fibrose, sexe, statut tabagique, FVC de référence, semaine de référence et delta temporel.

### Indice de Confiance et Score de Sévérité

Un **indice de confiance continu** $C \in [0.01, 0.99]$ est dérivé de la largeur de l'intervalle IC 95% — plus le modèle est certain, plus cet indice est élevé.

![Prédictions temporelles FVC et intervalles quantiles](/assets/projects/medviz/predictions.png)

Pour offrir une référence médicale normée, le **Score de Sévérité** est calculé à partir des équations GLI-2012 (Global Lung Function Initiative) en fonction de l'âge, taille et sexe du patient :

<div style="text-align: center; font-size: 1.1rem; margin-block: 1rem;">
$$ \text{Score} = \frac{\text{FVC}_{\text{Baseline}}}{\text{FVC}_{\text{Optimale}}} $$
</div>

![Score de sévérité GLI et statut de risque du patient](/assets/projects/medviz/score-maladie.png)

---

## Résultats

Une étude comparative rigoureuse évalue l'**apport direct des biomarqueurs radiométriques 3D** (CT Scans) par rapport aux seules données cliniques tabulaires :

| Modèle        | MAE avec Radiomics | MAE sans Radiomics |  Gain MAE   | Gain Radiométrique |
| :------------ | :----------------: | :----------------: | :---------: | :----------------: |
| SVR (RBF)     |      119.4 mL      |      116.7 mL      |   −2.7 mL   |    ❌ Non utile    |
| **XGBoost**   |    **87.1 mL**     |      94.7 mL       | **+7.6 mL** |    **✅ Utile**    |
| Random Forest |      98.6 mL       |      109.4 mL      |  +10.8 mL   |    **✅ Utile**    |

**XGBoost avec radiomics atteint une MAE de 87.1 mL**, soit le meilleur résultat, confirmant que les données d'imagerie 3D enrichissent significativement la capacité prédictive du modèle.

![Score LLL avec et sans biomarqueurs radiomiques](/assets/projects/medviz/metrics-lll-clinicals-bis.png)

![Erreurs MAE et RMSE par architecture vs baseline](/assets/projects/medviz/metrics-mae-rmse.png)

---

## Architecture & Déploiement

MedViz adopte une architecture **microservices découplée** en 2 conteneurs Docker indépendants :

- **Backend FastAPI** : Routes REST documentées (Swagger OpenAPI), traitement DICOM en tâche d'arrière-plan (`BackgroundTasks`), base SQLite thread-safe pour les résultats ML et maillages 3D.
- **Frontend Next.js / PulmoSight** : Rendu 3D temps réel du maillage pulmonaire `.glb` via `@react-three/fiber`, graphiques FVC interactifs, jauge de score de sévérité et interface d'upload DICOM.

![Architecture conteneurisée Backend & Frontend (Docker)](/assets/projects/medviz/docker.png)

### Qualité de Code & Intégration Continue (CI/CD)

Le projet atteint un **taux de couverture de tests de 91%** sur le backend Python, avec une pipeline CI/CD complète (GitLab CI) articulée en 3 phases automatiques : vérification du style (`ruff`, `prettier`), tests unitaires (`pytest`) et analyse statique des types (`ty check`, `tsc`).

| Module Backend           | Couverture Pytest |
| :----------------------- | :---------------: |
| `database.py`            |       100%        |
| `schemas.py`             |       100%        |
| `logger.py`              |        94%        |
| `services.py`            |        94%        |
| `routes.py`              |        89%        |
| `processing/pipeline.py` |        80%        |
| **TOTAL**                |      **91%**      |

![Pipeline d'intégration continue (GitLab CI)](/assets/projects/medviz/pipeline-cicd.png)
