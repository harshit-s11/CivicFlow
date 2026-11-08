# Cluster-Level Validation & Duplicate-Only Comparison Benchmark

> [!IMPORTANT]
> **CAVEAT NOTICE: SANITY CHECK ON DESIGNED DATA, NOT INDEPENDENT EVIDENCE**  
> This evaluation measures the performance and stability of `upsertIncidentCluster` on the exact **120-complaint** deterministic demo dataset generated dynamically by `seedDemo.js`. Because this dataset was engineered to validate clustering mechanics, these figures verify architectural correctness and order stability rather than uncurated real-world generalization.

---

## 1. Ground Truth Structure (Dynamically Parsed from `seedDemo.js`)

- **True Complaint Count:** **120 complaints** (the figure of 135 cited in draft notes was an arithmetic error; the workload consists of 30 clustered complaints + 90 singletons = 120 total).
- **Ground-Truth Incident Clusters:** 11 clusters (30 complaints total: 4 clusters of size 2, 6 clusters of size 3, 1 cluster of size 4).
- **Non-Clustered Singletons:** 90 complaints across 12 distinct civic locations.
- **Singleton Near-Duplicate Audit:** Exactly 1 near-duplicate pair identified out of 4,005 pairwise combinations (99.98% distinct singletons confirmed).

---

## 2. Ingestion Policy Comparison: Standard vs. Duplicate-Only

The streaming clustering service was evaluated under two candidate merge policies on the exact 120-complaint workload:

| Evaluation Metric | Standard Ingestion (`classification !== 'independent'`) | Duplicate-Only Ingestion (`classification === 'duplicate'`) | Absolute Difference |
|---|:---:|:---:|:---:|
| **Pairwise Precision** | **0.1162** | **0.8750** | **+0.7588 (+75.9%)** |
| **Pairwise Recall** | **1.0000** | **1.0000** | **0.0000 (100% preserved)** |
| **Pairwise F1** | **0.2082** | **0.9333** | **+0.7251** |
| **BCubed Precision** | **0.3890** | **0.9792** | **+0.5902 (+59.0%)** |
| **BCubed Recall** | **1.0000** | **1.0000** | **0.0000 (100% preserved)** |
| **BCubed F1** | **0.5601** | **0.9895** | **+0.4294** |
| **Clusters Formed** | **38** | **99** | +61 clusters |
| **Seeded Singletons Merged** | **63 / 90 (70.0%)** | **2 / 90 (2.2%)** | **-61 false merges** |
| *-- Merged by `related` label* | **62 singletons** | **0 singletons** | -62 |
| *-- Merged by `duplicate` label* | **1 singleton** | **2 singletons** | +1 |

---

## 3. Cluster Size Distributions (Total Complaints = 120)

### Standard Ingestion (38 clusters from 120 complaints)
- **Size 1 (isolated singletons):** 14 clusters (14 complaints)
- **Size 2:** 6 clusters (12 complaints)
- **Size 3:** 7 clusters (21 complaints)
- **Size 5:** 3 clusters (15 complaints)
- **Size 6:** 2 clusters (12 complaints)
- **Size 7:** 2 clusters (14 complaints)
- **Size 8:** 4 clusters (32 complaints)
*Check:* $14\times 1 + 6\times 2 + 7\times 3 + 3\times 5 + 2\times 6 + 2\times 7 + 4\times 8 = 14 + 12 + 21 + 15 + 12 + 14 + 32 = \mathbf{120}$ complaints.

### Duplicate-Only Ingestion (99 clusters from 120 complaints)
- **Size 1 (isolated singletons):** 87 clusters (87 complaints)
- **Size 2:** 5 clusters (10 complaints)
- **Size 3:** 5 clusters (15 complaints)
- **Size 4:** 2 clusters (8 complaints)
*Check:* $87\times 1 + 5\times 2 + 5\times 3 + 2\times 4 = 87 + 10 + 15 + 8 = \mathbf{120}$ complaints.

---

## 4. Arrival Order Invariance Discussion (Standard Ingestion)

The streaming incremental clustering service `upsertIncidentCluster` was tested across 100 randomized arrival order permutations of the 120 complaints:
- **Pairwise Precision:** $0.1167 \pm 0.0105$ (Median: $0.1152$, Range: $[0.0930, 0.1407]$)
- **Pairwise Recall:** $1.0000 \pm 0.0000$ (Deterministic 100% recall across all 100 runs)
- **Pairwise F1:** $0.2088 \pm 0.0168$ (Median: $0.2066$, Range: $[0.1702, 0.2467]$)
- **BCubed Precision:** $0.3948 \pm 0.0207$ (Median: $0.3934$, Range: $[0.3459, 0.4414]$)
- **BCubed Recall:** $1.0000 \pm 0.0000$ (Deterministic 100% recall across all 100 runs)
- **BCubed F1:** $0.5658 \pm 0.0212$ (Median: $0.5646$, Range: $[0.5140, 0.6125]$)
- **Cluster Count:** $38.49 \pm 2.07$ clusters (Median: $38.0$, Range: $[34, 43]$)

The tight standard deviation ($\sigma = 0.0212$ for BCubed F1) confirms high arrival-order stability in the clustering pipeline.
