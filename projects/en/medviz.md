---
layout: project.njk
lang: "en"
id: medviz
name: "MedViz"
title: "Medical Prediction & 3D Visualization"
tagline: "End-to-end medical web application combining 3D DICOM CT scan processing, Quantile Machine Learning, and WebGL visualization to predict Pulmonary Fibrosis decline."
thumbnail: "/assets/projects/medviz/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/medviz/thumbnail-16x9-light.webp"
stack: ["Python", "FastAPI", "XGBoost", "Next.js", "Three.js", "Docker", "DICOM"]
period: "1 month"
team: 4
github: null
demo: null
report: null
---

## Context & Problem Statement

**Idiopathic Pulmonary Fibrosis (IPF)** is a chronic lung disease characterized by progressive scarring of lung tissue, irreversibly compromising respiratory capacity. The key clinical metric for tracking disease progression is **Forced Vital Capacity (FVC)**, measured in mL.

The goal of **MedViz** was to build a full-stack medical application capable of:

- **Processing 3D DICOM CT scans** to extract quantitative radiomic biomarkers.
- **Predicting FVC decline** over 3, 6, or 12 months using a Machine Learning model incorporating medical uncertainty.
- **Visualizing 3D lungs interactively** in a real-time web interface.

The project builds upon the **OSIC (Open Source Imaging Consortium)** challenge dataset, containing volumetric DICOM series and clinical patient metadata.

| Data Type | Format | Description |
| :-------- | :----- | :---------- |
| 3D CT Scanners | DICOM (`.dcm`) | Volumetric axial slice series |
| Clinical Data | CSV (`.csv`) | Patient metadata & historical FVC |

![Volumetric axial CT scan slices (OSIC patient)](/assets/projects/medviz/slices.webp)

---

## 3D Medical Image Processing

### 1. Hounsfield Normalization (DICOM Preprocessing)

Raw DICOM grayscale values vary between scanner manufacturers. They are converted to **Hounsfield Units (HU)**, a physical density scale calibrated to biological tissue density:

| Tissue | HU Range |
| :----- | :------: |
| Outer Air | ≈ −1000 HU |
| Lung Parenchyma | −900 to −400 HU |
| Soft Tissue / Water | ≈ 0 HU |
| Dense Fibrotic Tissue | > −250 HU |

![HU Standardization: (1) Raw DICOM slice, (2) Hounsfield thresholding](/assets/projects/medviz/hounsfield_normalization.webp)

### 2. Isotropic 3D Resampling

CT slice thickness varies across hospital equipment. To ensure consistent geometric and volumetric measurements, volumes are resampled to **1 voxel = 1 mm³** (3rd-order spline interpolation via `scipy.ndimage.zoom`).

### 3. Automatic 3D Lung Segmentation

Segmentation isolates lung parenchyma from surrounding tissue (bones, muscles, outer air) via a 6-step pipeline:

1. **Original CT Slice**: Raw input axial slice.
2. **FOV Boundary**: Masking field of view to exclude scanner borders.
3. **Raw Air (K-Means)**: Adaptive $K=2$ thresholding separating air from tissue.
4. **Internal Lungs**: Connected Component Analysis isolating the 2 main air cavities.
5. **Final Mask**: 3D morphological operations (closing, dilation) and noise cleanup (< 5% max volume).
6. **Segmented Lungs**: Final mask applied to original volume.

![3D Lung segmentation pipeline steps](/assets/projects/medviz/segmentation_steps_3d.webp)

### 4. 3D Volumetric Lung Reconstruction

Once the 2D axial slice stack is segmented, the masks are stacked in 3D space to reconstruct the complete respiratory system. The **Marching Cubes** algorithm (`skimage.measure.marching_cubes`) extracts the volumetric isosurface of the lung parenchyma, generating a high-fidelity 3D mesh.

![3D Lung parenchyma reconstruction from segmented slices](/assets/projects/medviz/lungs_3d_reconstruction.webp)

### 5. Extraction of Radiomic Biomarkers

From the validated 3D volume, three quantitative biomarkers are extracted per patient:

- **Total Lung Volume**: Sum of mask voxels multiplied by isotropic voxel spacing (in cm³).
- **HU Density Statistics**: Mean and standard deviation of Hounsfield densities within parenchyma.
- **Fibrosis Ratio**: Proportion of lung voxels with density > −250 HU (dense fibrotic tissue).

### 6. 3D Mesh Generation & WebGL Export (GLB)

The 3D isosurface mesh is optimized for web rendering via surface smoothing, vertex normal calculation, and export to **GLB / glTF 2.0** format via `trimesh` for real-time WebGL display in Three.js.

---

## Machine Learning Prediction: XGBoost Quantile

Rather than a single point estimate, MedViz trains **5 distinct XGBoost models** corresponding to quantiles of the FVC distribution:

| Quantile | Clinical Interpretation |
| :------: | :---------------------- |
| q = 0.025 | Lower bound 95% CI (worst case) |
| q = 0.10 | Lower bound 80% CI |
| **q = 0.50** | **Median — central prediction** |
| q = 0.90 | Upper bound 80% CI |
| q = 0.975 | Upper bound 95% CI (best case) |

### Confidence Index & Severity Score

A continuous **Confidence Index** $C \in [0.01, 0.99]$ is derived from the width of the 95% confidence interval.

![Temporal FVC predictions and quantile confidence intervals](/assets/projects/medviz/predictions.webp)

![GLI Severity Score and patient risk status](/assets/projects/medviz/disease_score_severity.webp)

---

## Results & Clinical Evaluation

Comparative benchmarks prove the **direct benefit of 3D radiomic biomarkers** over tabular clinical data alone:

| Model | MAE with Radiomics | MAE without Radiomics | MAE Gain | Radiomic Benefit |
| :---- | :----------------: | :------------------: | :------: | :--------------: |
| SVR (RBF) | 119.4 mL | 116.7 mL | −2.7 mL | ❌ None |
| **XGBoost** | **87.1 mL** | 94.7 mL | **+7.6 mL** | **✅ Significant** |
| Random Forest | 98.6 mL | 109.4 mL | +10.8 mL | **✅ Significant** |

**XGBoost with radiomics achieves 87.1 mL MAE**, confirming that 3D imaging features significantly enhance predictive accuracy.

![MAE and RMSE errors per architecture vs baseline](/assets/projects/medviz/metrics-mae-rmse.webp)

---

## Architecture & Deployment

MedViz adopts a **decoupled microservices architecture** in 2 Docker containers:

- **FastAPI Backend**: Documented REST routes (Swagger OpenAPI), background DICOM processing (`BackgroundTasks`), thread-safe SQLite database for ML results and 3D meshes.
- **Next.js / PulmoSight Frontend**: Real-time 3D rendering of `.glb` lung meshes via `@react-three/fiber`, interactive FVC charts, severity score gauge, and DICOM upload interface.

![Containerized Backend & Frontend Architecture (Docker)](/assets/projects/medviz/docker.webp)

### Code Quality & CI/CD Integration

The backend achieves **91% Pytest coverage** with a GitLab CI pipeline automating linting (`ruff`, `prettier`), unit testing (`pytest`), and static type checking (`ty check`, `tsc`).

![Continuous Integration Pipeline (GitLab CI)](/assets/projects/medviz/pipeline-cicd.webp)

---

### User Interface & Web Application Overview

![MedViz User Interface Overview](/assets/projects/medviz/user_interface_overview.webp)
