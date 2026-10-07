---
id: pfee-bnf
name: "PFEE — BnF"
title: "Segmentation & classification of heritage illustrations"
tagline: "Automatically detecting, reorienting and classifying the illustrations in Gallica's digitized documents, in partnership with the National Library of France (BnF)."
thumbnail: "/assets/projects/pfee-bnf/thumbnail-16x9.webp"
thumbnailLight: "/assets/projects/pfee-bnf/thumbnail-16x9-light.webp"
stack:
  [
    "Python",
    "Deep Learning",
    "YOLO",
    "ConvNeXt",
    "PyTorch",
    "IIIF",
  ]
period: "8 months (ongoing)"
team: 4
github: null
demo: null
report: null
brief:
  problem: "Cataloguing the illustrations the BnF digitizes on Gallica is still largely manual."
  approach: "Illustration detection on the page (YOLO26l), cropping, then classification of each illustration (ConvNeXt)."
  result: "A detector at 0.956 AP50 and 0.856 precision at 95% recall, just as good on books never seen in training; the detection → classification pipeline runs end to end. Final delivery due end of January 2027."
  role: "The whole detection side (dataset, training, evaluation, YOLO vs Florence-2 comparison), and the shared command line that chains detection and classification."
---

## Cataloguing Gallica's illustrations

The National Library of France (BnF) continuously digitizes its collections and publishes them on Gallica, its digital library. These millions of pages contain illustrations (engravings, maps, scientific diagrams, photographs…) whose cataloguing is still largely manual.

This 8-month final-year project (PFEE), run in partnership with the BnF, aims to automate that work:

1. locate each illustration on the digitized page;
2. reorient illustrations that were scanned sideways or upside down;
3. classify each illustration along the BnF's multi-criteria annotation grid;
4. deliver the best-performing combination of models to the BnF, for production use.

## The BnF annotated corpus

The BnF provides one dataset per task. For detection, it comes from a 2024-2025 annotation campaign: **6,078 Gallica views** where every illustration is marked with a bounding box. It is a second iteration: the boxes were pre-filled by a first model, then corrected by hand.

| Split      | Views | Illustrations | Views without illustration |
| :--------- | ----: | ------------: | -------------------------: |
| Train      | 4,839 |         8,910 |                        309 |
| Validation | 1,207 |         2,141 |                         89 |

The corpus is highly heterogeneous: photographs, posters, comics, plans, film rolls, stereoscopic views, typographic ornaments… Sizes vary just as much: in validation, a third of the illustrations cover more than half of the page, while one in twenty covers less than 1%.

For classification, illustrations are annotated along four axes defined by the BnF:

![The four axes of the BnF annotation grid: Form/Function, Genre, Rotation and Technique](/assets/projects/pfee-bnf/annotation_grid_labels.webp)

The grid alone has over 40 _Form/Function_ labels, plus 4 rotation classes and 5 printing techniques.

## A two-model pipeline

The pipeline chains two specialized models rather than one model doing everything:

1. Detection: YOLO finds each illustration on the page and returns its box with a confidence score.
2. Cropping: each box is cut out of the page as a standalone image.
3. Classification: ConvNeXt predicts the category of each crop.

The output is one annotated page per view plus a `predictions.jsonl` file, one line per page: box coordinates, detection score, predicted class and its confidence. Each model is trained and evaluated in its own module; the pipeline only chains the two trained models, behind a single command line that I wrote.

## Detecting illustrations with YOLO

This part is mine. The model used is YOLO26l (Ultralytics), pre-trained on COCO then fine-tuned on the BnF corpus with a single class, `Illustration`.

### Dataset preparation

I leave the BnF delivery untouched and derive a clean copy from it with a script:

- 22 exact duplicates and one zero-area box are removed;
- the `Texte` (text) class, annotated on only 83% of views, is dropped;
- views without any illustration (endpapers, marbled paper, covers) keep an empty label: they are valuable negative examples, not missing annotations.

### Training

| Parameter     | Value                                |
| :------------ | :----------------------------------- |
| Model         | YOLO26l, COCO pre-trained            |
| Resolution    | 800 px                               |
| Epochs        | 50 (best: 50)                        |
| Batch         | 6, the ceiling of an RTX 4070 Laptop |
| Optimizer     | AdamW, lr 0.002                      |
| Augmentations | `mosaic` and `fliplr` disabled       |
| Duration      | 2 h 35                               |

I disabled those two augmentations on purpose: horizontal flips mirror the text on the pages, and mosaic builds layouts that never occur in the corpus. Training plateaus around epoch 30; past that point, only mAP50-95 (box tightness) keeps improving.

### Results on the validation split

| Metric                                   | Value                 | What it measures                                             |
| :--------------------------------------- | :-------------------- | :----------------------------------------------------------- |
| P@R95                                    | **0.856**             | Precision when the model finds at least 95% of illustrations |
| P@R90                                    | 0.943                 | The same, at 90% recall                                      |
| AP50                                     | 0.956                 | Overall detection ability (IoU ≥ 0.50)                       |
| mAP50-95                                 | 0.872                 | Box tightness, over IoU 0.50 to 0.95                         |
| Precision / recall / F1 (0.25 threshold) | 0.888 / 0.939 / 0.913 | Reliability / coverage / balance                             |
| Mean IoU                                 | 0.939                 | Overlap of correctly detected boxes                          |
| False detections on empty pages          | 26 / 89 (29%)         | Pages with no illustration where the model still finds one   |

**P@R95** is the headline metric: deleting an extra box costs a human less than drawing a missed one. So recall is pinned at 95% and we look at the precision that comes with it. The evaluation also derives the confidence threshold to use, here 0.167 (the one reaching 95% recall with the best precision), which prediction and the pipeline pick up by default.

The metrics are computed by our own code rather than read off the Ultralytics curves, and the tests check AP against `pycocotools`.

![YOLO26l predictions on a validation batch: photos, plans, engravings, stereoscopic views, and an empty page correctly left alone](/assets/projects/pfee-bnf/yolo-val-predictions.webp)

### Error analysis

Global metrics hide sharp differences. Broken down by illustration size:

| Size (share of the page) | AP50  | mAP50-95 | P@R95           |
| :----------------------- | ----: | -------: | :-------------- |
| Tiny (< 1%)              | 0.652 | 0.420    | max recall 0.92 |
| Small (1–10%)            | 0.960 | 0.854    | 0.794           |
| Medium (10–50%)          | 0.938 | 0.845    | 0.780           |
| Large (> 50%)            | 0.993 | 0.952    | 0.983           |

And by document type:

| Type                           | AP50  | P@R90 | P@R95 |
| :----------------------------- | ----: | ----: | ----: |
| Photograph                     | 0.999 | 1.000 | 1.000 |
| Film roll                      | 0.983 | 0.971 | 0.952 |
| Typographic ornament           | 0.984 | 0.929 | 0.871 |
| Comic book                     | 0.955 | 0.939 | 0.859 |
| Plan                           | 0.922 | 0.819 | 0.660 |
| Several sketches of one object | 0.913 | 0.730 | 0.536 |
| Stereoscopy                    | 0.903 | 0.960 | 0.410 |

Three takeaways drive the next steps:

1. Very small illustrations are the weak spot. Their AP50 drops to 0.652, and recall caps at 0.92 whatever the threshold: the 95% target is out of reach, and reaching 90% leaves only 13% precision. This is the top priority.
2. Empty pages still trigger too many false detections: 29% of them get a box at the 0.25 threshold, and 36% at the threshold aiming for 95% recall. It is the first number a librarian will notice.
3. Pages with several small, similar, neighbouring objects (multiple sketches, stereoscopic views) are the hardest: the model hesitates between one shared box and one box per object, which ties back to the first point.

I still had a doubt about generalization: the provided validation split is cut by view, and 222 of its 1,207 views belong to a book already in the training split. Since two pages from the same book look very much alike, the evaluation also reports the metrics on books absent from training only: P@R90 of 0.945, against 0.943 on the whole validation split. No measurable effect: the model does not benefit from that leak.

### Comparison with Florence-2

To check that YOLO is the right choice, we also trained Florence-2-base (Microsoft), a vision-language model that generates its boxes as text, on the same dataset and with the same evaluation. Its vision encoder is frozen; only the rest of the model is fine-tuned.

| Metric                          | YOLO26l | Florence-2-base |
| :------------------------------ | ------: | --------------: |
| AP50                            |   0.956 |           0.461 |
| Maximum recall                  |  ≥ 0.95 |            0.73 |
| P@R95                           |   0.856 |     not reached |
| Mean IoU                        |   0.939 |           0.959 |
| False detections on empty pages |     29% |              1% |

Florence-2 outlines large illustrations very cleanly (0.953 AP50 above half the page) and almost never fires on an empty page, but it misses most of the small ones: 0.27 recall below 1% of the page, 0.55 between 1 and 10%. Its validation loss bottoms out after the first epoch and then climbs: the model overfits right away. **YOLO stays the pipeline's detector.**

## Classifying illustrations with ConvNeXt

Classification is another team member's work. An ImageNet pre-trained ConvNeXt-Tiny is fine-tuned on the first axis of the grid, technique, with 5 classes: drawing, print, printing, painting, photograph. It was chosen for its ability to extract visual features across very diverse graphic styles. Since the classes are heavily imbalanced, the loss weights each class by its frequency. The _Genre_ (16 classes) and _Form/Function_ (21 classes) axes are trained the same way, from their own files.

## A first end-to-end pipeline

Both models are now wired together: a Gallica page goes in, an annotated page and its JSON come out. Each box shows the predicted class, its confidence, then the detection score.

|                                             A single photograph                                              |                                          Four prints on one plate                                          |
| :----------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------: |
| ![One photograph detected, then classified by the pipeline](/assets/projects/pfee-bnf/pipeline-photographie.webp) | ![Four prints detected separately, then classified by the pipeline](/assets/projects/pfee-bnf/pipeline-estampes.webp) |

On the right-hand plate, the detector correctly splits the four engravings instead of wrapping them in one box, and ignores the title, the shelfmark and the BnF stamp.

## Status and next steps

The project is ongoing; final delivery is scheduled for **late January 2027**. The detector and a first classifier are trained, and the pipeline runs end to end behind a single command line, with tests and continuous integration (`ruff` lint). Next steps:

- target small illustrations and false detections on empty pages;
- detect and fix the orientation of illustrations scanned sideways or upside down (0° / 90° / 180° / 270°);
- plug the _Form/Function_ and _Genre_ axes into the pipeline, which only takes one classifier today;
- evaluate the pipeline end to end: no dataset annotates both the boxes and the classes of the same pages, so each model is only evaluated on its own.
