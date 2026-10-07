---
id: alpr
name: "ALPR"
title: "Automatic license plate recognition"
tagline: "Locating license plates without deep learning (classical vision and a Random Forest), with a Python versus C++17 benchmark."
thumbnail: "/assets/projects/alpr/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/alpr/thumbnail-16x9-light.webp"
stack: ["Python", "C++17", "OpenCV", "Random Forest", "CMake", "Google Test"]
period: "5 weeks"
team: 2
github: null
demo: null
report: null
brief:
  problem: "Locate license plates in highly variable Full HD images, without any deep neural network."
  approach: "Classical vision and a Random Forest, prototyped in Python then rewritten in C++17, with a custom MyCV module."
  result: "F1 of 0.7535 on the 1,440 UFPR-ALPR test images, and 14% less time per image in C++."
---

## Locating a plate without deep learning

Automatic license plate recognition (ALPR) is a building block of intelligent transportation systems and road access control. Our goal: locate a vehicle's plate in high-resolution images, whatever the vehicle and the surroundings.

### Project constraints

- The pipeline could use **no deep neural network** at all (no YOLO, no heavy CNN): only classical computer vision and lightweight machine learning, to stay explainable and light on memory.
- The images are Full HD ($1920 \times 1080$), with strong lighting variations (direct sunlight, rain, shadows), tilted angles and partial occlusions.
- The system has to handle both legacy Brazilian plates and the new Mercosul format.

## A four-stage pipeline

We split the processing into a sequential pipeline of four stages:

<div class="pipeline-workflow" title="Click to enlarge the diagram">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Raw image</span>
    <span class="pipeline-step__sub">Full HD 1080p</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Preprocessing</span>
    <span class="pipeline-step__sub">800 px, grayscale</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">ROI generation</span>
    <span class="pipeline-step__sub">Filters and morphology</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">HOG features</span>
    <span class="pipeline-step__sub">293-D vector</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Classification</span>
    <span class="pipeline-step__sub">Random Forest</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Result</span>
    <span class="pipeline-step__sub">Located plate</span>
  </div>
</div>

1. Preprocessing normalizes the image scale and reduces its color channels.
2. Candidate generation extracts, at several scales, the rectangular regions likely to contain a plate (ROI).
3. Each candidate is described by a vector combining HOG descriptors and geometric measurements.
4. A machine learning model scores the candidates and keeps the best one.

## The four stages in detail

### 1. Preprocessing

This step stabilizes object sizes in the image and lightens the computations that follow:

- the image is resized to 800 pixels wide, aspect ratio preserved, to cut computation time;
- it is converted to grayscale: only luminance variations matter from then on.

|                    1. Original image                    |                        2. Preprocessed image                        |
| :-----------------------------------------------------: | :-----------------------------------------------------------------: |
| ![Original image](/assets/projects/alpr/01_original.webp) | ![Preprocessed image](/assets/projects/alpr/02_preprocessed.webp) |

### 2. Candidate generation (ROI)

Scanning the whole image would be far too slow. Instead, we generate a small set of candidate regions of interest (ROI) from three complementary branches:

1. The main branch (morphology and Sobel) boosts the local contrast of the characters (MMLPF filter), then applies a vertical Sobel filter, Otsu thresholding and a morphological closing ($17 \times 3$).
2. The oversampled branch ($2\times$) runs the same processing on the image enlarged twice, to catch small or distant plates.
3. The Canny branch detects edges adaptively, based on the median intensity of the image.

> Each branch immediately filters its own candidates by area ($50 \text{ px} \le \text{area} \le 40\,000 \text{ px}$) and aspect ratio ($1.0 \le w/h \le 8.0$), which removes obvious false candidates right away.

#### Main branch, step by step

<figure class="stepper" data-stepper>
<ol class="stepper__frames" role="list">
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_1_mmlpf.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_1_mmlpf.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_1_mmlpf.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Step 1 of 5: MMLPF filter" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">1</span> MMLPF filter. Boosts the local contrast of the characters.</p></li>
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_2_sobel_dx.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_2_sobel_dx.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_2_sobel_dx.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Step 2 of 5: Vertical Sobel" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">2</span> Vertical Sobel. Brings out the vertical edges of the image.</p></li>
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_3_otsu.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_3_otsu.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_3_otsu.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Step 3 of 5: Otsu threshold" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">3</span> Otsu threshold. Binarizes the image with an automatically chosen threshold.</p></li>
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_4_fermeture.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_4_fermeture.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_4_fermeture.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Step 4 of 5: Closing" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">4</span> Closing. A 17 × 3 closing joins neighboring edges into blobs.</p></li>
<li class="stepper__frame"><img src="/assets/projects/alpr/intermediate_steps/x2/step_5_cca.webp" srcset="/assets/projects/alpr/intermediate_steps/base/step_5_cca.webp 800w, /assets/projects/alpr/intermediate_steps/x2/step_5_cca.webp 1600w" sizes="(min-width: 1100px) 880px, 100vw" alt="Step 5 of 5: Candidates" width="1600" height="900" loading="lazy" decoding="async"><p class="stepper__text"><span class="stepper__num">5</span> Candidates. Connected components become candidates, filtered by area and aspect ratio.</p></li>
</ol>
<div class="stepper__nav" role="group" aria-label="Main branch steps" hidden>
<button class="stepper__btn" type="button" aria-pressed="false"><span>1</span>MMLPF filter</button>
<button class="stepper__btn" type="button" aria-pressed="false"><span>2</span>Vertical Sobel</button>
<button class="stepper__btn" type="button" aria-pressed="false"><span>3</span>Otsu threshold</button>
<button class="stepper__btn" type="button" aria-pressed="false"><span>4</span>Closing</button>
<button class="stepper__btn" type="button" aria-pressed="false"><span>5</span>Candidates</button>
</div>
</figure>

#### Merging the three branches and NMS deduplication

The oversampled and Canny branches extract and filter their candidates the same way. The regions kept by the three branches are then merged and deduplicated with non-maximum suppression (NMS, based on IoU) to remove overlaps.

![Candidates from the three branches, merged and deduplicated with NMS](/assets/projects/alpr/03_candidates.webp)

### 3. HOG and geometric descriptor

Each remaining candidate is cropped, resized to $64 \times 32$ pixels, then turned into a vector of 293 features:

- 288 HOG values (histogram of oriented gradients), computed over 32 cells of $8 \times 8$ pixels, with 9 orientation bins and $L_2$ normalization;
- 5 geometric measurements: aspect ratio, relative area, relative position in the image (X and Y) and edge density.

### 4. Classification and final localization

A Random Forest classifier (`cv::ml::RTrees`) gives each feature vector a confidence score. The region with the highest positive score is kept as the plate.

![Final result: the detected plate](/assets/projects/alpr/04_result.webp)

## From Python to C++17

The project went through two phases.

### 1. Python prototype

A Python prototype, built with `scikit-learn` and OpenCV, let us set up the pipeline quickly, validate the morphological filters and train the classifier.

### 2. C++17 port and the `MyCV` module

To reach the targeted real-time performance and stop depending on OpenCV's opaque abstractions, we rewrote the pipeline in C++17 and wrote our own module, `MyCV`, which contains:

- a grayscale conversion using weighted integer arithmetic;
- a 2D Sobel convolution with explicit memory and border handling;
- native geometric operators.

## Results on UFPR-ALPR

All three versions are evaluated on the UFPR-ALPR test set (1,440 images). The optimized C++17 version is the best on every measure, with an F1 of **0.7535**.

### Detection and inference time

| Implementation        | True positives (TP) | Precision | Recall | F1 score | Average time |
| :-------------------- | :-----------------: | :-------: | :----: | :------: | :----------: |
| Python                |         955         |  0.8580   | 0.6632 |  0.7481  |  468.50 ms   |
| **C++17 (optimized)** |         963         |  0.8629   | 0.6687 |  0.7535  |  402.28 ms   |
| C++17 (`MyCV`)        |         955         |  0.8504   | 0.6632 |  0.7452  |  583.67 ms   |

### What the measurements show

- Moving to C++17 cuts processing time by **14%**, or 66 ms less per image.
- The Python prototype and the C++ version give exactly the same result in **92.85%** of cases: the rewrite is faithful.
- The `MyCV` version, written as plain C++ loops without SIMD instructions, is the slowest (583.67 ms per image): on convolutions, OpenCV's vectorized routines (AVX2/NEON) make the difference.
- Training drops from 3 min 46 s to 2 min 48 s in C++, thanks to better multi-core parallelization (441% CPU usage versus 201% in Python).
