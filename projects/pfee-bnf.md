---
id: pfee-bnf
name: "PFEE — BnF"
title: "Segmentation & Classification d'Illustrations Patrimoniales"
tagline: "Pipeline de vision par ordinateur pour détecter, réorienter et classifier automatiquement les illustrations dans les documents numérisés de la Bibliothèque nationale de France — en partenariat avec la BnF."
thumbnail: "/assets/projects/pfee-bnf/bpt6k98138081_f271_page.jpg"
stack: ["Python", "Deep Learning", "YOLO", "Florence-2", "ConvNeXt", "PyTorch", "IIIF"]
period: "8 mois (en cours)"
team: 4
github: null
demo: null
report: null
---

## Contexte & Objectifs

La **Bibliothèque nationale de France (BnF)** numérise en continu son patrimoine documentaire via Gallica, sa plateforme en ligne. Ces millions de pages contiennent des illustrations (gravures, cartes, figures scientifiques, photographies…) dont le catalogage reste en grande partie manuel — un travail colossal et difficilement scalable.

Ce projet de fin d'études (PFEE), mené en partenariat direct avec la BnF sur **8 mois**, vise à automatiser ce processus de bout en bout :

1. **Acquérir** les données à grande échelle via les APIs IIIF de Gallica.
2. **Localiser & réorienter** automatiquement chaque illustration dans la page numérisée.
3. **Classifier** ces illustrations selon la grille d'annotations multi-critères de la BnF.
4. **Déployer** la combinaison de modèles la plus performante pour intégration en production à la BnF.

---

## Les Données : Corpus Patrimonial BnF

Le jeu de données de référence est constitué de pages de documents historiques numérisés de la BnF, annotées manuellement dans **Label Studio** par des experts du patrimoine (*Golden Dataset* au format JSON). Chaque zone d'intérêt y est définie par des coordonnées relatives de bounding box et associée aux 4 axes de métadonnées.

Les illustrations sont annotées selon quatre axes de classification définis par la BnF :

![Grille d'annotation complète — Forme/Fonction, Genre, Rotation, Technique](/assets/projects/pfee-bnf/labels.png)

La richesse et la complexité de cette taxonomie (plus de 40 labels de *Forme/Fonction* seuls, 4 classes de rotation, 5 techniques d'impression) rendent la tâche de classification particulièrement ambitieuse.

---

## Pipeline Technique

### Étape 1 — Acquisition des Données à Grande Échelle

Le premier défi est d'obtenir les images depuis les serveurs Gallica. Les identifiants `ARK` et `folio` de chaque document sont extraits du dataset annoté, puis utilisés pour interroger l'**API IIIF v3 de la BnF** (`openapi.bnf.fr/iiif/image/v3`).

Le téléchargement est **multithreadé** avec gestion du rate-limiting Gallica par backoff exponentiel (HTTP 429), et produit automatiquement un rapport HTML d'inspection pour valider la qualité des données récupérées.

### Étape 2 — Préparation & Formatage des Datasets

Les données brutes sont converties en deux formats distincts selon le modèle ciblé :

| Format | Modèle cible | Structure |
| :--- | :--- | :--- |
| **YOLO** | YOLO / Ultralytics | Coordonnées centrées normalisées |
| **Florence-2** | Microsoft Florence-2 | Tokens `<loc_x1><loc_y1><loc_x2><loc_y2>` |

Le split Train/Validation est effectué de façon déterministe (**70% / 30%**) pour assurer la reproductibilité des benchmarks.

---

## Segmentation & Détection d'Orientation : Benchmark Comparatif

La première tâche — localiser l'illustration et détecter son orientation dans la page — est abordée par deux approches en compétition :

| Approche | Modèle | Caractéristiques |
| :--- | :--- | :--- |
| **Détection classique** | YOLO (Ultralytics, pré-entraîné `yolo26n.pt`) | Rapide, éprouvé, fine-tuned sur bboxes + rotation |
| **Vision-Langage (VLM)** | Florence-2 (`microsoft/Florence-2-base`) | Fine-tuning avec gel du backbone vision, patch SDPA |

Les métriques de comparaison retenues sont :
- **IoU** (Intersection over Union) — qualité du chevauchement de la bounding box prédite vs. vérité terrain
- **mAP@50 / mAP@50-95** — performance globale de détection
- **Précision d'orientation** — taux d'exactitude sur les 4 classes de rotation (0°/90°/180°/270°)

### Premiers Résultats de Segmentation (Florence-2)

Voici des exemples de résultats de localisation et de segmentation d'illustrations obtenus par le modèle Vision-Langage **Florence-2** fine-tuné sur le dataset BnF :

| Florence-2 — Traité de géométrie | Florence-2 — Document illustré | Florence-2 — Traité historique |
| :---: | :---: | :---: |
| ![Résultat Florence-2 — Traité de géométrie](/assets/projects/pfee-bnf/bd6t59319400_f367_page.jpg) | ![Résultat Florence-2 — Document illustré](/assets/projects/pfee-bnf/bpt6k98138081_f271_page.jpg) | ![Résultat Florence-2 — Traité historique](/assets/projects/pfee-bnf/bpt6k87288463_f625_page.jpg) |

---

## Classification Multi-Labels : Architecture Cible

La deuxième tâche — classifier le contenu de l'illustration — est en cours d'exploration. Les premiers tests sont réalisés avec **ConvNeXt**, évalué pour sa capacité à extraire des caractéristiques visuelles sur des styles graphiques très variés (gravures, photographies, cartes...).

---

## État d'Avancement

Le projet est en cours de réalisation — le rendu final est prévu pour **fin janvier 2027**. À ce stade, le pipeline d'acquisition et de préparation des données est opérationnel, et la phase de benchmark sur la détection est engagée. Les résultats comparatifs et la classification finale seront intégrés à mesure que le projet avance.
