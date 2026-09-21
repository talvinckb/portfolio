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
  result: "Détecteur à 0,947 d'AP50 sur la validation, et un premier pipeline détection → classification qui tourne de bout en bout ; rendu final fin janvier 2027."
  role: "Toute la partie détection : préparation du dataset, entraînement et évaluation du modèle YOLO."
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

La sortie est une page annotée et un fichier JSON par vue : coordonnées des boîtes, score de détection et classe prédite.

---

## Détection des Illustrations (YOLO)

C'est mon périmètre dans l'équipe. Le modèle retenu pour ce premier entraînement complet est **YOLO26l** (Ultralytics), pré-entraîné sur COCO puis fine-tuné sur le corpus BnF en **une seule classe**, `Illustration`.

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
| Epochs        | 50 (meilleure : 48)                   |
| Batch         | 6 — le plafond d'une RTX 4070 Laptop  |
| Optimiseur    | AdamW, lr 0,002                       |
| Augmentations | `mosaic` et `fliplr` **désactivées**  |
| Durée         | 2 h 45                                |

Les deux augmentations désactivées sont un choix délibéré : le retournement horizontal renverse le texte des pages, et la mosaïque fabrique des mises en page qui n'existent pas dans le corpus. Le plateau est atteint vers l'epoch 30 ; seul le mAP50-95 (la finesse du détourage) progresse encore au-delà.

### Résultats

Sur le split de validation, au seuil de confiance 0,25 :

| Métrique                           | Valeur                | Ce qu'elle mesure                                             |
| :--------------------------------- | :-------------------- | :------------------------------------------------------------ |
| **P@R90**                          | **0,915**             | Précision quand le modèle retrouve au moins 90 % des illustrations |
| **AP50**                           | **0,947**             | Capacité globale de détection (IoU ≥ 0,50)                    |
| mAP50-95                           | 0,852                 | Précision du détourage, sur IoU 0,50 à 0,95                   |
| Précision / rappel / F1            | 0,882 / 0,922 / 0,902 | Fiabilité / exhaustivité / équilibre au seuil retenu          |
| IoU moyenne                        | 0,939                 | Recouvrement des boîtes correctement détectées                |
| Fausses détections sur pages vides | 26 / 89 (29 %)        | Pages sans illustration où le modèle en voit une quand même   |

La **P@R90** est la métrique principale : rater une illustration coûte plus cher qu'en proposer une en trop, qu'un humain peut écarter. On fixe donc le rappel à 90 % et on regarde la précision obtenue.

![Prédictions YOLO26l sur un lot de validation — photos, plans, gravures, vues stéréoscopiques et une page vide correctement ignorée](/assets/projects/pfee-bnf/yolo-val-predictions.webp)

### Analyse d'erreurs

Les métriques globales cachent des écarts nets. Découpées **par taille d'illustration** :

| Taille (part de la page) | AP50      | mAP50-95 | P@R90                |
| :----------------------- | --------: | -------: | :------------------- |
| Minuscule (< 1 %)        | **0,587** | 0,389    | rappel max. 0,87     |
| Petite (1–10 %)          | 0,949     | 0,832    | 0,899                |
| Moyenne (10–50 %)        | 0,933     | 0,824    | 0,859                |
| Grande (> 50 %)          | 0,982     | 0,940    | 0,979                |

Et **par type de document** :

| Type                         | AP50  | P@R90 |
| :--------------------------- | ----: | ----: |
| Photographie                 | 0,990 | 1,000 |
| Ornement typographique       | 0,980 | 0,981 |
| Pellicule photo              | 0,974 | 0,953 |
| Bande dessinée               | 0,952 | 0,935 |
| Croquis multiples d'un objet | 0,878 | 0,605 |
| Stéréoscopie                 | 0,865 | 0,828 |

Trois enseignements guident la suite :

1. **Les très petites illustrations sont le point faible.** Leur AP50 tombe à 0,587, et le rappel y plafonne à 0,87 quel que soit le seuil : les 90 % visés sont hors de portée. C'est le chantier prioritaire.
2. **Les pages vides déclenchent encore trop de fausses détections.** 29 % d'entre elles reçoivent une boîte, contre 62 % après 2 epochs : l'entraînement a divisé ce taux par deux, mais c'est le chiffre qu'un bibliothécaire remarquera en premier.
3. **Les pages à plusieurs petits objets voisins et semblables** (croquis multiples, vues stéréoscopiques) sont les plus difficiles — le modèle hésite entre une boîte commune et une boîte par objet, ce qui recoupe le premier point.

Ces chiffres restent **optimistes** : la validation fournie partage 146 ouvrages avec le train, soit 18 % de ses vues. Deux pages d'un même ouvrage se ressemblant beaucoup, un split de test découpé par ouvrage est prévu pour mesurer la généralisation réelle.

---

## Classification (ConvNeXt)

La classification est portée par un autre membre de l'équipe. Un **ConvNeXt-Tiny** pré-entraîné sur ImageNet est fine-tuné sur le premier axe de la grille, la **technique** (photographie, estampe…), choisi pour sa capacité à extraire des caractéristiques visuelles sur des styles graphiques très variés. Les axes _Forme/Fonction_ et _Genre_ suivront sur la même base.

---

## Premier Pipeline de Bout en Bout

Les deux modèles sont désormais branchés : une page Gallica entre, une page annotée et son JSON sortent. Chaque boîte porte la classe prédite, sa confiance, puis le score de détection.

|                                         Une photographie isolée                                          |                                          Quatre estampes sur une planche                                          |
| :------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------: |
| ![Pipeline complet — une photographie détectée et classée](/assets/projects/pfee-bnf/pipeline-photographie.webp) | ![Pipeline complet — quatre estampes détectées séparément et classées](/assets/projects/pfee-bnf/pipeline-estampes.webp) |

Sur la planche de droite, le détecteur sépare bien les quatre gravures au lieu de les englober dans une seule boîte, et ignore le titre, la cote et le tampon de la BnF.

---

## État d'Avancement

Le projet est en cours — le rendu final est prévu pour **fin janvier 2027**. Le détecteur et un premier classifieur sont entraînés, et le pipeline complet fonctionne. Les prochaines étapes :

- **Détection** : un split de test par ouvrage, puis un travail ciblé sur les petites illustrations et les fausses détections sur pages vides ;
- **Orientation** : détecter et corriger les illustrations numérisées de travers (0° / 90° / 180° / 270°) ;
- **Classification** : étendre le classifieur aux axes _Forme/Fonction_ et _Genre_.
