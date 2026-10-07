---
id: irgpu
name: "IRGPU"
title: "Real-time video motion detection — GPU port"
tagline: "CPU → GPU port of a real-time motion detection algorithm: ×24 faster with CUDA and six Nsight-guided optimizations."
thumbnail: "/assets/projects/irgpu/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/irgpu/thumbnail-16x9-light.webp"
stack: ["C++", "CUDA", "GStreamer", "Nsight Systems", "Nsight Compute"]
period: "4 weeks"
team: 4
github: null
demo: null
report: null
brief:
  problem: "The reference C++ version tops out at 5.29 FPS, far from the 30 FPS real-time bar."
  approach: "One thread per pixel, then six optimizations measured with Nsight: memory allocation, float, random generator, shared memory, tiling and block geometry."
  result: "129.5 FPS, a ×24.47 speedup, with output nearly identical to the CPU (SSIM 0.9949)."
---

## The goal: 30 FPS with CUDA

Real-time motion detection is used in video surveillance, video stream analysis and robotics. We had to build a background subtraction filter that runs at 30 FPS or more in high definition, using only NVIDIA CUDA and the GStreamer multimedia framework.

Three things made it hard:

- The sequential C++ reference reaches only 5.29 FPS, far below the 30 FPS real-time threshold.
- Every pixel of every frame goes through five successive steps, independent from one pixel to the next: an ideal case for the GPU, but its bottlenecks (memory, random number generation, morphology) needed careful analysis.
- Every CUDA optimization had to keep the output nearly identical to the CPU reference (SSIM close to 1.0000).

## The five-step pipeline

Each frame goes through five successive steps, and in each one every pixel is processed independently of the others, a structure that suits GPU parallelization well.

<div class="pipeline-workflow" title="Click to enlarge the diagram">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Source image</span>
    <span class="pipeline-step__sub">Raw RGB</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Estimated background</span>
    <span class="pipeline-step__sub">K = 3 reservoir model</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Motion mask</span>
    <span class="pipeline-step__sub">L₁ norm</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Morpho. opening</span>
    <span class="pipeline-step__sub">Erosion + dilation</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Hysteresis threshold</span>
    <span class="pipeline-step__sub">4-connected propagation</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Final result</span>
    <span class="pipeline-step__sub">Motion coloring</span>
  </div>
</div>

## Each step in detail

### Step 1: background estimation

This is the most complex step. For each pixel, the algorithm keeps K = 3 color reservoirs (`color` + `weight`) that model the possible backgrounds (noise, lighting changes…).

For each new frame and each pixel:

- If its color is close to an existing reservoir (tolerance of ±10 per channel), that reservoir's color is updated with a sliding weighted average and its weight increases.
- If no reservoir matches, the weakest one is replaced at random, with a probability inversely proportional to its weight.

The estimated background of a pixel is the color of its highest-weight reservoir.

### Step 2: motion mask

The difference between the current pixel and the estimated background is measured with the L₁ norm (mean absolute difference over R, G and B). A high score flags a moving pixel.

### Step 3: morphological opening

The raw mask is noisy (leaves, video compression artifacts). A morphological opening with a disk of radius R = 3 removes these false positives:

- Erosion removes isolated pixels.
- Dilation restores the true size of the detected objects.

### Step 4: hysteresis thresholding

This step enforces spatial consistency. High-score pixels (> 45) are reliable seeds; low-score pixels (> 20) are kept only if they touch a strong pixel (4-connected propagation), and propagation repeats until convergence.

### Step 5: motion coloring

Kept pixels are tinted semi-transparent red over the original frame: motion shows up without hiding the scene.

## From CPU to GPU, guided by Nsight

We optimized nothing blindly: every choice started from a measurement, with NVIDIA Nsight Systems for the overall timeline and NVIDIA Nsight Compute for fine-grained analysis of each kernel.

### Starting point: 5.29 FPS on the CPU

The sequential reference walks through the pixels one by one, in two nested loops. It is the ground truth used to validate the accuracy of every GPU version (its own SSIM is 1.0000 by definition).

| Implementation  | Time (s) |   FPS    | Speedup |
| :-------------- | :------: | :------: | :-----: |
| C++ (reference) | 616.78 s | 5.29 FPS |  ×1.00  |

At 5.29 FPS, live video processing is out of reach.

### Naive CUDA port: ×9.24

The first CUDA version is a direct transposition: one GPU thread per pixel (2D grid, 16×16 blocks). Without any optimization, it already crosses 30 FPS.

| Implementation  | Time (s) |    FPS    |  Speedup  |  SSIM  |
| :-------------- | :------: | :-------: | :-------: | :----: |
| C++ (reference) | 616.78 s | 5.29 FPS  |   ×1.00   | 1.0000 |
| Naive CUDA      | 52.72 s  | 48.92 FPS | **×9.24** | 0.9951 |

Large bottlenecks remained, and profiling brought them to light.

### Six measured optimizations

#### Optimizations 1 and 2: one allocation and `float` (×18)

The naive version reallocated the GPU buffers for every frame. With lazy initialization, memory is allocated once at startup, leaving only two PCIe transfers per frame: the incoming frame to the GPU, the result back to the CPU.

Nsight Compute also flagged the cost of `double` arithmetic on a consumer GPU. Switching to `float` (with `lroundf()`) made floating-point work clearly faster.

![Nsight Compute: warning about the cost of FP64 (`double`) on this GPU](/assets/projects/irgpu/nsight_fp64_precision_warning.webp)

| Implementation             |    FPS    |  Speedup   |
| :------------------------- | :-------: | :--------: |
| Naive CUDA                 | 48.92 FPS |   ×9.24    |
| + one allocation and float | 95.43 FPS | **×18.03** |

#### Optimization 3: an LCG instead of `cuRAND` (×18.7)

Nsight Systems showed that `cuRAND` allocates an internal state of **48 bytes per pixel** in VRAM: at 1080p, that is about 95 MB for the random number generator alone.

![Nsight Systems: VRAM used by the `curandState` structures](/assets/projects/irgpu/nsight-curand.webp)

| Resolution | `curandState` size |
| :--------- | :----------------: |
| 320×240    |      ~3.5 MB       |
| 1920×1080  |      ~94.9 MB      |

|                           cuRAND allocation (320×240)                            |                           cuRAND allocation (1080p)                            |
| :------------------------------------------------------------------------------: | :----------------------------------------------------------------------------: |
| ![cuRAND 320x240](/assets/projects/irgpu/cudamalloc_vram_profiling_small.webp) | ![cuRAND 1080p](/assets/projects/irgpu/cudamalloc_vram_profiling_large.webp) |

We replaced it with a linear congruential generator (LCG) computed on the fly from the pixel index and the frame number: no extra VRAM at all.

|                         `cuRAND` throughput                         |                          `fast_rand` throughput                           |
| :-----------------------------------------------------------------: | :-----------------------------------------------------------------------: |
| ![cuRAND throughput](/assets/projects/irgpu/throughput-curand.webp) | ![fast_rand throughput](/assets/projects/irgpu/throughput-fast-rand.webp) |

#### Optimization 4: hysteresis in shared memory (×23.5)

Hysteresis propagation needs several passes to converge. Without optimization, every iteration triggered a CPU/GPU synchronization and saturated the VRAM bandwidth.

![VRAM accesses saturated without shared memory](/assets/projects/irgpu/vram_saturation_no_shared_memory.webp)

We split the image into 16×16 tiles loaded into shared memory, with a one-pixel halo: strong pixels propagate to their weak neighbors locally, without touching VRAM.

|                             VRAM analysis before                              |                             VRAM analysis after                             |
| :---------------------------------------------------------------------------: | :-------------------------------------------------------------------------: |
| ![Before shared memory](/assets/projects/irgpu/hysteresis_memory_before.webp) | ![After shared memory](/assets/projects/irgpu/hysteresis_memory_after.webp) |

VRAM requests drop 8-fold (from 139K to 17.7K per iteration), and this kernel alone runs 26% faster.

#### Optimization 5: tiled morphological opening (×24.1)

Erosion and dilation read 29 neighboring pixels per thread straight from global memory. With shared-memory tiles (2×R halo) and the disk offsets in constant memory, VRAM traffic is halved (from 10.69 to 5.44 GB/s).

#### Optimization 6: 32×8 thread blocks (×24.5)

Nsight Compute showed that with 32×8 blocks (256 threads), the block width matches a CUDA warp (32 threads), which maximizes memory coalescing on image rows.

![Nsight Compute: memory coalescing and warp alignment (32×8 blocks)](/assets/projects/irgpu/analyse-blocks-32x8.webp)

### Parallel programming patterns

We also checked which classic parallel patterns applied to the project:

- The stencil pattern is used for the morphological opening and the hysteresis (local neighborhood in shared memory).
- A reduction is not needed: the hysteresis convergence flag only ever goes from `false` to `true` (an idempotent write), so there is no race condition and no need for `atomicOr`.
- A scan does not fit local, per-pixel processing.

## From 5.29 to 129.51 FPS

### Overall performance comparison

<figure class="bars" data-bars style="--max: 160; --goal: 30">
<p class="bars__title">Frames per second, version by version</p>
<div class="bars__axis" aria-hidden="true"><span class="bars__track"><span class="bars__goal">30 FPS, real time</span></span></div>
<ol class="bars__rows" role="list">
<li class="bars__row is-base" style="--v: 5.29; --i: 0" tabindex="0"><span class="bars__label">C++ (reference)</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">5.29 FPS</span><span class="bars__more">×1.00 · 616.78 s · SSIM 1.0000</span></span></li>
<li class="bars__row" style="--v: 48.92; --i: 1" tabindex="0"><span class="bars__label">Naive CUDA</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">48.92 FPS</span><span class="bars__more">×9.24 · 52.72 s · SSIM 0.9951</span></span></li>
<li class="bars__row" style="--v: 95.43; --i: 2" tabindex="0"><span class="bars__label">+ one allocation and float</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">95.43 FPS</span><span class="bars__more">×18.03 · 18.18 s · SSIM 0.9950</span></span></li>
<li class="bars__row" style="--v: 98.96; --i: 3" tabindex="0"><span class="bars__label">+ LCG generator</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">98.96 FPS</span><span class="bars__more">×18.70 · 17.01 s · SSIM 0.9950</span></span></li>
<li class="bars__row" style="--v: 124.34; --i: 4" tabindex="0"><span class="bars__label">+ shared-memory hysteresis</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">124.34 FPS</span><span class="bars__more">×23.49 · 10.80 s · SSIM 0.9949</span></span></li>
<li class="bars__row" style="--v: 127.57; --i: 5" tabindex="0"><span class="bars__label">+ tiled opening</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">127.57 FPS</span><span class="bars__more">×24.10 · 10.65 s · SSIM 0.9949</span></span></li>
<li class="bars__row" style="--v: 129.51; --i: 6" tabindex="0"><span class="bars__label">+ 32×8 blocks (final version)</span><span class="bars__track"><span class="bars__bar"></span><span class="bars__value">129.51 FPS</span><span class="bars__more">×24.47 · 10.56 s · SSIM 0.9949</span></span></li>
</ol>
<figcaption>Throughput of each version on the dataset. The vertical line marks the 30 FPS of real time; the table below details each version.</figcaption>
</figure>

From 5.29 FPS to 129.51 FPS, a **×24.47** speedup, with output nearly identical to the reference (**SSIM 0.9949**). Every optimization, from memory management to the random generator, adds its share of the gain.

### The seven measured versions

| Implementation                  | Time (s) |    FPS     | Speedup |  SSIM  |
| :------------------------------ | :------: | :--------: | :-----: | :----: |
| C++ (reference)                 | 616.78 s |  5.29 FPS  |  ×1.00  | 1.0000 |
| Naive CUDA                      | 52.72 s  | 48.92 FPS  |  ×9.24  | 0.9951 |
| + one allocation and float      | 18.18 s  | 95.43 FPS  | ×18.03  | 0.9950 |
| + LCG generator                 | 17.01 s  | 98.96 FPS  | ×18.70  | 0.9950 |
| + shared-memory hysteresis      | 10.80 s  | 124.34 FPS | ×23.49  | 0.9949 |
| + tiled opening                 | 10.65 s  | 127.57 FPS | ×24.10  | 0.9949 |
| **+ 32×8 blocks (final version)** | 10.56 s  | 129.51 FPS | ×24.47  | 0.9949 |

### Real-time demo

<video preload="none" poster="/assets/projects/irgpu/motion_detection_demo-poster.webp" controls src="/assets/projects/irgpu/motion_detection_demo.mp4" loop muted playsinline class="project-video-demo" title="Real-time CUDA motion detection filter"></video>
