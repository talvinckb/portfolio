---
layout: project.njk
lang: "en"
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

Real-time motion detection is a fundamental building block of video surveillance, automated video analysis, and robotics. The objective of this project was to design a **background subtraction filter** capable of running at **30+ FPS** in High Definition, constrained to rely strictly on **NVIDIA CUDA** and the **GStreamer** multimedia framework.

### Technical Challenges

- **CPU Bottleneck**: The reference sequential C++ implementation achieves only **5.29 FPS** — far below the 30 FPS real-time threshold.
- **High Data Parallelism**: Every pixel in every frame undergoes 5 sequential operations, an ideal candidate for GPU parallelization, but memory access patterns and random generation require fine-grained tuning.
- **Rigorous Validation**: All CUDA optimizations must maintain near-perfect visual accuracy compared to the CPU reference (SSIM ≈ 1.0000).

---

## Pipeline Overview

Processing runs frame-by-frame across **5 sequential stages** where each pixel is evaluated independently:

```
[01. RGB Source] ──> [02. Grayscale] ──> [03. Morpho Opening] ──> [04. Background Sub] ──> [05. Hysteresis]
```

---

## Progressive GPU Optimizations (Guided by Nsight)

### Optimization 1 & 2 — Naive CUDA Kernel & Precision Tuning (×18.0)

Porting loops to parallel CUDA grids yielded an immediate 9.2× speedup. Profiling with Nsight Compute revealed double-precision FP64 instructions (`double`) causing register pressure. Replacing constants with single-precision FP32 (`float`) boosted speedup to **×18.0**.

![Nsight Compute: FP64 precision overhead warning](/assets/projects/irgpu/nsight_fp64_precision_warning.webp)

### Optimization 3 — Fast Random Number Generator (×18.7)

Standard `cuRAND` state initialization per thread incurred heavy VRAM allocation overhead. Replacing `cuRAND` with a lightweight Linear Congruential Generator (LCG) / XORShift kernel reduced memory traffic significantly.

| cuRAND Overhead | Fast LCG Kernel Throughput |
| :-------------: | :------------------------: |
| ![cuRAND](/assets/projects/irgpu/cudamalloc_vram_profiling_small.webp) | ![LCG](/assets/projects/irgpu/throughput-fast-rand.webp) |

### Optimization 4 — Hysteresis Thresholding in Shared Memory (×23.5)

Hysteresis thresholding checks neighboring pixel connectivity. Loading $3 \times 3$ pixel neighborhoods into **Shared Memory** reduced global VRAM requests from 139 K to 17.7 K per iteration, adding **+26% execution speed**.

| Before Shared Memory | After Shared Memory |
| :------------------: | :-----------------: |
| ![Before](/assets/projects/irgpu/hysteresis_memory_before.webp) | ![After](/assets/projects/irgpu/hysteresis_memory_after.webp) |

### Optimization 5 & 6 — Tiled Opening & 32×8 Block Geometry (×24.5)

Tiling the morphological disk kernel into Shared Memory and tuning block geometry to **32×8** (256 threads) aligned thread warps perfectly with memory transactions, maximizing **coalesced VRAM accesses**.

![Nsight Compute: memory coalescence and warp alignment (32x8 blocks)](/assets/projects/irgpu/analyse-blocks-32x8.webp)

---

## Results & Benchmarks

### Summary Table

| Implementation | Time (s) | Throughput (FPS) | Speedup | SSIM Accuracy |
| :------------- | :------: | :--------------: | :-----: | :-----------: |
| C++ Reference | 616.78 s | 5.29 FPS | 1.00× | 1.0000 |
| Naive CUDA | 52.72 s | 48.92 FPS | 9.24× | 0.9951 |
| CUDA Float Precision | 18.18 s | 95.43 FPS | 18.03× | 0.9950 |
| CUDA Fast Random | 17.01 s | 98.96 FPS | 18.70× | 0.9950 |
| CUDA Shared Mem Hysteresis | 10.80 s | 124.34 FPS | 23.49× | 0.9949 |
| **CUDA Final (32×8 Blocks)** | **10.56 s** | **129.51 FPS** | **24.47×** | **0.9949** |

### Global Performance Comparison

![FPS throughput comparison and overall speedup across dataset](/assets/projects/irgpu/benchmark_fps_comparison.webp)

From **5.29 FPS** to **129.51 FPS**: a **×24.47 speedup** with near-perfect visual precision (SSIM = 0.9949).

---

### Real-Time Live Video Motion Detection Demo

<video src="/assets/projects/irgpu/motion_detection_demo.mp4" autoplay loop muted playsinline class="project-video-demo" title="CUDA Real-Time Motion Detection Demo"></video>
