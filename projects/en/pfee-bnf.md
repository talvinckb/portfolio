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
    "Florence-2",
    "ConvNeXt",
    "PyTorch",
    "IIIF",
  ]
period: "8 months (ongoing)"
team: 4
github: null
demo: null
report: null
---

## Context & Objectives

The **National Library of France (BnF)** continuously digitizes its documentary heritage via Gallica, its digital library platform. Millions of pages contain illustrations (engravings, maps, scientific diagrams, historical photos…) whose cataloging remains largely manual — a massive and unscalable endeavor.

This 8-month Capstone Project (PFEE), conducted in direct partnership with the BnF, aims to automate this end-to-end workflow:

1. **Acquire** data at scale via Gallica's IIIF APIs.
2. **Locate & reorient** each illustration automatically within digitized pages.
3. **Classify** illustrations according to BnF's multi-criteria annotation taxonomy.
4. **Deploy** the optimal combination of deep learning models for production integration at BnF.

---

## The Dataset: BnF Heritage Corpus

The benchmark dataset consists of historical BnF document pages manually annotated in **Label Studio** by heritage domain experts (_Golden Dataset_ in JSON format). Each region of interest is defined by relative bounding box coordinates and tagged across 4 metadata axes.

Illustrations are annotated according to four classification axes defined by BnF:

![Full Annotation Grid — Form/Function, Genre, Rotation, Technique](/assets/projects/pfee-bnf/annotation_grid_labels.webp)

The richness and complexity of this taxonomy (over 40 _Form/Function_ labels alone, 4 rotation classes, 5 printing techniques) make the classification task particularly ambitious.

---

## Technical Pipeline

### Step 1 — Large-Scale Data Ingestion

The first challenge is obtaining images from Gallica servers. The `ARK` and `folio` identifiers for each document are extracted from the annotated dataset, then used to query the **BnF IIIF v3 API** (`openapi.bnf.fr/iiif/image/v3`).

Downloading is **multithreaded** with Gallica rate-limiting management via exponential backoff (HTTP 429), automatically generating an HTML inspection report to validate the quality of retrieved data.

### Step 2 — Dataset Formatting & Preparation

Raw data is converted into two distinct formats depending on the target model:

| Format         | Target Model         | Structure                                 |
| :------------- | :------------------- | :---------------------------------------- |
| **YOLO**       | YOLO / Ultralytics   | Normalized centered coordinates           |
| **Florence-2** | Microsoft Florence-2 | Tokens `<loc_x1><loc_y1><loc_x2><loc_y2>` |

The Train/Validation split is performed deterministically (**70% / 30%**) to ensure benchmark reproducibility.

---

## Segmentation & Orientation Detection: Comparative Benchmark

The first task — locating the illustration and detecting its orientation within the page — is tackled by two competing approaches:

| Approach                  | Model                                        | Key Features                                        |
| :------------------------ | :------------------------------------------- | :-------------------------------------------------- |
| **Classical Detection**   | YOLO (Ultralytics, pre-trained `yolo26n.pt`) | Fast, proven, fine-tuned on bboxes + rotation       |
| **Vision-Language (VLM)** | Florence-2 (`microsoft/Florence-2-base`)     | Fine-tuning with vision backbone frozen, SDPA patch |

The comparison metrics selected are:

- **IoU** (Intersection over Union) — overlap quality between predicted bounding box vs. ground truth
- **mAP@50 / mAP@50-95** — overall detection performance
- **Orientation Accuracy** — accuracy rate across the 4 rotation classes (0°/90°/180°/270°)

### Initial Segmentation Results (Florence-2)

Here are example illustration localization and segmentation results obtained by the **Florence-2** Vision-Language model fine-tuned on the BnF dataset:

|                              Florence-2 — Geometry Treatise                               |                                    Florence-2 — Illustrated Document                                     |                              Florence-2 — Historical Treatise                              |
| :---------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------: |
| ![Florence-2 Result — Geometry](/assets/projects/pfee-bnf/coins_yolo_detection_page.webp) | ![Florence-2 Result — Illustrated Document](/assets/projects/pfee-bnf/geometry_space_treatise_page.webp) | ![Florence-2 Result — History](/assets/projects/pfee-bnf/manuscript_illuminated_page.webp) |

---

## Multi-Label Classification: Target Architecture

The second task — classifying illustration content — is currently under exploration. Initial testing is conducted with **ConvNeXt**, evaluated for its ability to extract visual features across highly diverse graphic styles (engravings, photographs, maps...).

---

## Project Status

The project is currently ongoing — final delivery is scheduled for **late January 2027**. At this stage, the data ingestion and dataset preparation pipeline is operational, and the detection benchmark phase is underway. Comparative results and final classification will be integrated as project work progresses.
