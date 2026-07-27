---
layout: project.njk
lang: "en"
id: pfee-bnf
name: "PFEE — BnF"
title: "Segmentation & Classification of Heritage Illustrations"
tagline: "Computer vision pipeline to automatically detect, reorient, and classify illustrations in digitized documents of the National Library of France — in partnership with BnF."
thumbnail: "/assets/projects/pfee-bnf/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/pfee-bnf/thumbnail-16x9-light.webp"
stack: ["Python", "Deep Learning", "YOLO", "Florence-2", "ConvNeXt", "PyTorch", "IIIF"]
period: "8 months (ongoing)"
team: 4
github: null
demo: null
report: null
---

## Context & Objectives

The **National Library of France (BnF)** continuously digitizes its historical document collections on Gallica, its digital library platform. Millions of pages contain valuable illustrations (engravings, maps, scientific diagrams, historical photos), but cataloging them remains largely manual — a massive and unscalable endeavor.

This 8-month Capstone Project (PFEE), conducted in direct partnership with the BnF, aims to automate this end-to-end workflow:

1. **Acquire** data at scale via Gallica's IIIF APIs.
2. **Locate & reorient** each illustration automatically within digitized pages.
3. **Classify** illustrations according to BnF's multi-criteria annotation taxonomy.
4. **Deploy** the optimal combination of deep learning models for production integration at BnF.

---

## The Dataset: BnF Heritage Corpus

The benchmark dataset consists of historical BnF document pages manually annotated in **Label Studio** by heritage domain experts (*Golden Dataset* in JSON format). Each region of interest is defined by bounding box coordinates and tagged across 4 metadata axes:

![Full Annotation Grid — Form/Function, Genre, Rotation, Technique](/assets/projects/pfee-bnf/annotation_grid_labels.webp)

The taxonomy includes over 40 *Form/Function* labels alone, 4 rotation classes, and 5 printing techniques, making multi-label classification exceptionally challenging.

---

## Technical Pipeline Architecture

```
[IIIF Ingestion] ──> [Detection & Cropping] ──> [Orientation Correction] ──> [Multi-Axis Classification]
```

1. **Illustration Detection**:
   - **YOLOv8 / YOLOv11** fine-tuned on BnF pages to predict bounding boxes of illustrations ($x, y, w, h$).
   - **Florence-2 VLM** evaluated in Zero-Shot and Few-Shot prompting modes for open-vocabulary detection.

2. **Rotation Correction**:
   - Classification model detecting page/illustration orientation ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) to reorient images automatically.

3. **Multi-Axis Classification**:
   - **ConvNeXt** & **ResNet** backbone architectures trained with BCEWithLogitsLoss for multi-label prediction across Form, Function, Genre, and Technique.

---

## Model Evaluation & Results

| Model Architecture | Task | Precision | Recall | F1-Score | mAP@50 |
| :----------------- | :--- | :-------: | :----: | :------: | :----: |
| YOLOv8x | Detection | 0.912 | 0.885 | 0.898 | **0.934** |
| YOLOv11x | Detection | **0.924** | **0.891** | **0.907** | **0.941** |
| Florence-2 (Few-Shot) | Detection | 0.845 | 0.812 | 0.828 | 0.865 |
| ConvNeXt-Base | Classification | **0.884** | **0.852** | **0.868** | — |

| Florence-2 Detection: Geometry Treatise | Florence-2 Detection: Illuminated Document | Florence-2 Detection: Historical Page |
| :-------------------------------------: | :----------------------------------------: | :-----------------------------------: |
| ![Geometry](/assets/projects/pfee-bnf/geometry_space_treatise_page.webp) | ![Illuminated](/assets/projects/pfee-bnf/coins_yolo_detection_page.webp) | ![History](/assets/projects/pfee-bnf/manuscript_illuminated_page.webp) |
