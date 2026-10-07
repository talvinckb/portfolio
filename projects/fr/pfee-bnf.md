---
id: pfee-bnf
name: "PFEE — BnF"
title: "Segmentation & Classification d'Illustrations Patrimoniales"
tagline: "Pipeline de vision par ordinateur pour détecter, réorienter et classifier automatiquement les illustrations dans les documents numérisés de la Bibliothèque nationale de France — en partenariat avec la BnF."
thumbnail: "/assets/projects/pfee-bnf/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/pfee-bnf/thumbnail-16x9-light.webp"
stack:
  [
    "Python",
    "Deep Learning",
    "YOLO",
    "ConvNeXt",
    "PyTorch",
    "IIIF",
  ]
period: "8 mois (en cours)"
team: 4
github: null
demo: null
report: null
brief:
  problem: "Le catalogage des illustrations numérisées par la BnF sur Gallica reste en grande partie manuel."
  approach: "Détection des illustrations sur la page (YOLO26l), découpe, puis classification de chaque illustration (ConvNeXt)."
  result: "Détecteur à 0,956 d'AP50 et 0,856 de précision à 95 % de rappel, aussi bon sur les ouvrages jamais vus à l'entraînement ; le pipeline détection → classification tourne de bout en bout. Rendu final fin janvier 2027."
  role: "Toute la partie détection (dataset, entraînement, évaluation, comparaison YOLO / Florence-2), et la ligne de commande commune qui enchaîne détection et classification."
---

## Contexte & Objectifs

La **Bibliothèque nationale de France (BnF)** numérise en continu son patrimoine documentaire via Gallica, sa plateforme en ligne. Ces millions de pages contiennent des illustrations (gravures, cartes, figures scientifiques, photographies…) dont le catalogage reste en grande partie manuel — un travail colossal et difficilement scalable.

Ce projet de fin d'études (PFEE), mené en partenariat direct avec la BnF sur **8 mois**, vise à automatiser ce processus de bout en bout :

1. **Localiser** automatiquement chaque illustration dans la page numérisée.
2. **Réorienter** les illustrations numérisées de travers.
3. **Classifier** ces illustrations selon la grille d'annotations multi-critères de la BnF.
4. **Livrer** la combinaison de modèles la plus performante pour intégration en production à la BnF.

---

## Les Données : Corpus Patrimonial BnF

La BnF fournit un jeu de données par tâche. Pour la détection, il s'agit d'une campagne d'annotation menée en 2024-2025 : **6 078 vues Gallica** où chaque illustration est encadrée par une boîte. C'est une _deuxième itération_ : les boîtes ont été pré-remplies par un premier modèle, puis corrigées à la main.

| Split          | Vues  | Illustrations | Vues sans illustration |
| :------------- | ----: | ------------: | ---------------------: |
| **Train**      | 4 839 |         8 910 |                    309 |
| **Validation** | 1 207 |         2 141 |                     89 |

Le corpus est très hétérogène : photographies, affiches, bandes dessinées, plans, pellicules photo, vues stéréoscopiques, ornements typographiques… Les tailles varient autant : en validation, un tiers des illustrations couvre plus de la moitié de la page, mais une sur vingt en couvre moins de 1 %.

Pour la classification, les illustrations sont annotées selon quatre axes définis par la BnF :

![Grille d'annotation complète — Forme/Fonction, Genre, Rotation, Technique](/assets/projects/pfee-bnf/annotation_grid_labels.webp)

La richesse et la complexité de cette taxonomie (plus de 40 labels de _Forme/Fonction_ seuls, 4 classes de rotation, 5 techniques d'impression) rendent la tâche de classification particulièrement ambitieuse.

---

## Pipeline Technique

Le pipeline enchaîne deux modèles spécialisés plutôt qu'un seul modèle à tout faire :

1. **Détection** — YOLO repère chaque illustration sur la page et renvoie sa boîte avec un score de confiance.
2. **Découpe** — chaque boîte est extraite de la page en une image indépendante.
3. **Classification** — ConvNeXt prédit la catégorie de chaque découpe.

La sortie est une page annotée par vue et un fichier `predictions.jsonl`, une ligne par page : coordonnées des boîtes, score de détection, classe prédite et sa confiance. Chaque modèle s'entraîne et s'évalue dans son propre module ; le pipeline ne fait qu'enchaîner les deux modèles entraînés, derrière une seule ligne de commande.

---

## Détection des Illustrations (YOLO)

C'est mon périmètre dans l'équipe. Le modèle retenu est **YOLO26l** (Ultralytics), pré-entraîné sur COCO puis fine-tuné sur le corpus BnF en **une seule classe**, `Illustration`.

### Préparation du dataset

La livraison BnF est laissée intacte ; un script en dérive une copie propre :

- **22 doublons exacts** et une boîte d'aire nulle supprimés ;
- la classe `Texte`, annotée sur seulement 83 % des vues, est écartée ;
- les **vues sans illustration** (pages de garde, papiers marbrés, couvertures) gardent un label vide : ce sont des exemples négatifs précieux, pas des annotations manquantes.

### Entraînement

| Paramètre     | Valeur                                |
| :------------ | :------------------------------------ |
| Modèle        | YOLO26l, pré-entraîné COCO            |
| Résolution    | 800 px                                |
| Epochs        | 50 (meilleure : 50)                   |
| Batch         | 6 — le plafond d'une RTX 4070 Laptop  |
| Optimiseur    | AdamW, lr 0,002                       |
| Augmentations | `mosaic` et `fliplr` **désactivées**  |
| Durée         | 2 h 35                                |

Les deux augmentations désactivées sont un choix délibéré : le retournement horizontal renverse le texte des pages, et la mosaïque fabrique des mises en page qui n'existent pas dans le corpus. Le plateau est atteint vers l'epoch 30 ; seul le mAP50-95 (la finesse du détourage) progresse encore au-delà.

### Résultats

Sur le split de validation :

| Métrique                           | Valeur                | Ce qu'elle mesure                                                  |
| :--------------------------------- | :-------------------- | :----------------------------------------------------------------- |
| **P@R95**                          | **0,856**             | Précision quand le modèle retrouve au moins 95 % des illustrations |
| P@R90                              | 0,943                 | La même, à 90 % de rappel                                          |
| **AP50**                           | **0,956**             | Capacité globale de détection (IoU ≥ 0,50)                         |
| mAP50-95                           | 0,872                 | Précision du détourage, sur IoU 0,50 à 0,95                        |
| Précision / rappel / F1 (seuil 0,25) | 0,888 / 0,939 / 0,913 | Fiabilité / exhaustivité / équilibre                             |
| IoU moyenne                        | 0,939                 | Recouvrement des boîtes correctement détectées                     |
| Fausses détections sur pages vides | 26 / 89 (29 %)        | Pages sans illustration où le modèle en voit une quand même        |

La **P@R95** est la métrique principale : effacer une boîte en trop coûte moins cher à un humain que d'en tracer une oubliée. On fixe donc le rappel à 95 % et on regarde la précision obtenue. L'évaluation en déduit aussi le **seuil de confiance à utiliser** — ici 0,167, celui qui atteint 95 % de rappel avec la meilleure précision — que la prédiction et le pipeline reprennent par défaut.

Les métriques sont recalculées par notre propre code plutôt que lues dans les courbes d'Ultralytics, et l'AP est vérifiée contre `pycocotools` dans les tests.

![Prédictions YOLO26l sur un lot de validation — photos, plans, gravures, vues stéréoscopiques et une page vide correctement ignorée](/assets/projects/pfee-bnf/yolo-val-predictions.webp)

### Analyse d'erreurs

Les métriques globales cachent des écarts nets. Découpées **par taille d'illustration** :

| Taille (part de la page) | AP50      | mAP50-95 | P@R95                |
| :----------------------- | --------: | -------: | :------------------- |
| Minuscule (< 1 %)        | **0,652** | 0,420    | rappel max. 0,92     |
| Petite (1–10 %)          | 0,960     | 0,854    | 0,794                |
| Moyenne (10–50 %)        | 0,938     | 0,845    | 0,780                |
| Grande (> 50 %)          | 0,993     | 0,952    | 0,983                |

Et **par type de document** :

| Type                         | AP50  | P@R90 | P@R95 |
| :--------------------------- | ----: | ----: | ----: |
| Photographie                 | 0,999 | 1,000 | 1,000 |
| Pellicule photo              | 0,983 | 0,971 | 0,952 |
| Ornement typographique       | 0,984 | 0,929 | 0,871 |
| Bande dessinée               | 0,955 | 0,939 | 0,859 |
| Plan                         | 0,922 | 0,819 | 0,660 |
| Croquis multiples d'un objet | 0,913 | 0,730 | 0,536 |
| Stéréoscopie                 | 0,903 | 0,960 | 0,410 |

Trois enseignements guident la suite :

1. **Les très petites illustrations sont le point faible.** Leur AP50 tombe à 0,652, et le rappel y plafonne à 0,92 quel que soit le seuil : les 95 % visés sont hors de portée, et atteindre 90 % ne laisse que 13 % de précision. C'est le chantier prioritaire.
2. **Les pages vides déclenchent encore trop de fausses détections.** 29 % d'entre elles reçoivent une boîte au seuil 0,25, et 36 % au seuil qui vise 95 % de rappel : c'est le chiffre qu'un bibliothécaire remarquera en premier.
3. **Les pages à plusieurs petits objets voisins et semblables** (croquis multiples, vues stéréoscopiques) sont les plus difficiles — le modèle hésite entre une boîte commune et une boîte par objet, ce qui recoupe le premier point.

Restait un doute sur la généralisation : le split de validation fourni est découpé par vue, et 222 de ses 1 207 vues appartiennent à un ouvrage déjà présent dans le train. Deux pages d'un même ouvrage se ressemblant beaucoup, l'évaluation rapporte aussi les métriques sur les seuls **ouvrages absents du train** : P@R90 de 0,945 contre 0,943 sur toute la validation. Pas d'effet mesurable, le modèle ne profite pas de cette fuite.

### Comparaison avec Florence-2

Pour vérifier que YOLO est le bon choix, l'équipe a aussi entraîné **Florence-2-base** (Microsoft), un modèle vision-langage qui génère ses boîtes sous forme de texte, sur le même dataset et avec la même évaluation. Son encodeur visuel est gelé, seul le reste du modèle est fine-tuné.

| Métrique                           | YOLO26l   | Florence-2-base |
| :--------------------------------- | --------: | --------------: |
| AP50                               | **0,956** | 0,461           |
| Rappel maximal                     | **≥ 0,95**| 0,73            |
| P@R95                              | **0,856** | non atteint     |
| IoU moyenne                        | 0,939     | **0,959**       |
| Fausses détections sur pages vides | 29 %      | **1 %**         |

Florence-2 détoure très proprement les grandes illustrations (AP50 de 0,953 au-delà de la moitié de la page) et ne se trompe presque jamais sur une page vide, mais il passe à côté de la plupart des petites : rappel de 0,27 sous 1 % de la page, 0,55 entre 1 et 10 %. Sa perte de validation est au plus bas dès la première epoch, puis remonte : le modèle surapprend tout de suite. YOLO reste le détecteur du pipeline.

---

## Classification (ConvNeXt)

La classification est portée par un autre membre de l'équipe. Un **ConvNeXt-Tiny** pré-entraîné sur ImageNet est fine-tuné sur le premier axe de la grille, la **technique** — 5 classes : dessin, estampe, impression, peinture, photographie —, choisi pour sa capacité à extraire des caractéristiques visuelles sur des styles graphiques très variés. Les classes étant très déséquilibrées, la perte pondère chaque classe selon sa fréquence. Les axes _Genre_ (16 classes) et _Forme/Fonction_ (21 classes) s'entraînent de la même façon, à partir de leurs propres fichiers.

---

## Premier Pipeline de Bout en Bout

Les deux modèles sont désormais branchés : une page Gallica entre, une page annotée et son JSON sortent. Chaque boîte porte la classe prédite, sa confiance, puis le score de détection.

|                                         Une photographie isolée                                          |                                          Quatre estampes sur une planche                                          |
| :------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------: |
| ![Pipeline complet — une photographie détectée et classée](/assets/projects/pfee-bnf/pipeline-photographie.webp) | ![Pipeline complet — quatre estampes détectées séparément et classées](/assets/projects/pfee-bnf/pipeline-estampes.webp) |

Sur la planche de droite, le détecteur sépare bien les quatre gravures au lieu de les englober dans une seule boîte, et ignore le titre, la cote et le tampon de la BnF.

---

## État d'Avancement

Le projet est en cours — le rendu final est prévu pour **fin janvier 2027**. Le détecteur et un premier classifieur sont entraînés, et le pipeline complet fonctionne derrière une ligne de commande unique, avec des tests et une intégration continue (lint `ruff`). Les prochaines étapes :

- **Détection** : un travail ciblé sur les petites illustrations et les fausses détections sur pages vides ;
- **Orientation** : détecter et corriger les illustrations numérisées de travers (0° / 90° / 180° / 270°) ;
- **Classification** : brancher les axes _Forme/Fonction_ et _Genre_ dans le pipeline, qui ne prend aujourd'hui qu'un classifieur ;
- **Évaluation de bout en bout** : aucun jeu de données n'annote à la fois les boîtes et les classes des mêmes pages, chaque modèle n'est donc évalué que séparément.
