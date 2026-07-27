---
layout: project.njk
lang: "en"
id: pogl
name: "POGL"
title: "Real-Time Fluid Simulation Engine"
tagline: "Real-time 3D SPH fluid simulation engine handling 75,000+ particles at 60 FPS — full GPU physics via Compute Shaders and Screen-Space Fluid Rendering (SSFR)."
thumbnail: "/assets/projects/pogl/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/pogl/thumbnail-16x9-light.webp"
stack: ["C++20", "OpenGL 4.6", "GLSL", "Compute Shaders", "CMake", "Dear ImGui"]
period: "1 month"
team: 2
github: null
demo: null
report: null
---

## Context & Objectives

This project is a **real-time 3D fluid simulation engine** built in **C++20** and **OpenGL 4.6 Core Profile**, developed for the Object-Oriented Programming and OpenGL (POGL) course at EPITA.

The goal was to design an engine executing two core graphics pillars in parallel:

- **GPU Particle Physics Simulation** via Smoothed Particle Hydrodynamics (SPH), fully computed by **Compute Shaders**, accelerated by **3D Spatial Hashing** and a **Bitonic GPU Sort** in $O(N \log^2 N)$.
- **Screen-Space Fluid Rendering (SSFR)**, a multi-pass pipeline transforming discrete particle clouds into a smooth continuous water surface featuring bilateral filtering, Beer-Lambert refraction, and Fresnel reflections.

---

## Architecture: Data-Oriented Design GPU

The engine architecture follows **Data-Oriented Design (DOD)**: all particle data resides in **VRAM** as *Shader Storage Buffer Objects* (SSBOs) in `std430`, eliminating PCIe transfer overhead between CPU and GPU during simulation frames.

| Phase | Responsibility | Tool |
| :---- | :------------- | :--- |
| **CPU** | Inputs, SimSettings parameters | C++20, Dear ImGui |
| **GPU — Physics** | 7 Compute Shader passes | GLSL 4.60 |
| **GPU — Rendering** | 5 Graphics Shader passes (SSFR) | GLSL 4.60 |

---

## Physics Engine: GPU SPH Simulation

Particle interactions follow SPH Navier-Stokes fluid dynamics:

$$\rho_i = \sum_j m_j W(\mathbf{r}_i - \mathbf{r}_j, h)$$

$$\mathbf{F}_i^{\text{pression}} = -\sum_j m_j \left(\frac{P_i}{\rho_i^2} + \frac{P_j}{\rho_j^2}\right) \nabla W(\mathbf{r}_i - \mathbf{r}_j, h)$$

![SPH density maps and smoothing kernel behavior](/assets/projects/pogl/density.webp)

### 3D Spatial Hashing & Bitonic GPU Sort

Neighbor search evaluates particles within smoothing radius $h$. VRAM grid hashing and parallel **Bitonic Sort** reduce complexity from $O(N^2)$ to $O(N \log^2 N)$, enabling **75,000+ particles at 60 FPS**.

![SPH solver transition from 2D domain to 3D volume](/assets/projects/pogl/fluid_2d_to_3d_transformation.mp4)

---

## Screen-Space Fluid Rendering (SSFR)

The rendering pipeline converts particles into a realistic water surface across 5 passes:

1. **Depth Pass**: Render particle spheres into a depth buffer.
2. **Bilateral Blur Pass**: Smooth depth discontinuities while preserving sharp silhouette edges.
3. **Normal Reconstruction Pass**: Reconstruct 3D surface normals $\mathbf{N}$ from depth gradients.
4. **Thickness Pass**: Accumulate water volume depth via additive blending (Beer-Lambert law).
5. **Final Composite Pass**: Combine Fresnel reflection, refraction, and specular highlights.

| Pass 1: Raw Sphere Depth | Pass 2: Bilateral Smoothed Depth | Pass 3: Reconstructed 3D Normals |
| :----------------------: | :------------------------------: | :------------------------------: |
| ![Pass 1](/assets/projects/pogl/base_depth.webp) | ![Pass 2](/assets/projects/pogl/smoothed_depth.webp) | ![Pass 3](/assets/projects/pogl/smoothed_normal.webp) |

| Pass 5: Global Reflection & Refraction | Pass 5: Sun Specular Highlights |
| :------------------------------------: | :-----------------------------: |
| ![Refraction](/assets/projects/pogl/reflection.webp) | ![Specular](/assets/projects/pogl/sun_reflection.webp) |

---

### Real-Time Fluid Simulation Interactive Demo

<video src="/assets/projects/pogl/fluid_simulation_demo.mp4" autoplay loop muted playsinline class="project-video-demo" title="POGL Real-Time SPH Fluid Simulation Demo"></video>
