---
layout: project.njk
lang: "en"
id: vtk-itk
name: "VTK-ITK"
title: "Brain Tumor Registration & Longitudinal Tracking"
tagline: "Complete 3D alignment pipeline for brain MRI (ITK) and tumor segmentation with multi-view interactive visualization (VTK + PyQt6) — quantifying glioma volumetric evolution."
thumbnail: "/assets/projects/vtk-itk/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/vtk-itk/thumbnail-16x9-light.webp"
stack: ["Python", "ITK", "VTK", "PyQt6", "Matplotlib"]
period: "3 weeks"
team: 4
github: "https://github.com/Axthauvin/vtk-itk-project"
demo: null
report: null
---

## Context & Objectives

Longitudinal monitoring of **brain gliomas and glioblastomas** relies on comparing MRI scans acquired several months apart. This project provides a full medical image processing and 3D visualization pipeline to:

- **Geometrically align (3D Registration)** two MRI volumes of a patient to compensate for head position variations between sessions.
- **Isolate & Segment the tumor mass** before and after registration.
- **Compute precise volumetric evolution** (in $\text{mm}^3$ and $\text{cm}^3$) to quantify growth or regression.
- **Visualize anatomical alignment in 2D and 3D**.

The project processes two 3D MRI acquisitions in **NRRD** format:
`case6_gre1.nrrd` (initial baseline scan — fixed image) and `case6_gre2.nrrd` (follow-up scan — moving image).

---

## Graphical User Interface (PyQt6 + VTK)

The application is built with **PyQt6** using a medical *Deep Slate* dark theme featuring multi-view synchronized viewports:

![Results Dashboard — Synchronized 3D visualization and 2D slices](/assets/projects/vtk-itk/dashboard.webp)

The dashboard combines a **3D VTK Viewport** (surface rendering of superimposed baseline and follow-up tumors with semi-transparent skull) alongside **2D Orthogonal Viewports** (Axial, Coronal, Sagittal).

---

## 3D Image Registration Pipeline (ITK)

The pipeline employs an **Optimized Multi-Resolution Registration** workflow:

```
[Fixed MRI] ──┐
              ├──> [Mattes Mutual Info] ──> [Transform Matrix] ──> [Resampled Follow-Up MRI]
[Moving MRI] ─┘
```

| Component | Choice | Rationale |
| :-------- | :----- | :-------- |
| **Transform** | `VersorRigid3DTransform` | 6 DOF (3 translations, 3 rotations), preserves brain geometry |
| **Metric** | `MattesMutualInformation` | Robust for multi-modal / mono-modal MRI intensity variations |
| **Optimizer** | `RegularStepGradientDescent` | Adaptive step size, guarantees convergence |
| **Interpolator** | `LinearInterpolateImageFunction` | Fast, high-fidelity voxel resampling |

![ITK Optimizer Convergence History](/assets/projects/vtk-itk/convergence.webp)

---

## Tumor Segmentation & Volumetric Quantification

Tumors are segmented using ITK's `ConfidenceConnectedImageFilter`, growing regions from seed points based on intensity statistics:

$$V_{\text{tumor}} \; (\text{mm}^3) = N_{\text{voxels}} \times (s_x \times s_y \times s_z)$$

$$V_{\text{tumor}} \; (\text{cm}^3) = \frac{V_{\text{tumor}} \; (\text{mm}^3)}{1000}$$

---

## Interactive 3D Visualization (VTK)

- **3D Surface Rendering** (`vtkDiscreteMarchingCubes`) — Baseline Tumor in **red** `#EF4444`, Follow-Up Tumor in **blue** `#3B82F6`.
- **Anatomical Volume Rendering** (`vtkSmartVolumeMapper`) — Skull and brain tissue rendered semi-transparently.
- **2D Multi-Layer Fusion** (`vtkImageBlend`) — Real-time blending of grayscale MRI with colored segmentation masks.

![3D Surface Rendering and Volumetric Overlay of Brain Tumor](/assets/projects/vtk-itk/render-3d.webp)
