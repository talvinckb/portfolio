---
id: pfee-bnf
name: "PFEE — BnF"
title: "Segmentation & Classification of Heritage Illustrations"
tagline: "Computer vision pipeline to automatically detect, reorient, and classify illustrations in digitized documents of the National Library of France — in partnership with BnF."
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
period: "8 months (ongoing)"
team: 4
github: null
demo: null
report: null
brief:
  problem: "Cataloguing the illustrations the BnF digitizes on Gallica is still largely manual."
  approach: "Illustration detection on the page (YOLO26l), cropping, then classification of each illustration (ConvNeXt)."
  result: "A detector at 0.947 AP50 on validation, and a first detection → classification pipeline running end to end; final delivery due end of January 2027."
  role: "The whole detection side: dataset preparation, training and evaluation of the YOLO model."
---

## Context & Objectives

The **National Library of France (BnF)** continuously digitizes its documentary heritage via Gallica, its digital library platform. Millions of pages contain illustrations (engravings, maps, scientific diagrams, historical photos…) whose cataloging remains largely manual — a massive and unscalable endeavor.

This 8-month Capstone Project (PFEE), conducted in direct partnership with the BnF, aims to automate this end-to-end workflow:

1. **Locate** each illustration automatically within digitized pages.
2. **Reorient** illustrations that were scanned sideways or upside down.
3. **Classify** illustrations according to BnF's multi-criteria annotation taxonomy.
4. **Deliver** the best-performing combination of models for production integration at BnF.

---

## The Dataset: BnF Heritage Corpus

The BnF provides one dataset per task. For detection, it comes from a 2024-2025 annotation campaign: **6,078 Gallica views** where every illustration is marked with a bounding box. This is a _second iteration_: boxes were pre-filled by a first model, then corrected by hand.

| Split          | Views | Illustrations | Views without illustration |
| :------------- | ----: | ------------: | -------------------------: |
| **Train**      | 4,839 |         8,910 |                        309 |
| **Validation** | 1,207 |         2,141 |                         89 |

The corpus is highly heterogeneous: photographs, posters, comics, plans, film rolls, stereoscopic views, typographic ornaments… Sizes vary just as much: in validation, a third of the illustrations cover more than half of the page, while one in twenty covers less than 1%.

For classification, illustrations are annotated along four axes defined by BnF:

![Full Annotation Grid — Form/Function, Genre, Rotation, Technique](/assets/projects/pfee-bnf/annotation_grid_labels.webp)

The richness and complexity of this taxonomy (over 40 _Form/Function_ labels alone, 4 rotation classes, 5 printing techniques) make the classification task particularly ambitious.

---

## Technical Pipeline

The pipeline chains two specialized models rather than one model doing everything:

1. **Detection** — YOLO finds each illustration on the page and returns its box with a confidence score.
2. **Cropping** — each box is cut out of the page as a standalone image.
3. **Classification** — ConvNeXt predicts the category of each crop.

The output is an annotated page plus one JSON file per view: box coordinates, detection score and predicted class.

---

## Illustration Detection (YOLO)

This is my part of the project. The model used for this first full training run is **YOLO26l** (Ultralytics), pre-trained on COCO then fine-tuned on the BnF corpus with **a single class**, `Illustration`.

### Dataset Preparation

The BnF delivery is left untouched; a script derives a clean copy from it:

- **22 exact duplicates** and one zero-area box removed;
- the `Texte` (text) class, annotated on only 83% of views, is dropped;
- **views without any illustration** (endpapers, marbled paper, covers) keep an empty label: they are valuable negative examples, not missing annotations.

### Training

| Parameter     | Value                                |
| :------------ | :----------------------------------- |
| Model         | YOLO26l, COCO pre-trained            |
| Resolution    | 800 px                               |
| Epochs        | 50 (best: 48)                        |
| Batch         | 6 — the ceiling of an RTX 4070 Laptop |
| Optimizer     | AdamW, lr 0.002                      |
| Augmentations | `mosaic` and `fliplr` **disabled**   |
| Duration      | 2 h 45                               |

Disabling those two augmentations is deliberate: horizontal flips mirror the text on the pages, and mosaic builds layouts that never occur in the corpus. Training plateaus around epoch 30; past that point, only mAP50-95 (box tightness) keeps improving.

### Results

On the validation split, at a 0.25 confidence threshold:

| Metric                          | Value                 | What it measures                                            |
| :------------------------------ | :-------------------- | :---------------------------------------------------------- |
| **P@R90**                       | **0.915**             | Precision when the model finds at least 90% of illustrations |
| **AP50**                        | **0.947**             | Overall detection ability (IoU ≥ 0.50)                      |
| mAP50-95                        | 0.852                 | Box tightness, over IoU 0.50 to 0.95                        |
| Precision / recall / F1         | 0.882 / 0.922 / 0.902 | Reliability / coverage / balance at the chosen threshold    |
| Mean IoU                        | 0.939                 | Overlap of correctly detected boxes                         |
| False detections on empty pages | 26 / 89 (29%)         | Pages with no illustration where the model still finds one  |

**P@R90** is the headline metric: missing an illustration costs more than proposing an extra one, which a human can dismiss. So recall is pinned at 90% and we look at the precision that comes with it.

![YOLO26l predictions on a validation batch — photos, plans, engravings, stereoscopic views and an empty page correctly left alone](/assets/projects/pfee-bnf/yolo-val-predictions.webp)

### Error Analysis

Global metrics hide sharp differences. Broken down **by illustration size**:

| Size (share of the page) | AP50      | mAP50-95 | P@R90            |
| :----------------------- | --------: | -------: | :--------------- |
| Tiny (< 1%)              | **0.587** | 0.389    | max recall 0.87  |
| Small (1–10%)            | 0.949     | 0.832    | 0.899            |
| Medium (10–50%)          | 0.933     | 0.824    | 0.859            |
| Large (> 50%)            | 0.982     | 0.940    | 0.979            |

And **by document type**:

| Type                            | AP50  | P@R90 |
| :------------------------------ | ----: | ----: |
| Photograph                      | 0.990 | 1.000 |
| Typographic ornament            | 0.980 | 0.981 |
| Film roll                       | 0.974 | 0.953 |
| Comic book                      | 0.952 | 0.935 |
| Several sketches of one object  | 0.878 | 0.605 |
| Stereoscopy                     | 0.865 | 0.828 |

Three takeaways drive the next steps:

1. **Very small illustrations are the weak spot.** Their AP50 drops to 0.587, and recall caps at 0.87 whatever the threshold: the 90% target is out of reach. This is the top priority.
2. **Empty pages still trigger too many false detections.** 29% of them get a box, down from 62% after 2 epochs: training halved that rate, but it is the first number a librarian will notice.
3. **Pages with several small, similar, neighbouring objects** (multiple sketches, stereoscopic views) are the hardest — the model hesitates between one shared box and one box per object, which ties back to the first point.

These numbers are still **optimistic**: the provided validation split shares 146 books with the training split, i.e. 18% of its views. Since two pages from the same book look very much alike, a test split cut by book is planned to measure real generalization.

---

## Classification (ConvNeXt)

Classification is handled by another team member. An ImageNet pre-trained **ConvNeXt-Tiny** is fine-tuned on the first axis of the grid, **technique** (photograph, print…), chosen for its ability to extract visual features across highly diverse graphic styles. The _Form/Function_ and _Genre_ axes will follow on the same basis.

---

## A First End-to-End Pipeline

Both models are now wired together: a Gallica page goes in, an annotated page and its JSON come out. Each box shows the predicted class, its confidence, then the detection score.

|                                        A single photograph                                         |                                          Four prints on one plate                                           |
| :------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------: |
| ![Full pipeline — one photograph detected and classified](/assets/projects/pfee-bnf/pipeline-photographie.webp) | ![Full pipeline — four prints detected separately and classified](/assets/projects/pfee-bnf/pipeline-estampes.webp) |

On the right-hand plate, the detector correctly splits the four engravings instead of wrapping them in one box, and ignores the title, the shelfmark and the BnF stamp.

---

## Project Status

The project is ongoing — final delivery is scheduled for **late January 2027**. The detector and a first classifier are trained, and the full pipeline runs. Next steps:

- **Detection**: a test split cut by book, then targeted work on small illustrations and false detections on empty pages;
- **Orientation**: detect and fix illustrations scanned sideways or upside down (0° / 90° / 180° / 270°);
- **Classification**: extend the classifier to the _Form/Function_ and _Genre_ axes.
