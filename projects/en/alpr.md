---
layout: project.njk
lang: "en"
id: alpr
name: "ALPR"
title: "Automatic License Plate Recognition"
tagline: "Full ALPR system built without Deep Learning (Classical Computer Vision + Machine Learning), featuring rigorous Python vs C++ performance benchmarks."
thumbnail: "/assets/projects/alpr/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/alpr/thumbnail-16x9-light.webp"
stack: ["Python", "C++17", "OpenCV", "Random Forest", "CMake", "Google Test"]
period: "5 weeks"
team: 2
github: null
demo: null
report: null
---

## Context & Problem Statement

Automatic License Plate Recognition (**ALPR**) is a core component of intelligent transportation systems and automated road access control. The goal of this project was to analyze high-resolution vehicle images and locate license plates with high precision, regardless of vehicle type, background, or environmental lighting conditions.

### Technical Challenges

- **No-Deep-Learning Constraint**: A major project constraint was to implement the entire pipeline without deep neural networks (no YOLO or heavy CNNs), relying strictly on classical computer vision and lightweight Machine Learning to ensure complete explainability and a low memory footprint.
- **High Resolution & Variability**: Processing Full HD ($1920 \times 1080$) images featuring severe lighting variations (direct sunlight, rain, heavy shadows), tilted angles, and partial occlusions.
- **Complex Plate Formats**: Supporting both legacy Brazilian plates and new Mercosul standardized formats.

---

## Workflow Overview

To solve this problem robustly, the processing pipeline was structured into 4 sequential stages:

```
[1. Preprocessing] ──> [2. Candidate Extraction] ──> [3. Filtering & NMS] ──> [4. Classification (RF)]
```

| Original Image | Preprocessed (Grayscale + Blur) |
| :------------: | :-----------------------------: |
| ![Original](/assets/projects/alpr/01_original.webp) | ![Preprocessed](/assets/projects/alpr/02_preprocessed.webp) |

---

## Classical Computer Vision Pipeline

### 1. Preprocessing & Morphological Filtering

- **Grayscale Conversion & Gaussian Blur**: Reduces high-frequency color noise.
- **Sobel Gradient ($D_x$)**: Computes vertical edges, as license plates exhibit strong horizontal transitions due to characters.
- **Otsu Thresholding**: Binarizes the gradient image dynamically.
- **Morphological Closing**: Connects nearby vertical edges to form candidate rectangular regions.

| Step 1: MMLPF | Step 2: Sobel $D_x$ | Step 3: Otsu Thresholding | Step 4: Closing | Step 5: CCA Candidates |
| :-----------: | :-----------------: | :-----------------------: | :-------------: | :--------------------: |
| ![MMLPF](/assets/projects/alpr/intermediate_steps/base/step_1_mmlpf.webp) | ![Sobel](/assets/projects/alpr/intermediate_steps/base/step_2_sobel_dx.webp) | ![Otsu](/assets/projects/alpr/intermediate_steps/base/step_3_otsu.webp) | ![Closing](/assets/projects/alpr/intermediate_steps/base/step_4_fermeture.webp) | ![CCA](/assets/projects/alpr/intermediate_steps/base/step_5_cca.webp) |

### 2. Multi-Branch Candidate Extraction & NMS

Candidate bounding boxes are extracted via **Connected Component Analysis (CCA)** across 3 parallel morphological filter kernel sizes. Overlapping boxes are merged and deduplicated using **Non-Maximum Suppression (NMS)** based on Intersection-over-Union (IoU > 0.3).

![Fused candidate regions deduplicated via NMS](/assets/projects/alpr/03_candidates.webp)

---

## Machine Learning Classifier (Random Forest)

Candidate regions are passed to a **Random Forest Classifier** trained on shape, aspect ratio, edge density, and HOG (Histogram of Oriented Gradients) features to distinguish valid license plates from false positives (grilles, headlights, text logos).

![Final license plate detection result](/assets/projects/alpr/04_result.webp)

---

## Python vs C++ Performance Benchmarks

The entire pipeline was implemented in both **Python** and **C++17 (OpenCV C++ API + CMake)** to evaluate execution efficiency:

| Implementation | Single Frame Latency | Throughput (FPS) | Speedup |
| :------------- | :------------------: | :--------------: | :-----: |
| Python / OpenCV | 142 ms | 7.0 FPS | 1.0× |
| **C++17 / OpenCV** | **18 ms** | **55.5 FPS** | **7.9×** |

C++17 achieves an **8× speedup**, proving that classical computer vision algorithms compiled down to native machine code achieve real-time performance on resource-constrained embedded hardware.
