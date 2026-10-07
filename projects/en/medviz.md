---
id: medviz
name: "MedViz"
title: "Medical prediction & 3D visualization"
tagline: "A medical application that processes 3D CT scans, predicts the decline of pulmonary fibrosis with quantile regression and shows the lungs in 3D in the browser (WebGL)."
thumbnail: "/assets/projects/medviz/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/medviz/thumbnail-16x9-light.webp"
stack:
  ["Python", "FastAPI", "XGBoost", "Next.js", "Three.js", "Docker", "DICOM"]
period: "1 month"
team: 4
github: "https://github.com/talvinckb/Medviz"
demo: null
report: null
brief:
  problem: "Predict how lung capacity (FVC) evolves in pulmonary fibrosis patients from CT scans."
  approach: "Radiomic biomarkers extracted from the 3D volumes, quantile regression with XGBoost, 3D visualization in the browser (FastAPI, Next.js, Docker)."
  result: "MAE of 87.1 mL with XGBoost; the 3D biomarkers cut the error by 7.6 mL."
---

## Predicting FVC from CT scans

Idiopathic pulmonary fibrosis (IPF) is a chronic disease: scar tissue gradually builds up in the lungs and irreversibly reduces breathing capacity. Its progression is tracked with forced vital capacity (FVC), measured in mL.

With MedViz, our goal was an application that could:

- process 3D CT scans in DICOM format and extract quantitative radiomic biomarkers;
- predict how FVC evolves over 3, 6 or 12 months, with the uncertainty of each prediction;
- show the lungs in 3D, in real time, in an interactive web interface.

The data comes from the OSIC (Open Source Imaging Consortium) challenge: volumetric DICOM series and tabular clinical data (age, sex, smoking status, FVC history).

| Data type     | Format         | Description                      |
| :------------ | :------------- | :------------------------------- |
| 3D CT scans   | DICOM (`.dcm`) | Volumetric axial slice series    |
| Clinical data | CSV (`.csv`)   | Patient metadata and FVC history |

![Volumetric axial CT slices (OSIC patient)](/assets/projects/medviz/slices.webp)

## From raw DICOM to a disease score

The pipeline chains six steps, from the raw scan to the score shown in the interface:

<div class="pipeline-workflow" title="Click to enlarge workflow diagram">
  <div class="pipeline-step">
    <span class="pipeline-step__num">01</span>
    <span class="pipeline-step__title">Raw DICOM</span>
    <span class="pipeline-step__sub">3D CT scan</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">02</span>
    <span class="pipeline-step__title">HU normalization</span>
    <span class="pipeline-step__sub">DICOM preprocessing</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">03</span>
    <span class="pipeline-step__title">Segmentation</span>
    <span class="pipeline-step__sub">K-Means + 3D morpho</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">04</span>
    <span class="pipeline-step__title">3D radiomics</span>
    <span class="pipeline-step__sub">Biomarkers + GLB mesh</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step">
    <span class="pipeline-step__num">05</span>
    <span class="pipeline-step__title">ML prediction</span>
    <span class="pipeline-step__sub">Quantile XGBoost</span>
  </div>
  <div class="pipeline-arrow">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="pipeline-step pipeline-step--accent">
    <span class="pipeline-step__num">06</span>
    <span class="pipeline-step__title">Disease score</span>
    <span class="pipeline-step__sub">3D web visualization</span>
  </div>
</div>

## Processing the CT scans in 3D

### 1. Hounsfield unit normalization

Raw grey levels in a DICOM file depend on the scanner manufacturer and have no direct physical meaning. We convert them to Hounsfield units (HU), an absolute scale calibrated on tissue density:

| Tissue                |    HU range     |
| :-------------------- | :-------------: |
| Outer air             |   ≈ −1000 HU    |
| Lung parenchyma       | −900 to −400 HU |
| Soft tissue / water   |     ≈ 0 HU      |
| Dense fibrotic tissue |    > −250 HU    |

Once in HU, thresholding isolates the clinically relevant regions and makes the data comparable from one patient to the next.

![HU normalization: (1) raw DICOM slice, (2) Hounsfield thresholding](/assets/projects/medviz/hounsfield_normalization.webp)

### 2. Isotropic resampling

Slice thickness varies from one scanner to another. To keep geometric and volumetric measurements comparable across patients, we resample every volume to 1 voxel = 1 mm³ (third-order spline interpolation with `scipy.ndimage.zoom`).

### 3. Lung segmentation

Segmentation separates the lung parenchyma from the surrounding tissue (bone, muscle, outer air). It runs in six steps, numbered as in the figure:

1. the original axial slice;
2. field-of-view (FOV) masking, which excludes the scanner borders;
3. adaptive thresholding with K-Means ($K=2$), which separates air from tissue;
4. connected component analysis, which isolates the two main air cavities;
5. the final mask: 3D morphological operations (closing, dilation) and noise cleanup (< 5% of the max volume);
6. the segmented lungs, with the mask applied to the original image.

![3D lung segmentation steps](/assets/projects/medviz/segmentation_steps_3d.webp)

### 4. 3D lung reconstruction

The 2D masks of the axial slices are stacked into a volume. The marching cubes algorithm (`skimage.measure.marching_cubes`) extracts the isosurface of the parenchyma, which gives a 3D model of both lungs.

![3D reconstruction of the lung parenchyma from the segmented slices](/assets/projects/medviz/lungs_3d_reconstruction.webp)

### 5. Radiomic biomarkers

From the reconstructed volume and its mask, we extract three biomarkers per patient:

- total lung volume: the number of mask voxels multiplied by the isotropic spacing (in cm³);
- the mean and standard deviation of Hounsfield densities within the parenchyma;
- the fibrosis ratio: the share of lung voxels denser than −250 HU (dense fibrotic tissue).

### 6. 3D mesh and GLB export

The mesh is then prepared for interactive display, in two steps:

1. surface smoothing and simplification (vertex normalization, surface normals);
2. export to GLB / glTF 2.0 with `trimesh`, which Three.js renders in real time in the browser (WebGL).

## Quantile regression with XGBoost

Rather than a single value, we predict a distribution: five separate XGBoost models, one per FVC quantile.

|   Quantile   | Clinical interpretation                |
| :----------: | :------------------------------------- |
|  q = 0.025   | Lower bound of the 95% CI (worst case) |
|   q = 0.10   | Lower bound of the 80% CI              |
|   q = 0.50   | Median, central prediction             |
|   q = 0.90   | Upper bound of the 80% CI              |
|  q = 0.975   | Upper bound of the 95% CI (best case)  |

Each model takes the target week, age, lung volume, mean and standard deviation of HU, fibrosis ratio, sex, smoking status, baseline FVC and baseline week, and the time delta.

### Confidence index and severity score

A continuous confidence index, $C \in [0.01, 0.99]$, is derived from the width of the 95% interval: the narrower the interval, the higher the index.

![FVC predictions over time and quantile intervals](/assets/projects/medviz/predictions.webp)

To place the patient against a medical reference, the severity score divides their baseline FVC by the optimal FVC given by the GLI-2012 (Global Lung Function Initiative) equations, which depend on age, height and sex:

<div style="text-align: center; font-size: 1.1rem; margin-block: 1rem;">
$$ \text{Score} = \frac{\text{FVC}_{\text{Baseline}}}{\text{FVC}_{\text{Optimal}}} $$
</div>

![GLI severity score and patient risk status](/assets/projects/medviz/disease_score_severity.webp)

## Results: what the 3D biomarkers add

To measure what the 3D biomarkers bring, we trained three models with and without them, on top of the clinical data:

| Model         | MAE with radiomics | MAE without radiomics | MAE gain | Radiomic benefit |
| :------------ | :----------------: | :-------------------: | :------: | :--------------: |
| SVR (RBF)     |      119.4 mL      |       116.7 mL        | −2.7 mL  |    Not useful    |
| **XGBoost**   |    **87.1 mL**     |        94.7 mL        | +7.6 mL  |      Useful      |
| Random Forest |      98.6 mL       |       109.4 mL        | +10.8 mL |      Useful      |

With the 3D biomarkers, XGBoost reaches an MAE of **87.1 mL**, the best result, against 94.7 mL without them. They also lower Random Forest's error (from 109.4 to 98.6 mL), but not the SVR's, which goes from 116.7 to 119.4 mL.

![LLL score with and without radiomic biomarkers](/assets/projects/medviz/metrics_radiomics_comparison.webp)

![MAE and RMSE of each model, compared with the baseline](/assets/projects/medviz/metrics-mae-rmse.webp)

## Two containers: FastAPI and Next.js

The application runs in two independent Docker containers:

- the FastAPI backend exposes documented REST routes (Swagger OpenAPI), processes DICOM files in the background (`BackgroundTasks`) and stores ML results and 3D meshes in a thread-safe SQLite database;
- the Next.js frontend, PulmoSight, renders the `.glb` lung mesh in real-time 3D with `@react-three/fiber`, along with interactive FVC charts, the severity score gauge and the DICOM upload.

![Containerized architecture: backend and frontend (Docker)](/assets/projects/medviz/docker.webp)

### Tests and continuous integration

Tests cover **91%** of the Python backend. The CI/CD pipeline (GitLab CI) runs three automated stages: style checks (`ruff`, `prettier`), unit tests (`pytest`) and static type checking (`ty check`, `tsc`).

| Backend module           | Pytest coverage |
| :----------------------- | :-------------: |
| `database.py`            |      100%       |
| `schemas.py`             |      100%       |
| `logger.py`              |       94%       |
| `services.py`            |       94%       |
| `routes.py`              |       89%       |
| `processing/pipeline.py` |       80%       |
| **Total**                |     **91%**     |

![Continuous integration pipeline (GitLab CI)](/assets/projects/medviz/pipeline-cicd.webp)

### The PulmoSight interface

![Overview of the MedViz user interface](/assets/projects/medviz/user_interface_overview.webp)
