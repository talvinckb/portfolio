---
id: vtk-itk
name: "VTK-ITK"
title: "Brain tumor registration & longitudinal tracking"
tagline: "3D alignment of two brain MRI scans with ITK, tumor segmentation and multi-view visualization with VTK and PyQt6, to measure how a glioma's volume changes."
thumbnail: "/assets/projects/vtk-itk/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/vtk-itk/thumbnail-16x9-light.webp"
stack: ["Python", "ITK", "VTK", "PyQt6", "Matplotlib"]
period: "3 weeks"
team: 4
github: "https://github.com/Axthauvin/vtk-itk-project"
demo: null
report: null
brief:
  problem: "Quantify how a glioma evolves between two MRI scans of the same patient, months apart."
  approach: "3D registration with ITK, multi-Otsu and region-growing segmentation, 2D and 3D visualization with VTK and PyQt6."
  result: "The tumor grows from 4.72 to 7.64 cm³ between the two scans (+61.8%), with both acquisitions overlaid in an interactive view."
---

## Comparing two MRI scans of one patient

Following a glioma or glioblastoma over time means comparing MRI scans taken several months apart. From one session to the next, the patient's head is not in the same position: the two volumes have to be aligned before the tumors can be compared.

We built an application that:

1. aligns the two MRI volumes in 3D (registration) to compensate for head position changes between sessions;
2. isolates and segments the tumor on both acquisitions, before and after registration;
3. computes its volume in mm³ and cm³ to measure growth or regression;
4. displays in 2D and 3D the overlay of the anatomical structures and both tumors.

The data is two 3D MRI acquisitions in NRRD format: `case6_gre1.nrrd` (baseline scan, the fixed image) and `case6_gre2.nrrd` (follow-up scan, the moving image to register). On this case, the tumor volume grows by **61.8%** between the two scans.

## The PyQt6 and VTK application

The interface is written with PyQt6 in a dark theme (_Deep Slate_) and has two main views.

### Dashboard and measured volumes

Once the computations finish (they run in the background in `QThread` workers), the main dashboard appears:

![Dashboard: 3D view and synchronized 2D slices](/assets/projects/vtk-itk/dashboard.webp)

It brings together three areas:

- on the left, a 3D VTK view: both tumors overlaid as surfaces, inside the skull rendered as a semi-transparent volume;
- on the right, three 2D slices (sagittal X, coronal Y, axial Z) with synchronized sliders to move through the MRI;
- in the sidebar, the metric scores before and after registration, the optimization curve plotted with Matplotlib and the computed volumes.

| Metric                     | Value      |
| :------------------------- | :--------- |
| Tumor 1 volume (baseline)  | 4.72 cm³   |
| Tumor 2 volume (follow-up) | 7.64 cm³   |
| Volume change              | **+61.8%** |

## 3D registration with ITK

Registration searches for a spatial transformation $\mathcal{T}: \mathbf{x} \mapsto \mathbf{x}'$ that aligns the moving image $M(\mathbf{x})$ onto the fixed image $F(\mathbf{x})$.

### Three transforms

We implemented three transform types:

| Transform                        | Degrees of freedom | Use                                           |
| :------------------------------- | :----------------: | :-------------------------------------------- |
| Rigid (`VersorRigid3DTransform`) |         6          | Head movement between sessions                |
| Affine (`AffineTransform`)       |         12         | Global scaling and shear from the acquisition |
| B-spline (control point grid)    |         N          | Local tissue deformation                      |

### Optimizer settings

The ITK pipeline combines several settings:

- moment-based initialization (`CenteredTransformInitializer`), which aligns the centers of mass before optimizing;
- the Mattes mutual information metric (`MattesMutualInformationImageToImageMetricv4`), with a 50-bin histogram:
  $$\text{MI}(F, M) = \sum_{f} \sum_{m} p(f,m) \log \left( \frac{p(f,m)}{p(f)\,p(m)} \right)$$
- a 3-level multi-resolution pyramid (shrink factors `[4, 2, 1]`, Gaussian sigmas `[2, 1, 0]`) to avoid local minima;
- random sampling of 10% of the voxels at each iteration, **5× faster** with no loss of precision;
- automatic scale estimation (`RegistrationParameterScalesFromPhysicalShift`), which balances rotations (radians) and translations (millimeters).

### Optimizer convergence

The metric across iterations shows how it is minimized during registration:

![ITK optimizer convergence history](/assets/projects/vtk-itk/convergence.webp)

## Tumor segmentation and volume

### Automatic segmentation (multi-Otsu and solidity)

The automatic segmentation runs in three steps:

1. Multi-Otsu thresholding (`OtsuMultipleThresholdsImageFilter`) splits the grayscale histogram into 4 classes to isolate the hyperintense tumor core.
2. A morphological opening (`BinaryMorphologicalOpeningImageFilter`) with a 2D rectangular structuring element removes noise and detaches small vascular structures.
3. Connected components are labeled (`ConnectedComponentImageFilter`). For each component over 500 voxels, we compute its solidity:

$$\text{Solidity} = \frac{\text{Component voxel count}}{\text{3D bounding box volume}}$$

The most solid component is kept as the tumor.

### Semi-automatic segmentation by region growing

`ConfidenceConnectedImageFilter` starts from a seed point inside the tumor and grows into neighboring voxels whose intensity stays within:

$$\left[ \mu - c \cdot \sigma, \; \mu + c \cdot \sigma \right]$$

where $\mu$ and $\sigma$ are the mean and standard deviation of the current region, with $c = 2.3$.

### Computing the volume in cm³

The volume follows from the voxel count and the voxel spacing given by ITK, $(s_x, s_y, s_z)$:

$$V_{\text{tumor}} \; (\text{mm}^3) = N_{\text{voxels}} \times (s_x \times s_y \times s_z)$$
$$V_{\text{tumor}} \; (\text{cm}^3) = \frac{V_{\text{tumor}} \; (\text{mm}^3)}{1000}$$

## 2D and 3D rendering with VTK

Rendering goes through the VTK Python bindings and `QVTKRenderWindowInteractor`:

- Surface rendering (`vtkDiscreteMarchingCubes`) extracts the isosurfaces of the binary masks: tumor 1 in red (`#EF4444`), tumor 2 in blue (`#3B82F6`), at 0.95 opacity.
- Volume rendering (`vtkSmartVolumeMapper`) shows the skull and brain tissue in the background, nearly transparent (max opacity 0.08), through `vtkColorTransferFunction`.
- In 2D, `vtkImageBlend` blends the grayscale MRI with the semi-transparent color masks from `vtkImageMapToColors` in real time.

![3D surface rendering of the brain tumor over the volume](/assets/projects/vtk-itk/render-3d.webp)

## Observations, limits and next steps

Visual analysis of this case brings out three points:

- A visible cavity and scar indicate an earlier surgical resection.
- The tumor recurs at the margin of the resected area instead of growing as an isolated sphere.
- Unlike CT, whose values are calibrated in Hounsfield units, MRI intensities in the NRRD files are relative and uncalibrated, so tissue cannot be pre-filtered directly by density.

Next steps: integrate a 3D deep learning model (nnU-Net) to cope with contrast variations between MRI scans, and handle multifocal tumors.
