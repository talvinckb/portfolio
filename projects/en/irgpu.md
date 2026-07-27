---
id: irgpu
name: "IRGPU"
title: "Real-Time Video Motion Detection — GPU Porting"
tagline: "CPU → GPU porting of a real-time motion detection algorithm, accelerated by ×24 using CUDA and 6 Nsight-guided optimizations."
thumbnail: "/assets/projects/irgpu/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/irgpu/thumbnail-16x9-light.webp"
stack: ["C++", "CUDA", "GStreamer", "Nsight Systems", "Nsight Compute"]
period: "4 weeks"
team: 4
github: null
demo: null
report: null
---

## Context & Problem Statement

Real-time motion detection is a fundamental building block of video surveillance systems, automated video stream analysis, and robotics. The objective of this project was to design a **background subtraction filter** capable of operating at **30 FPS or higher** in High Definition, constrained to rely strictly on **NVIDIA CUDA** and the **GStreamer** multimedia framework.

### Technical Challenges

- **CPU Bottleneck**: The reference sequential C++ implementation achieves only **5.29 FPS** — far below the 30 FPS real-time threshold.
- **High Data Parallelism Pipeline**: Every pixel in every frame undergoes 5 sequential independent operations, an ideal use case for GPU execution, but memory, random generation, and morphological bottlenecks required in-depth analysis.
- **Rigorous Validation**: Every CUDA optimization must maintain near-perfect visual precision compared to the CPU reference (SSIM ≈ 1.0000).

---

## Pipeline Overview

Processing is executed frame by frame across **5 sequential stages**, where each pixel is processed independently — an architecture perfectly suited for GPU parallelization:

<div class="pipeline-workflow" title="Click to enlarge workflow diagram">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Source Image</span>
    <span class="pipeline-step__sub">Raw RGB</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Estimated Background</span>
    <span class="pipeline-step__sub">K=3 Reservoirs Model</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Motion Mask</span>
    <span class="pipeline-step__sub">L₁ Norm</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Morpho Opening</span>
    <span class="pipeline-step__sub">Erosion + Dilation</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Hysteresis Threshold</span>
    <span class="pipeline-step__sub">4-connected Propagation</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Final Result</span>
    <span class="pipeline-step__sub">Motion Coloring</span>
  </div>
</div>

---

## The Motion Detection Algorithm

### Step 1 — Background Estimation

The most complex stage of the pipeline. For each pixel, a set of **K = 3 color reservoirs** (`color` + `weight`) is maintained to model possible background colors (noise, lighting shifts, etc.).

For each new frame and each pixel:

- If the pixel color is **close** to an existing reservoir (tolerance of ±10 per channel), its color is updated by a **sliding weighted average** and its weight increases.
- If **no reservoir matches**, the weakest reservoir is replaced **stochastically** (probability inversely proportional to its weight).

The estimated background for each pixel is simply the color of the reservoir with the highest weight.

### Step 2 — Motion Mask Calculation

The difference between the current pixel and the estimated background is measured via the **L₁ norm** (mean absolute difference across R, G, B). A high score indicates a pixel in motion.

### Step 3 — Morphological Opening

The raw mask contains noise (leaves, video compression artifacts). A **morphological opening** on a disk of radius R=3 eliminates false positives:

- **Erosion**: Removes isolated noise pixels.
- **Dilation**: Restores the true size of detected objects.

### Step 4 — Hysteresis Thresholding

Ensures spatial consistency: pixels with a high score (> 45) are **strong seeds**. Low score pixels (> 20) are retained only if they are **adjacent to a strong pixel** (propagation via 4-connectivity), until global convergence.

### Step 5 — Motion Coloring

Validated pixels are colored in transparent red on top of the original image, visualizing motion while preserving the underlying video content.

---

## From Sequential C++ to GPU: A Profiling-Driven Approach

Optimization was not performed blindly — every architectural decision was justified by precise profiling metrics using **NVIDIA Nsight Systems** (global temporal analysis) and **NVIDIA Nsight Compute** (fine-grained GPU kernel analysis).

### Baseline: C++ Implementation (CPU)

The reference sequential implementation processes pixels one by one in two nested loops. It serves as the **ground truth** to validate the accuracy of each GPU version (SSIM = 1.0000).

| Implementation | Time (s) | Throughput (FPS) | Speedup |
| :------------- | :------: | :--------------: | :-----: |
| **C++ Reference** | 616.78 s | 5.29 FPS | 1.00× |

5.29 FPS — live video processing is impossible.

### Naive CUDA Port (×9.24)

The initial CUDA version consists of a **direct transposition**: each pixel is mapped to a GPU thread (2D grid, 16×16 blocks). Without any additional optimizations, moving to GPU immediately crosses the 30 FPS milestone.

| Implementation | Time (s) | Throughput (FPS) | Speedup | SSIM |
| :------------- | :------: | :--------------: | :-----: | :--: |
| C++ Reference | 616.78 s | 5.29 FPS | 1.00× | 1.0000 |
| **Naive CUDA** | 52.72 s | 48.92 FPS | **9.24×** | 0.9951 |

Major memory bottlenecks remained, revealed by profiling.

---

### The 6 Major Optimizations

#### Opti 1 & 2 — Lazy Memory + Switch to `float` (×18)

**Opti 1:** The initial version reallocated GPU buffers for every frame. With **Lazy Initialization**, memory is allocated once at startup, leaving only 2 PCIe transfers per frame (incoming frame → GPU, result → CPU).

**Opti 2:** Nsight Compute emitted an explicit warning regarding `double` precision overhead on consumer GPUs. Switching to `float` with `lroundf()` significantly accelerated floating-point operations.

![Nsight Compute: FP64 (`double`) overhead impact warning on consumer GPU](/assets/projects/irgpu/nsight_fp64_precision_warning.webp)

| Implementation | Throughput (FPS) | Speedup |
| :------------- | :--------------: | :-----: |
| Naive CUDA | 48.92 FPS | 9.24× |
| **CUDA Lazy Mem + Float** | 95.43 FPS | **18.03×** |

#### Opti 3 — Replacing `cuRAND` with a Lightweight LCG (×18.7)

Nsight Systems reveals that `cuRAND` allocates a **48-byte structure per pixel** in VRAM for its internal state: on HD 1080p video, this consumes ~95 MB just for random generation!

![Nsight Systems: VRAM overhead caused by `curandState`](/assets/projects/irgpu/nsight-curand.webp)

| Resolution | `curandState` Allocation Size |
| :--------- | :---------------------------: |
| 320×240 | ~3.5 MB |
| 1920×1080 | ~94.9 MB |

| cuRAND Allocation (320×240) | cuRAND Allocation (1080p) |
| :-------------------------: | :-----------------------: |
| ![cuRAND 320x240](/assets/projects/irgpu/cudamalloc_vram_profiling_small.webp) | ![cuRAND 1080p](/assets/projects/irgpu/cudamalloc_vram_profiling_large.webp) |

**Solution:** A **Linear Congruential Generator (LCG)** computed on the fly from the pixel index and frame number — zero additional VRAM bytes required.

| Throughput `cuRAND` | Throughput `fast_rand` |
| :-----------------: | :--------------------: |
| ![Throughput cuRAND](/assets/projects/irgpu/throughput-curand.webp) | ![Throughput fast_rand](/assets/projects/irgpu/throughput-fast-rand.webp) |

#### Opti 4 — Hysteresis Thresholding in Shared Memory (×23.5)

Hysteresis propagation requires multiple passes until convergence. Without optimization, each iteration triggers CPU/GPU synchronizations and VRAM bandwidth saturation.

![VRAM memory access saturation without Shared Memory](/assets/projects/irgpu/vram_saturation_no_shared_memory.webp)

**Solution:** 16×16 tiling in **Shared Memory** with a +1 pixel halo. Propagation from strong pixels to neighboring weak pixels occurs locally, without global VRAM accesses.

| VRAM Analysis Before | VRAM Analysis After |
| :------------------: | :-----------------: |
| ![Before Shared Memory](/assets/projects/irgpu/hysteresis_memory_before.webp) | ![After Shared Memory](/assets/projects/irgpu/hysteresis_memory_after.webp) |

Result: VRAM requests were reduced 8-fold (from 139 K to 17.7 K per iteration), adding **+26% pure execution speedup** on this kernel alone.

#### Opti 5 — Tiled Morphological Opening (×24.1)

Erosion and dilation read 29 neighboring pixels per thread directly from global VRAM. Tiling into **Shared Memory** (halo 2×R) with disk offsets stored in **Constant Memory** cut VRAM traffic in half (10.69 → 5.44 GB/s).

#### Opti 6 — 32×8 Block Geometry (×24.5)

Nsight Compute revealed that a **32×8** block geometry (256 threads) aligns perfectly with the size of a CUDA warp (32 threads) in the horizontal direction, maximizing **memory coalescence** during image row accesses.

![Nsight Compute: memory coalescence and warp alignment (32×8 blocks)](/assets/projects/irgpu/analyse-blocks-32x8.webp)

---

### CUDA Parallel Design Patterns Analysis

Within the GPU architecture of the project, we evaluated key parallel design patterns:

- **Stencil Pattern** ✅: Heavily used for morphological opening and hysteresis (local neighborhood in Shared Memory).
- **Reduction Pattern** ❌: The hysteresis convergence flag (idempotent write `false → true`) creates no race conditions — eliminating the need for `atomicOr`.
- **Scan Pattern** ❌: Unsuited for local pixel-wise operations.

---

## Results & Benchmarks

### Summary Table

| Implementation | Time (s) | Throughput (FPS) | Speedup | SSIM Accuracy |
| :------------- | :------: | :--------------: | :-----: | :-----------: |
| C++ Reference | 616.78 s | 5.29 FPS | 1.00× | 1.0000 |
| Naive CUDA | 52.72 s | 48.92 FPS | 9.24× | 0.9951 |
| CUDA Lazy Mem + Float | 18.18 s | 95.43 FPS | 18.03× | 0.9950 |
| CUDA Fast Random | 17.01 s | 98.96 FPS | 18.70× | 0.9950 |
| CUDA Shared Mem Hysteresis | 10.80 s | 124.34 FPS | 23.49× | 0.9949 |
| CUDA Tiling Opening | 10.65 s | 127.57 FPS | 24.10× | 0.9949 |
| **CUDA Final (32×8 Blocks)** | **10.56 s** | **129.51 FPS** | **24.47×** | **0.9949** |

### Global Performance Comparison

![FPS throughput comparison and overall speedup across dataset](/assets/projects/irgpu/benchmark_fps_comparison.webp)

From **5.29 FPS** to **129.51 FPS**: a **×24.47 speedup** with near-perfect visual accuracy (SSIM = 0.9949), proving that every optimization stage — from memory layout to random number generation — contributed directly to the final result.

---

### Real-Time Live Video Motion Detection Demo

<video src="/assets/projects/irgpu/motion_detection_demo.mp4" autoplay loop muted playsinline class="project-video-demo" title="CUDA Real-Time Motion Detection Demo"></video>
