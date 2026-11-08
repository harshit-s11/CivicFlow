# Civic Complaint Pairwise Annotation Guidelines

## Overview
This document guides independent human evaluators in assessing the relationship between two municipal civic complaints. Each evaluated pair must be classified into exactly one of three mutually exclusive categories:
- `duplicate`
- `related`
- `independent`

---

## 1. Category Definitions

### A. `duplicate`
The two complaints refer to the **exact same physical defect, obstruction, or occurrence** at the same location and during the same active lifecycle.
- **Criteria:**
  - High categorical compatibility (e.g., both Roads & Transport, or both Waste & Cleanliness).
  - Spatial proximity typically within 250 meters.
  - Temporal proximity typically within 7 days (168 hours).
  - Describes the same physical defect (e.g., "huge pothole outside metro gate" vs "deep crater near metro entrance").
- **Exclusion:** Opposing traffic directions on divided highways (e.g., "northbound lane" vs "southbound lane") are NOT duplicates; they are separate defects.

### B. `related`
The complaints do NOT report the exact same defect, but they share a **direct causal, cascade, or compound relationship** arising from the same localized civic infrastructure incident.
- **Examples:**
  - Clogged stormwater drain resulting in localized street flooding and pothole formation.
  - Fallen bough severing an overhead electrical cable and causing streetlight blackout.
  - Underground water main burst causing road surface subsidence or sinkhole.
  - Road defect on northbound carriageway paired with accident or congestion on southbound carriageway.
- **Criteria:**
  - Spatial proximity within 1,000 meters.
  - Temporal proximity within the same incident window (up to 30 days).
  - Observable physical, environmental, or operational coupling.

### C. `independent`
The two complaints represent **completely separate, unrelated incidents** that happen to occur in the municipality.
- **Criteria:**
  - Different physical locations (>1,000 meters, or distant municipal wards).
  - Unrelated categories with no causal coupling (e.g., streetlight repair vs garbage collection 800m away).
  - Large temporal separation (>30 days / 720 hours).
  - Coincidental proximity without defect commonality.

---

## 2. Instructions for Annotators
1. Open `blind_annotation_100_pairs.csv`.
2. For each row (`S001` through `S100`), record your assessment in `annotator_X_template.csv`:
   - `annotator_label`: exactly one of `duplicate`, `related`, `independent`.
   - `confidence`: subjective rating from 1 (low) to 5 (high).
   - `notes`: optional brief rationale, especially for edge cases.
3. Save the completed file and submit for agreement evaluation using `evaluateBlindAnnotation.js`.
