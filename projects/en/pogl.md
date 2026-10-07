---
id: pogl
name: "POGL"
title: "Real-time fluid simulation"
tagline: "Real-time 3D SPH engine: over 75,000 particles at 60 FPS, with physics in compute shaders and screen-space fluid rendering (SSFR)."
thumbnail: "/assets/projects/pogl/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/pogl/thumbnail-16x9-light.webp"
stack: ["C++20", "OpenGL 4.6", "GLSL", "Compute Shaders", "CMake", "Dear ImGui"]
period: "1 month"
team: 2
github: "https://github.com/talvinckb/OpenGL-Water-Simulation"
demo: null
report: null
brief:
  problem: "Simulate and render a convincing 3D fluid in real time."
  approach: "SPH physics fully on the GPU in compute shaders (spatial hashing, bitonic sort), five-pass SSFR surface rendering."
  result: "Over 75,000 particles at 60 FPS, with zero CPU ↔ GPU transfers during the simulation."
---

## A real-time 3D fluid engine

We built this engine as a pair, in C++20 and OpenGL 4.6 (core profile), for the object-oriented programming and OpenGL course (POGL) at EPITA. It simulates and renders **over 75,000 particles at 60 FPS**.

Our goal was to run two building blocks of computer graphics together:

- the physics, using smoothed particle hydrodynamics (SPH), computed entirely in compute shaders and accelerated by 3D spatial hashing and a GPU bitonic sort in $O(N \log^2 N)$;
- screen-space fluid rendering (SSFR), a multi-pass pipeline that turns the particle cloud into a continuous water surface, with bilateral filtering, refraction attenuated by the Beer-Lambert law, and Fresnel reflections.

## All particle data stays in VRAM

The engine follows data-oriented design: all particle data resides in VRAM, in _shader storage buffer objects_ (SSBOs) using the `std430` layout. This avoids any unnecessary PCIe transfer between the CPU and the GPU on every frame.

Two distinct loops chain together on every frame:

| Phase           | Responsibility                 | Tool              |
| :-------------- | :----------------------------- | :---------------- |
| CPU             | Inputs, SimSettings parameters | C++20, Dear ImGui |
| GPU (physics)   | 7 compute shader passes        | GLSL 4.60         |
| GPU (rendering) | 5 graphics shader passes (SSFR) | GLSL 4.60        |

The eight SSBOs allocated in VRAM hold positions, velocities, densities, the spatial hash and the rendering buffers. They never go back through the CPU: **zero CPU ↔ GPU transfers during the simulation**.

## SPH physics in compute shaders

SPH is a Lagrangian formulation of the Navier-Stokes equations: the fluid is a set of particles whose density, pressure and viscosity are estimated by weighted interpolation over their neighbors, using smoothing kernels.

### Density and pressure

The local density $\rho_i$ of a particle is the sum of contributions from its neighbors $j$ within radius $h$:

$$\rho_i = \sum_{j} W_{\text{spiky2}}(\|\mathbf{r}_i - \mathbf{r}_j\|, h)$$

A second, very short-range density, $\rho_{\text{near}, i}$ (_Spiky Power 3_ kernel), strongly repels particles that get too close and keeps them from clumping. Pressure follows from the deviation from the target density $\rho_0$:

$$P_i = k \cdot (\rho_i - \rho_0), \qquad P_{\text{near}, i} = k_{\text{near}} \cdot \rho_{\text{near}, i}$$

### Forces and integration

Pressure and viscosity forces are applied symmetrically (Newton's third law):

$$\mathbf{F}_{\text{pressure}, i} = -\sum_{j} \frac{P_i + P_j}{2 \rho_j} \nabla W_{\text{spiky2}}(\|\mathbf{r}_{ij}\|, h) \cdot \hat{\mathbf{r}}_{ij}$$

$$\mathbf{F}_{\text{viscosity}, i} = \mu \sum_{j} (\mathbf{v}_j - \mathbf{v}_i) \cdot W_{\text{poly6}}(\|\mathbf{r}_{ij}\|, h)$$

![SPH density maps and smoothing kernel behavior](/assets/projects/pogl/density.webp)

### Neighbor search: spatial hashing and bitonic sort

Done naively, neighbor search costs $O(N^2)$, which rules out 75,000 particles. So we split the 3D domain into a regular grid (cells of size $h$), which brings the search down to $O(1)$. It takes three compute passes:

1. Each particle computes the hash of its 3D cell $\lfloor \mathbf{P}/h \rfloor$ with a prime-coefficient hash function.
2. A bitonic sort orders the `(particleIndex, cellKey)` pairs in parallel on the GPU, in $O(\log^2 N)$ steps and with no transfer to the CPU.
3. A last pass finds the first index of each cell in the sorted array. Each particle then only explores 27 cells: its own and its 26 neighbors.

<video preload="none" poster="/assets/projects/pogl/fluid_2d_to_3d_transformation-poster.webp" controls src="/assets/projects/pogl/fluid_2d_to_3d_transformation.mp4" loop muted playsinline class="project-video-demo" title="SPH solver evolution and transition from 2D domain to 3D volume"></video>

## Screen-space fluid rendering (SSFR)

Drawn as plain spheres, the particles look disjointed. Screen-space fluid rendering turns this point cloud into a continuous liquid surface, in **five successive shader passes**.

<div class="pipeline-workflow" title="Click to enlarge workflow diagram">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Depth map</span>
    <span class="pipeline-step__sub">Point sprites (R32F)</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">Bilateral blur</span>
    <span class="pipeline-step__sub">Profile smoothing</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Normal map</span>
    <span class="pipeline-step__sub">3D reconstruction</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">Thickness map</span>
    <span class="pipeline-step__sub">Beer-Lambert</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">Composite</span>
    <span class="pipeline-step__sub">Fresnel and refraction</span>
  </div>
</div>

### Pass 1: depth map

Each particle is emitted as a _point sprite_, then projected as a 3D sphere in `fluid_depth.frag`: fragments outside the radius are discarded and the exact depth $z_{\text{eye}}$ is written to a `GL_R32F` texture.

![Pass 1: raw depth map of individual spheres](/assets/projects/pogl/base_depth.webp)

### Pass 2: bilateral filtering

A separable bilateral filter, in two passes (horizontal and vertical), smooths the depth map without blurring the edges. Each sample is weighted by both its distance and its depth difference:

$$W(i, j) = \exp\!\left(-\frac{\|\mathbf{x}_i - \mathbf{x}_j\|^2}{2 \sigma_s^2}\right) \cdot \exp\!\left(-\frac{|z_i - z_j|^2}{2 \sigma_r^2}\right)$$

![Pass 2: smoothed depth map, continuous surface](/assets/projects/pogl/smoothed_depth.webp)

### Pass 3: screen-space normals

The smoothed depth $z(u, v)$ gives back the 3D position $\mathbf{P}(u, v)$ of each pixel. Normals come from the cross product of the partial derivatives:

$$\mathbf{N} = \text{normalize}\!\left( \frac{\partial \mathbf{P}}{\partial x} \times \frac{\partial \mathbf{P}}{\partial y} \right)$$

![Pass 3: normal field reconstructed in screen space](/assets/projects/pogl/smoothed_normal.webp)

### Pass 4: thickness and absorption (Beer-Lambert)

The thickness of water crossed is accumulated with additive blending (`GL_ONE, GL_ONE`). Color attenuation follows the Beer-Lambert law:

$$I_{\text{refracted}} = I_{\text{scene}} \cdot \exp\!\left(-\text{thickness} \cdot \alpha \cdot (1 - \mathbf{C}_{\text{water}})\right)$$

![Pass 4: thickness map of the water volume](/assets/projects/pogl/thickness_map.webp)

### Pass 5: refraction and Fresnel reflections

The last pass combines all the buffers:

- refraction offsets the UVs in proportion to the surface normal ($\text{UV}_{\text{refracted}} = \text{UV} + \mathbf{N}_{xy} \cdot s_{\text{refraction}}$);
- Fresnel reflections follow Schlick's approximation, $F(\theta) = R_0 + (1 - R_0)(1 - \cos\theta)^p$: the water turns into a mirror at grazing angles;
- the Fresnel coefficient sets the mix between the attenuated refraction and the reflection of a procedural sky and the sun, with its specular highlight.

|                     Pass 5: reflection and refraction                     |                     Pass 5: sun specular highlights                     |
| :-----------------------------------------------------------------------: | :----------------------------------------------------------------------: |
| ![Pass 5: Fresnel reflection and refraction](/assets/projects/pogl/reflection.webp) | ![Pass 5: sun specular highlights](/assets/projects/pogl/sun_reflection.webp) |

## Live tuning with Dear ImGui

A Dear ImGui interface lets you tune the parameters while the simulation runs: particle count, gravity $g$, stiffness $k$, viscosity $\mu$, water color, absorption, Fresnel power and bilateral blur radius.

The camera orbits the scene (left click and drag), with scroll to zoom.

## GPU implementation details

- Workgroups hold 256 threads, a size chosen to keep both NVIDIA (warps) and AMD (wavefronts) GPUs well occupied.
- Explicit memory barriers (`GL_SHADER_STORAGE_BARRIER_BIT`) keep data consistent between the physics and rendering passes.
- FBOs follow window resizes without unnecessary reallocations.

## Real-time demo

<video preload="none" poster="/assets/projects/pogl/fluid_simulation_demo-poster.webp" controls src="/assets/projects/pogl/fluid_simulation_demo.mp4" loop muted playsinline class="project-video-demo" title="Real-time 3D SPH fluid simulation demo"></video>
