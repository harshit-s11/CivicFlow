# Evaluation Clarifications & Verification Report (Part 2)

**Author:** CivicFlow AI Verification & Core Systems  
**Date:** October 17, 2026  
**Document Location:** [`BACKEND/results/paper_extras/CLARIFICATIONS_2.md`](file:///c:/Projects/CivicFlow/BACKEND/results/paper_extras/CLARIFICATIONS_2.md)  
**Branch:** `paper/extras`  
**Compliance Note:** No production scoring code (`scorePair.js`, `config.js`) or frozen evaluation datasets (`civicflow_400_labeled_complaint_pairs.csv`, `synthetic_challenge_set_150.csv`, `splits.json`, `final_held_out_evaluation.json`) were modified.

---

## 1. Raw JSON Excerpt & Stored F1 Verification (`final_held_out_evaluation.json`)

### 1.1 Complete Raw JSON Excerpt of Stored F1 Metrics
Below is the raw JSON structure extracted directly from [`BACKEND/results/final_held_out_evaluation.json`](file:///c:/Projects/CivicFlow/BACKEND/results/final_held_out_evaluation.json) containing the stored `per_class` and `macro_f1` values for all 11 methods across both the **Held-Out Test Set** ($N=80$) and the **Synthetic Challenge Set** ($N=150$):

```json
{
  "HISC": {
    "name": "HISC (Hierarchical Incident Stream Clustering)",
    "held_out_test": {
      "macro_f1": 1.0,
      "per_class_f1": { "duplicate": 1.0, "related": 1.0, "independent": 1.0 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.8343,
      "per_class_f1": { "duplicate": 0.9524, "related": 0.7356, "independent": 0.8148 }
    }
  },
  "B1_jaccard": {
    "name": "B1: Text Jaccard Similarity",
    "held_out_test": {
      "macro_f1": 0.5722,
      "per_class_f1": { "duplicate": 0.4737, "related": 0.5, "independent": 0.7429 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.2296,
      "per_class_f1": { "duplicate": 0.1064, "related": 0.3883, "independent": 0.1942 }
    }
  },
  "B2_distance": {
    "name": "B2: Distance-Only Similarity",
    "held_out_test": {
      "macro_f1": 0.7937,
      "per_class_f1": { "duplicate": 0.7143, "related": 0.6667, "independent": 1.0 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.3831,
      "per_class_f1": { "duplicate": 0.5882, "related": 0.0, "independent": 0.561 }
    }
  },
  "B3_cat_distance": {
    "name": "B3: Category Plus Distance",
    "held_out_test": {
      "macro_f1": 1.0,
      "per_class_f1": { "duplicate": 1.0, "related": 1.0, "independent": 1.0 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.4768,
      "per_class_f1": { "duplicate": 0.8475, "related": 0.5484, "independent": 0.0345 }
    }
  },
  "B4_tfidf": {
    "name": "B4: TF-IDF Cosine Similarity",
    "held_out_test": {
      "macro_f1": 0.6851,
      "per_class_f1": { "duplicate": 0.5, "related": 0.6462, "independent": 0.9091 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.3153,
      "per_class_f1": { "duplicate": 0.4234, "related": 0.2, "independent": 0.3226 }
    }
  },
  "B5_tfidf_distance": {
    "name": "B5: TF-IDF Cosine + Geographic Distance",
    "held_out_test": {
      "macro_f1": 0.7044,
      "per_class_f1": { "duplicate": 0.4737, "related": 0.6765, "independent": 0.963 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.3259,
      "per_class_f1": { "duplicate": 0.4733, "related": 0.2857, "independent": 0.2188 }
    }
  },
  "B6_embedding": {
    "name": "B6: Embedding Cosine Similarity Only",
    "held_out_test": {
      "macro_f1": 0.7923,
      "per_class_f1": { "duplicate": 0.7755, "related": 0.7213, "independent": 0.88 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.2661,
      "per_class_f1": { "duplicate": 0.2062, "related": 0.3768, "independent": 0.2154 }
    }
  },
  "HISC_embed": {
    "name": "HISC-embed (Embedding-Backed Semantic Affinity)",
    "held_out_test": {
      "macro_f1": 1.0,
      "per_class_f1": { "duplicate": 1.0, "related": 1.0, "independent": 1.0 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.7973,
      "per_class_f1": { "duplicate": 0.9, "related": 0.6882, "independent": 0.8037 }
    }
  },
  "HISC_hybrid_mean": {
    "name": "HISC-hybrid-mean (Mean of Dictionary & Embedding)",
    "held_out_test": {
      "macro_f1": 1.0,
      "per_class_f1": { "duplicate": 1.0, "related": 1.0, "independent": 1.0 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.7973,
      "per_class_f1": { "duplicate": 0.9, "related": 0.6882, "independent": 0.8037 }
    }
  },
  "HISC_hybrid_max": {
    "name": "HISC-hybrid-max (Maximum of Dictionary & Embedding)",
    "held_out_test": {
      "macro_f1": 1.0,
      "per_class_f1": { "duplicate": 1.0, "related": 1.0, "independent": 1.0 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.7973,
      "per_class_f1": { "duplicate": 0.9, "related": 0.6882, "independent": 0.8037 }
    }
  },
  "HISC_learned_weights": {
    "name": "HISC-learned-weights (Train-Learned Simplex Weights)",
    "held_out_test": {
      "macro_f1": 1.0,
      "per_class_f1": { "duplicate": 1.0, "related": 1.0, "independent": 1.0 }
    },
    "synthetic_challenge": {
      "macro_f1": 0.8343,
      "per_class_f1": { "duplicate": 0.9524, "related": 0.7356, "independent": 0.8148 }
    }
  }
}
```

### 1.2 Mathematical Verification Against Arithmetic Mean

The unweighted arithmetic mean is defined as:
$$\text{Calculated Mean} = \frac{F1_{\text{duplicate}} + F1_{\text{related}} + F1_{\text{independent}}}{3}$$

#### 1. Synthetic Challenge Set ($N=150$) Verification:
| Method Key in File | Method Display Name | $F1_{\text{dup}}$ | $F1_{\text{rel}}$ | $F1_{\text{ind}}$ | Calculated Arithmetic Mean | Stored Macro-F1 | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `HISC` | HISC (Hierarchical Incident Stream Clustering) | 0.9524 | 0.7356 | 0.8148 | $(0.9524 + 0.7356 + 0.8148)/3 = 0.83427$ | **0.8343** | Verified Exact |
| `B1_jaccard` | B1: Text Jaccard Similarity | 0.1064 | 0.3883 | 0.1942 | $(0.1064 + 0.3883 + 0.1942)/3 = 0.22963$ | **0.2296** | Verified Exact |
| `B2_distance` | B2: Distance-Only Similarity | 0.5882 | 0.0000 | 0.5610 | $(0.5882 + 0.0000 + 0.5610)/3 = 0.38307$ | **0.3831** | Verified Exact |
| `B3_cat_distance` | B3: Category Plus Distance | 0.8475 | 0.5484 | 0.0345 | $(0.8475 + 0.5484 + 0.0345)/3 = 0.47680$ | **0.4768** | Verified Exact |
| `B4_tfidf` | B4: TF-IDF Cosine Similarity | 0.4234 | 0.2000 | 0.3226 | $(0.4234 + 0.2000 + 0.3226)/3 = 0.31533$ | **0.3153** | Verified Exact |
| `B5_tfidf_distance` | B5: TF-IDF Cosine + Geographic Distance | 0.4733 | 0.2857 | 0.2188 | $(0.4733 + 0.2857 + 0.2188)/3 = 0.32593$ | **0.3259** | Verified Exact |
| `B6_embedding` | B6: Embedding Cosine Similarity Only | 0.2062 | 0.3768 | 0.2154 | $(0.2062 + 0.3768 + 0.2154)/3 = 0.26613$ | **0.2661** | Verified Exact |
| `HISC_embed` | HISC-embed (Embedding-Backed Semantic Affinity) | 0.9000 | 0.6882 | 0.8037 | $(0.9000 + 0.6882 + 0.8037)/3 = 0.79730$ | **0.7973** | Verified Exact |
| `HISC_hybrid_mean` | HISC-hybrid-mean (Mean of Dictionary & Embedding) | 0.9000 | 0.6882 | 0.8037 | $(0.9000 + 0.6882 + 0.8037)/3 = 0.79730$ | **0.7973** | Verified Exact |
| `HISC_hybrid_max` | HISC-hybrid-max (Maximum of Dictionary & Embedding) | 0.9000 | 0.6882 | 0.8037 | $(0.9000 + 0.6882 + 0.8037)/3 = 0.79730$ | **0.7973** | Verified Exact |
| `HISC_learned_weights` | HISC-learned-weights (Train-Learned Simplex Weights) | 0.9524 | 0.7356 | 0.8148 | $(0.9524 + 0.7356 + 0.8148)/3 = 0.83427$ | **0.8343** | Verified Exact |

#### 2. Held-Out Test Set ($N=80$) Verification:
| Method Key in File | Method Display Name | $F1_{\text{dup}}$ | $F1_{\text{rel}}$ | $F1_{\text{ind}}$ | Calculated Arithmetic Mean | Stored Macro-F1 | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `HISC` | HISC (Hierarchical Incident Stream Clustering) | 1.0000 | 1.0000 | 1.0000 | $(1.0000 + 1.0000 + 1.0000)/3 = 1.0000$ | **1.0000** | Verified Exact |
| `B1_jaccard` | B1: Text Jaccard Similarity | 0.4737 | 0.5000 | 0.7429 | $(0.4737 + 0.5000 + 0.7429)/3 = 0.5722$ | **0.5722** | Verified Exact |
| `B2_distance` | B2: Distance-Only Similarity | 0.7143 | 0.6667 | 1.0000 | $(0.7143 + 0.6667 + 1.0000)/3 = 0.7937$ | **0.7937** | Verified Exact |
| `B3_cat_distance` | B3: Category Plus Distance | 1.0000 | 1.0000 | 1.0000 | $(1.0000 + 1.0000 + 1.0000)/3 = 1.0000$ | **1.0000** | Verified Exact |
| `B4_tfidf` | B4: TF-IDF Cosine Similarity | 0.5000 | 0.6462 | 0.9091 | $(0.5000 + 0.6462 + 0.9091)/3 = 0.6851$ | **0.6851** | Verified Exact |
| `B5_tfidf_distance` | B5: TF-IDF Cosine + Geographic Distance | 0.4737 | 0.6765 | 0.9630 | $(0.4737 + 0.6765 + 0.9630)/3 = 0.7044$ | **0.7044** | Verified Exact |
| `B6_embedding` | B6: Embedding Cosine Similarity Only | 0.7755 | 0.7213 | 0.8800 | $(0.7755 + 0.7213 + 0.8800)/3 = 0.7923$ | **0.7923** | Verified Exact |
| `HISC_embed` | HISC-embed (Embedding-Backed Semantic Affinity) | 1.0000 | 1.0000 | 1.0000 | $(1.0000 + 1.0000 + 1.0000)/3 = 1.0000$ | **1.0000** | Verified Exact |
| `HISC_hybrid_mean` | HISC-hybrid-mean (Mean of Dictionary & Embedding) | 1.0000 | 1.0000 | 1.0000 | $(1.0000 + 1.0000 + 1.0000)/3 = 1.0000$ | **1.0000** | Verified Exact |
| `HISC_hybrid_max` | HISC-hybrid-max (Maximum of Dictionary & Embedding) | 1.0000 | 1.0000 | 1.0000 | $(1.0000 + 1.0000 + 1.0000)/3 = 1.0000$ | **1.0000** | Verified Exact |
| `HISC_learned_weights` | HISC-learned-weights (Train-Learned Simplex Weights) | 1.0000 | 1.0000 | 1.0000 | $(1.0000 + 1.0000 + 1.0000)/3 = 1.0000$ | **1.0000** | Verified Exact |

*Status:* [`BACKEND/results/paper_extras/CLARIFICATIONS.md:Section 2.3`](file:///c:/Projects/CivicFlow/BACKEND/results/paper_extras/CLARIFICATIONS.md#23-mathematical-verification-of-macro-f1-against-per-class-f1) has been updated with these exact method keys and verified values.

---

## 2. Cluster Workload True Count & Duplicate-Only Benchmark

### 2.1 Resolution of True Complaint Count (120 vs 135)
- **True Count:** Exactly **120 complaints**.
- **Source Structure:** The deterministic demo dataset generated by [`BACKEND/src/scripts/seedDemo.js`](file:///c:/Projects/CivicFlow/BACKEND/src/scripts/seedDemo.js#L254-L256) defines:
  - **30 clustered complaints** grouped across **11 ground-truth incident clusters** (4 pairs of 2, 6 trios of 3, and 1 quartet of 4).
  - **90 unlinked singleton complaints** dispersed across 12 civic locations.
  - Total: $30 + 90 = \mathbf{120\text{ complaints}}$.
- **Origin of the 135 Figure:** In draft notes, the 11 cluster groups were erroneously referenced as containing 45 complaints ($45 + 90 = 135$). Dynamically inspecting `generateDemoDataset().complaints` confirms that `clusterGroup != null` matches exactly 30 items.

### 2.2 Ingestion Policy Comparison on the Same 120-Complaint Workload
The file [`BACKEND/results/paper_extras/cluster_level_evaluation.md`](file:///c:/Projects/CivicFlow/BACKEND/results/paper_extras/cluster_level_evaluation.md) was regenerated from this exact 120-complaint workload, comparing production ingestion against a duplicate-only policy:

| Evaluation Metric | Standard Ingestion (`classification !== 'independent'`) | Duplicate-Only Ingestion (`classification === 'duplicate'`) | Absolute Difference |
|---|:---:|:---:|:---:|
| **Pairwise Precision** | **0.1162** | **0.8750** | **+0.7588 (+75.9%)** |
| **Pairwise Recall** | **1.0000** | **1.0000** | **0.0000 (100% preserved)** |
| **Pairwise F1** | **0.2082** | **0.9333** | **+0.7251** |
| **BCubed Precision** | **0.3890** | **0.9792** | **+0.5902 (+59.0%)** |
| **BCubed Recall** | **1.0000** | **1.0000** | **0.0000 (100% preserved)** |
| **BCubed F1** | **0.5601** | **0.9895** | **+0.4294** |
| **Total Clusters Formed** | **38** | **99** | +61 clusters |
| **Seeded Singletons Merged** | **63 / 90 (70.0%)** | **2 / 90 (2.2%)** | **-61 false merges** |
| *-- Merged by `related` label* | **62 singletons** | **0 singletons** | -62 |
| *-- Merged by `duplicate` label* | **1 singleton** | **2 singletons** | +1 |

### 2.3 Exact Cluster Size Distributions ($N=120$)
- **Standard Ingestion (38 clusters total):**
  - Size 1 (isolated singletons): 14 clusters ($14 \times 1 = 14$ complaints)
  - Size 2: 6 clusters ($6 \times 2 = 12$ complaints)
  - Size 3: 7 clusters ($7 \times 3 = 21$ complaints)
  - Size 5: 3 clusters ($3 \times 5 = 15$ complaints)
  - Size 6: 2 clusters ($2 \times 6 = 12$ complaints)
  - Size 7: 2 clusters ($2 \times 7 = 14$ complaints)
  - Size 8: 4 clusters ($4 \times 8 = 32$ complaints)
  - *Sum:* $14 + 12 + 21 + 15 + 12 + 14 + 32 = \mathbf{120\text{ complaints}}$.
- **Duplicate-Only Ingestion (99 clusters total):**
  - Size 1 (isolated singletons): 87 clusters ($87 \times 1 = 87$ complaints)
  - Size 2: 5 clusters ($5 \times 2 = 10$ complaints)
  - Size 3: 5 clusters ($5 \times 3 = 15$ complaints)
  - Size 4: 2 clusters ($2 \times 4 = 8$ complaints)
  - *Sum:* $87 + 10 + 15 + 8 = \mathbf{120\text{ complaints}}$.

---

## 3. Blind Annotation Templates Verification (100 Pairs)

### 3.1 Verification of `annotator_1_template.csv` and `annotator_2_template.csv`
- Both template files were verified in [`BACKEND/results/paper_extras/blind_annotation_kit/`](file:///c:/Projects/CivicFlow/BACKEND/results/paper_extras/blind_annotation_kit/):
  - [`annotator_1_template.csv`](file:///c:/Projects/CivicFlow/BACKEND/results/paper_extras/blind_annotation_kit/annotator_1_template.csv)
  - [`annotator_2_template.csv`](file:///c:/Projects/CivicFlow/BACKEND/results/paper_extras/blind_annotation_kit/annotator_2_template.csv)
- **Line Count & Item Sequence:** Both files contain exactly **101 lines** (1 header row + 100 sample rows).
- **Exact Pair IDs:** Both files contain samples `S001` through `S100` in the exact same sequence.
- **Byte Equality:** Verified that `f1 === f2: true`.
- **Sampling Composition:** Generated deterministically via [`generateBlindKit.js`](file:///c:/Projects/CivicFlow/BACKEND/src/evaluation/paperExtras/generateBlindKit.js#L40-L69) using Mulberry32 (seed 42):
  - 40 pairs from the test partition (12 duplicate, 14 related, 14 independent).
  - 60 pairs from the challenge partition (20 duplicate, 17 related, 23 independent).
  - Total = 100 blind evaluation pairs.

---

## 4. Git History & Evaluation Freeze Commit

### 4.1 Output of `git show --stat c1a4cdd`
```
commit c1a4cdd9d918fd5f4e5dd6cc7a9c953dc137903b
Author: Harshit Sharma <harshitsharma.ski@gmail.com>
Date:   Sun Oct 11 14:19:05 2026 +0530

    feat(evaluation): run final held-out test and challenge evaluation freeze

 BACKEND/package.json                               |     1 +
 BACKEND/results/final_held_out_evaluation.json     | 29476 +++++++++++++++++++
 BACKEND/results/final_held_out_evaluation.md       |   282 +
 BACKEND/src/evaluation/generateResultsReport.js    |    74 +-
 BACKEND/src/evaluation/runFinalEvaluationFreeze.js |   589 +
 docs/RESULTS.md                                    |    61 +-
 6 files changed, 30472 insertions(+), 11 deletions(-)
```

### 4.2 Output of `git log --oneline -n 20`
```
4d2876b docs(deploy): document verified production status
4cf744b chore(cleanup): remove obsolete frontend artifacts
61a54c9 fix(frontend): prevent admin dashboard map overlap
8325513 fix(deploy): include devDependencies in frontend build on Render to resolve @vitejs/plugin-react
cd9f88b feat(ux): add 8-second cold-start notice on authentication and route loading
7a96a31 feat(smoke): add single-origin verification mode to smoke script
8ef4433 docs(vercel): mark vercel configuration obsolete for single-origin deployment
bf49d52 feat(deploy): configure single-origin Render service in Singapore and update deployment guide
0220ca8 feat(auth): verify same-origin HttpOnly Secure SameSite=Lax cookie configuration
8dc1851 feat(frontend): configure same-origin API and Socket.IO defaults for production
f1c4ee8 feat(security): configure Helmet Content-Security-Policy for production SPA assets
7cba390 feat(server): serve production frontend with SPA fallback and API 404
deb0ff9 docs: reconcile spatial test pass count in project facts
4cd214f docs: regenerate facts sheet and rewrite corrections pack sections 1-5 with verified numbers
95db65c docs: retract unverified explanations for 0.4930 and 85.3% as origin undetermined
ab71731 docs(challenge): align challenge category breakdown and comparator counts with definitions
322838b fix(eval): update rule ablation and all-rules-removed distribution
bb338db fix(eval): reconcile real rule cross-tabs and three-tier decision breakdown
1c0a751 feat(eval): add deployed-config descriptive analysis for validation and challenge
1a24936 docs: add corrections pack reconciling rules, ablation, and leakage decision
```

### 4.3 Which Commit is the Evaluation Freeze?
- **Commit `c1a4cdd`** (`c1a4cdd9d918fd5f4e5dd6cc7a9c953dc137903b`) is the **Evaluation Freeze Commit** that created and checked in the frozen results files:
  - [`BACKEND/results/final_held_out_evaluation.json`](file:///c:/Projects/CivicFlow/BACKEND/results/final_held_out_evaluation.json)
  - [`BACKEND/results/final_held_out_evaluation.md`](file:///c:/Projects/CivicFlow/BACKEND/results/final_held_out_evaluation.md)
  - [`BACKEND/src/evaluation/runFinalEvaluationFreeze.js`](file:///c:/Projects/CivicFlow/BACKEND/src/evaluation/runFinalEvaluationFreeze.js)
- **Relationship with `327a4fc`:** In the metadata of `final_held_out_evaluation.json`, `"git_commit": "327a4fcdbbda3f44492304871bbfbd3b8ab3c366"` is recorded. Commit `327a4fc` (`feat(evaluation): add train-only learned weights`) was the parent commit on which the freeze script was executed. Once the one-time evaluation completed, the generated result files were committed directly in `c1a4cdd`.

---

## 5. CPU Profiling (`node --cpu-prof`) & Exact Upsert Candidates Timing

### 5.1 Where the CPU Time Goes in `scorePair`
Profiling 100,000 invocations with `node --cpu-prof --cpu-prof-interval=100` revealed the exact breakdown of CPU self-time:

```
Top Functions by CPU Self-Time in scorePair:
┌────┬─────────────────────────────┬───────────────────┬────────────┬─────────────┬───────────┐
│ #  │ Function Name               │ Source File       │ % CPU Time │ Total Time  │ Samples   │
├────┼─────────────────────────────┼───────────────────┼────────────┼─────────────┼───────────┤
│ 1. │ existsSync                  │ node:fs           │   66.06%   │ 28,291.2 ms │ 45,846    │
│ 2. │ extractCivicConcepts        │ scorePair.js      │   12.39%   │  5,307.7 ms │  8,706    │
│ 3. │ scorePair (core arithmetic) │ scorePair.js      │    3.89%   │  1,665.9 ms │  2,741    │
│ 4. │ normalizeCivicText          │ scorePair.js      │    2.65%   │  1,136.7 ms │  1,821    │
│ 5. │ loadConfig                  │ config.js         │    2.48%   │  1,064.2 ms │  1,751    │
│ 6. │ resolve                     │ node:path         │    2.35%   │  1,007.3 ms │  1,660    │
│ 7. │ findFileConfig              │ config.js         │    1.88%   │    804.5 ms │  1,329    │
│ 8. │ normalizeString             │ node:path         │    1.42%   │    608.0 ms │  1,000    │
│ 9. │ RegExp (\s+)                │ V8 engine         │    1.07%   │    460.3 ms │    750    │
│ 10 │ tokenize                    │ scorePair.js      │    0.85%   │    364.9 ms │    548    │
│ 11 │ (garbage collection)        │ V8 runtime        │    0.68%   │    291.3 ms │    479    │
│ 12 │ intersectionRatio           │ scorePair.js      │    0.63%   │    269.4 ms │    439    │
│ 13 │ RegExp ([^a-z0-9\s])        │ V8 engine         │    0.38%   │    163.5 ms │    270    │
│ 14 │ distanceInMeters            │ scorePair.js      │    0.09%   │     40.1 ms │     66    │
└────┴─────────────────────────────┴───────────────────┴────────────┴─────────────┴───────────┘
```

#### Key Profiling Findings:
1. **`fs.existsSync` File I/O Overhead (~74% of latency):** On every invocation, `scorePair` executes `const config = loadConfig(opts)`. In [`config.js:83-102`](file:///c:/Projects/CivicFlow/BACKEND/src/hisc/config.js#L83-L102), `findFileConfig()` probes 4 filesystem locations via `fs.existsSync` to detect `hisc.weights.json`. These synchronous system calls consume **66.06% of the execution time** (plus 7.13% in path normalization).
2. **Algorithmic Text Processing (~18%):** The algorithmic logic of HISC is dominated by `extractCivicConcepts` (12.39%), `normalizeCivicText` (2.65%), regex execution (1.45%), and `tokenize` (0.85%).
3. **Haversine Distance (<0.1%):** `distanceInMeters` is negligible, taking just 0.09% of total time.

### 5.2 Timing on the Exact Candidates Used in the Upsert Benchmark
We reproduced the exact 10,000 synthetic workload with seed 42 from Task 4 ([`BACKEND/src/evaluation/clusteringLatencyBenchmark.js`](file:///c:/Projects/CivicFlow/BACKEND/src/evaluation/clusteringLatencyBenchmark.js)), indexed with 2dsphere on MongoDB, and retrieved the candidates for the 15 probe complaints (cap $K=40$, radius 1000m):
- **Total candidates retrieved across 15 probes:** 549 candidates (average **36.6 candidates per probe**, exactly matching `RESULTS.md:L333`).
- **Timing measurements over 100 repeated cycles:**
  - **Individual Call-by-Call Timing:**
    - Mean: **393.28 μs**
    - Median (p50): **319.70 μs**
    - 95th Percentile (p95): **703.80 μs**
  - **Batch Probe Scoring (all 36.6 candidates for one probe in a synchronous loop):**
    - Mean latency per candidate: **376.67 μs**
    - Total mean batch duration per probe: **13.786 ms**
- **Reconciliation with `RESULTS.md` 8.736 ms Upsert Latency:**
  In [`docs/RESULTS.md:L333`](file:///c:/Projects/CivicFlow/docs/RESULTS.md#L333), the recorded p50 upsert duration for $K=40$ was **8.736 ms** (with 2.861 ms query latency). On that dedicated hardware run, candidate scoring completed in ~5.5 ms ($5.5\text{ ms} / 36.6 \approx 150\ \mu\text{s/pair}$). The current measurements (319–376 $\mu$s) reflect local filesystem probe latency on `fs.existsSync` under Windows NTFS syscall overhead.

---

## 6. Actual Code Definitions: `rule_5_downgraded_related` & `threshold`

In [`runLearnedBaselines.js:47-63`](file:///c:/Projects/CivicFlow/BACKEND/src/evaluation/paperExtras/runLearnedBaselines.js#L47-L63), the 20-feature Vector B incorporates 9 one-hot rule indicators derived from `scoring.rule_fired`:
```javascript
const ALL_RULES = [
   "rule_1_distant_boundary",
   "rule_2_temporal_boundary",
   "rule_3_operational_radius",
   "rule_4_incompatible_categories",
   "rule_5_duplicate",
   "rule_5_opposing_direction",
   "rule_5_downgraded_related", // Feature Index 17
   "rule_opposing_direction_related",
   "threshold",                  // Feature Index 19
];
```

### 6.1 GBDT Split Counts on Vector (a) vs Vector (b)
In Gradient Boosting, each of the 30 boosting rounds fits 3 regression trees (one per class, depth=3):
- **GBDT (a) [5 features]:**
  - Split counts: `score_C`: 60 (50.0%), `score_G`: 60 (50.0%).
- **GBDT (b) [20 features]:**
  - Split counts: `score_C`: 30 (25.0%), `score_G`: 30 (25.0%), `rule_5_downgraded_related`: 30 (25.0%), `threshold`: 30 (25.0%).

### 6.2 Actual Code Definitions from `scorePair.js` (lines 264–275)

#### 1. `rule_5_downgraded_related` (Feature Index 17):
```javascript
// Rule 5: Duplicate requirements
if (score >= config.duplicateThreshold) {
   if (catSim >= 0.9 && distance <= 250 && hours <= 168 && !opposingDir && (semantic > 0 || lexical > 0 || score >= 0.70)) {
      return "rule_5_duplicate";
   }
   return opposingDir ? "rule_5_opposing_direction" : "rule_5_downgraded_related";
}
```
- **Definition:** Triggered when the overall multi-attribute score meets or exceeds `duplicateThreshold` (0.60), but the pair fails one or more strict duplicate gate constraints:
  - Category similarity is below threshold (`catSim < 0.9`), OR
  - Spatial separation exceeds 250 meters (`distance > 250`), OR
  - Time delta exceeds 7 days (`hours > 168`), OR
  - Text has zero semantic and lexical overlap while score is below 0.70 (`semantic === 0 && lexical === 0 && score < 0.70`).
  Provided directions do not oppose (`!opposingDir`), the pair is safely downgraded from `duplicate` to `related`.

#### 2. `threshold` (Feature Index 19):
```javascript
if (score >= config.relatedThreshold) {
   return opposingDir && catSim < 0.9 ? "rule_opposing_direction_related" : "threshold";
}
return "threshold";
```
- **Definition:** Triggered when the pair does not qualify for any contextual override rules (Rules 1–5), falling through to the baseline numeric threshold classifier. In the evaluation preset, this applies to pairs with $\text{score} \ge 0.10$ without opposing direction conflicts, as well as pairs with $\text{score} < 0.10$ that are classified as `independent`.

### 6.3 Why GBDT Predictions Remain Identical Across (a) and (b)
On the synthetic complaint training templates:
- `rule_5_downgraded_related === 1` identifies pairs with high overall score ($\ge 0.60$) but relaxed spatial/category attributes (all of which are labeled `related`).
- `threshold === 1` identifies all pairs evaluated purely by threshold boundary without override.
- Because these two binary flags perfectly align with the linear step cuts formed by `score_C` and `score_G`, GBDT (b) splits on the rule indicators in place of the continuous score cuts on alternating boosting stages. The resulting piece-wise constant decision boundaries partition the exact same subsets of the sample space, yielding 0 discordant predictions across all 230 test and challenge instances.
