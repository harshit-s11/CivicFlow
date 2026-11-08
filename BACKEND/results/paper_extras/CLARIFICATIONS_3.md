# Evaluation Clarifications & Verification Report (Part 3)

**Author:** CivicFlow AI Verification & Core Systems  
**Date:** October 17, 2026  
**Document Locations:**
- Primary: [`BACKEND/results/paper_extras/CLARIFICATIONS_3.md`](file:///c:/Projects/CivicFlow/BACKEND/results/paper_extras/CLARIFICATIONS_3.md)
- Workspace Root: [`CLARIFICATIONS_3.md`](file:///c:/Projects/CivicFlow/CLARIFICATIONS_3.md)  
**Branch:** `paper/extras`  
**Mode:** Strictly Read-Only (no production code or frozen datasets modified).

---

## 1. Feature Ablation on Synthetic Challenge Set with `HISC-eval`

Feature ablations were re-run across the full 150-pair Synthetic Challenge partition using the authoritative `HISC_EVAL_PRESET` ($\text{duplicateThreshold} = 0.60$, $\text{relatedThreshold} = 0.10$). In each scenario, one channel was disabled (`enabledFeatures[feat] = false`) and the remaining 4 feature weights were renormalized to sum to 1.0 per [`scorePair.js:363-368`](file:///c:/Projects/CivicFlow/BACKEND/src/hisc/scorePair.js#L363-L368):

$$\text{Active Weight Sum } W = \sum_{f \in \text{active}} w_f, \quad S = \frac{1}{W} \sum_{f \in \text{active}} w_f \cdot \phi_f$$

### 1.1 Empirical Results Table (Challenge Partition, $N=150$)

| Ablation Scenario | Feature Removed | Accuracy | Macro-F1 | $\Delta$ Macro-F1 | $F1_{\text{duplicate}}$ | $F1_{\text{related}}$ | $F1_{\text{independent}}$ |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Full Model** | *None (`HISC-eval`)* | **84.00% (126/150)** | **0.8343** | **0.0000** | **0.9524** | **0.7356** | **0.8148** |
| `no_C` | Category ($w_C = 0.20$) | 60.67% (91/150) | 0.5893 | **-0.2450** | 0.4286 | 0.5246 | 0.8148 |
| `no_G` | Geographic ($w_G = 0.25$) | 57.33% (86/150) | 0.5421 | **-0.2922** | 0.3077 | 0.5039 | 0.8148 |
| `no_L` | Lexical ($w_L = 0.10$) | 84.00% (126/150) | 0.8343 | **0.0000** | 0.9524 | 0.7356 | 0.8148 |
| `no_S` | Semantic ($w_S = 0.30$) | 84.00% (126/150) | 0.8343 | **0.0000** | 0.9524 | 0.7356 | 0.8148 |
| `no_T` | Temporal ($w_T = 0.15$) | 72.67% (109/150) | 0.7267 | **-0.1076** | 0.7500 | 0.6154 | 0.8148 |

### 1.2 Scientific Insights from Feature Ablation:
1. **Dominance of Spatial & Categorical Signals:** Disabling Geographic distance (`no_G`) causes the catastrophic failure of the duplicate detector, dropping accuracy to **57.33%** and Macro-F1 by **-0.2922** (duplicate F1 collapses from 0.9524 to 0.3077). Disabling Category matching (`no_C`) induces a similarly severe drop of **-0.2450** Macro-F1.
2. **Temporal Decay Influence:** Disabling Temporal proximity (`no_T`) drops accuracy from 84.00% to **72.67%** ($\Delta = -0.1076$), as older historical complaints cannot be separated from recurrent seasonal duplicates.
3. **Lexical and Semantic Redundancy on Challenge Set:** Disabling Lexical alone (`no_L`) or Semantic alone (`no_S`) yields zero change in overall challenge accuracy (126/150) or Macro-F1 (0.8343). On this synthetic challenge set, domain concepts and lexical n-grams overlap in coverage, while Rule 1–4 boundary guards preserve classification outcomes when one text channel is omitted.

---

## 2. Quoting MiniLM Timing & Memory Figures from `docs/RESULTS.md`

### 2.1 Verbatim Quote of MiniLM Timing from `docs/RESULTS.md`
The timing comparison table for local embedding inference is located at **lines 336–342** of [`docs/RESULTS.md`](file:///c:/Projects/CivicFlow/docs/RESULTS.md#L336-L342):

```markdown
336: ### Embedding Enabled vs Disabled Latency Comparison
337: 
338: | Configuration | Provider & Model | Cold-Start (ms) | Cache Stats | Query p50 / p95 (ms) | Full Upsert p50 / p95 (ms) | Overhead Ratio |
339: |---|---|:---:|:---:|:---:|:---:|:---:|
340: | **Embedding Disabled** | `none` (Synonym Dictionary) | -- | -- | 2.744 / 3.746 | **8.609** / **8.995** | 1.0x (Baseline) |
341: | **Embedding Enabled** | `local` (`Xenova/all-MiniLM-L6-v2`) | 461.34ms | 23 hits / 541 misses | 6.426 / 12.349 | **3186.149** / **4053.491** | 370.10x |
342: 
343: > [!NOTE]
344: > **Embedding Inference Overhead Note:** no embedding cache (541 misses, 23 hits); unoptimized prototype measurement; not representative of a tuned deployment.
```

- **Cold-Start Latency:** **461.34 ms** ([`docs/RESULTS.md:L341`](file:///c:/Projects/CivicFlow/docs/RESULTS.md#L341))
- **Full Upsert Median (p50):** **3186.149 ms** ([`docs/RESULTS.md:L341`](file:///c:/Projects/CivicFlow/docs/RESULTS.md#L341))
- **Full Upsert 95th Percentile (p95):** **4053.491 ms** ([`docs/RESULTS.md:L341`](file:///c:/Projects/CivicFlow/docs/RESULTS.md#L341))
- **Candidate Query p50 / p95:** **6.426 / 12.349 ms** ([`docs/RESULTS.md:L341`](file:///c:/Projects/CivicFlow/docs/RESULTS.md#L341))
- **Overhead Ratio:** **370.10x** compared to dictionary baseline ([`docs/RESULTS.md:L341`](file:///c:/Projects/CivicFlow/docs/RESULTS.md#L341))

### 2.2 Location of the 122 MB Memory Figure
The figure **122 MB** is **NOT** present in [`docs/RESULTS.md`](file:///c:/Projects/CivicFlow/docs/RESULTS.md) (which contains 0 occurrences of "MB" or "122").

The verified **122 MB** figure is documented in:
1. [`docs/FINAL_VERIFICATION_PACK.md:L45`](file:///c:/Projects/CivicFlow/docs/FINAL_VERIFICATION_PACK.md#L45):
   ```markdown
   | **3.2** | DONE | `5cb4ada` | Transformers dynamic import confirmed lazy; startup memory RSS verified at 122.26 MB (<512MB) |
   ```
2. [`docs/FINAL_VERIFICATION_PACK.md:L236`](file:///c:/Projects/CivicFlow/docs/FINAL_VERIFICATION_PACK.md#L236):
   ```markdown
   2. **Lazy Embedding Load:** `@huggingface/transformers` confirmed dynamically imported only when `EMBEDDING_PROVIDER="local"`. Process startup memory RSS measured at **122.26 MB** (<512 MB free tier ceiling).
   ```
3. [`docs/EXECUTION_LEDGER_2.md:L29`](file:///c:/Projects/CivicFlow/docs/EXECUTION_LEDGER_2.md#L29):
   ```markdown
   | 3.2 | DONE | 5cb4ada | Transformers dynamic import confirmed lazy; startup memory RSS verified at 122.26 MB (<512MB) |
   ```

---

## 3. Proof Media Requirement in Staff Resolution

**Finding: NO, staff resolution DOES NOT require proof media in the running code or validators.**

### Code Verification:
1. **Route Middleware ([`BACKEND/src/routes/complaint.routes.js:L117-L123`](file:///c:/Projects/CivicFlow/BACKEND/src/routes/complaint.routes.js#L117-L123)):**
   ```javascript
   router.patch(
      "/staff/complaints/:id/resolve",
      authenticate,
      requireDeptStaff,
      validateComplaintResolution,
      resolveComplaint
   );
   ```
   *Notice:* No `multer` upload middleware (e.g. `mediaUpload.array()`) is mounted on the resolution endpoint.

2. **Validator Schema ([`BACKEND/src/validator/complaint.validator.js:L160-L179`](file:///c:/Projects/CivicFlow/BACKEND/src/validator/complaint.validator.js#L160-L179)):**
   ```javascript
   export const validateComplaintResolution = [
      body("resolutionDescription")
         .isString().withMessage("Resolution description is required")
         .trim().notEmpty().withMessage("Resolution description is required"),
      body("resolutionMedia")
         .optional()   // <-- EXPLICITLY OPTIONAL
         .isArray().withMessage("Resolution media must be an array")
         .bail()
         .custom((media) => media.every((item) => ( ... ))),
      validateRequest,
   ];
   ```
   *Notice:* `resolutionMedia` is explicitly `.optional()`. Only `resolutionDescription` is mandatory.

3. **Controller Handling ([`BACKEND/src/controller/complaint.controller.js:L544-L551`](file:///c:/Projects/CivicFlow/BACKEND/src/controller/complaint.controller.js#L544-L551)):**
   ```javascript
   if (!req.body.resolutionDescription) {
      return res.status(400).json({ error: "Resolution description is required" });
   }

   complaint.status = "resolved";
   complaint.resolutionDescription = req.body.resolutionDescription;
   complaint.resolutionMedia = req.body.resolutionMedia ?? []; // <-- FALLS BACK TO EMPTY ARRAY
   ```
   *Notice:* If `req.body.resolutionMedia` is omitted, it defaults to an empty array `[]` without error.

*Conclusion:* While promotional project overviews (such as `PROJECT_FACTS_FOR_REPORTS.md:L19`) described staff resolution as requiring "mandatory image/video proof", the actual implemented code permits resolution with a text description alone.

---

## 4. `complaint.controller.js` Setting `duplicateOf` from Older Legacy Score

**Finding: YES, `complaint.controller.js` still sets `duplicateOf` using an older legacy heuristic scorer rather than the production HISC engine.**

### 4.1 The Controller Code ([`BACKEND/src/controller/complaint.controller.js:L42-L50`](file:///c:/Projects/CivicFlow/BACKEND/src/controller/complaint.controller.js#L42-L50)):
```javascript
const similarComplaints = await findSimilarComplaints(complaint);
complaint.similarityScore = similarComplaints[0]?.similarityScore ?? 0;
if (similarComplaints.length > 0) {
   const strongestMatch = similarComplaints[0];
   if (strongestMatch.classification === "duplicate") {
      complaint.duplicateOf = strongestMatch.complaint._id;
   }
}
await complaint.save();
```

### 4.2 How the Score is Calculated in `findSimilarComplaints`:
In [`BACKEND/src/service/complaintSimilarity.service.js:L67-L87`](file:///c:/Projects/CivicFlow/BACKEND/src/service/complaintSimilarity.service.js#L67-L87):
```javascript
export const calculateSimilarityScore = ({
   categoryScore = 0,
   locationScore = 0,
   textScore = 0,
} = {}) => {
   return Math.min(1, Math.max(0,
      categoryScore * 0.35 + locationScore * 0.25 + textScore * 0.4
   ));
};

export const classifySimilarity = (similarityScore = 0) => {
   if (similarityScore >= 0.75) return SIMILARITY_CLASSIFICATIONS.DUPLICATE;
   if (similarityScore >= 0.5) return SIMILARITY_CLASSIFICATIONS.RELATED;
   return SIMILARITY_CLASSIFICATIONS.INDEPENDENT;
};
```

### 4.3 Architectural Disconnect:
- The legacy `findSimilarComplaints` uses a 3-attribute linear formula ($0.35 \times \text{Cat} + 0.25 \times \text{Loc} + 0.40 \times \text{Jaccard}$) with threshold $\ge 0.75$.
- It does **not** evaluate semantic concept dictionaries, causal pairs, temporal decay, or directional overrides.
- Later in the same request ([`complaint.controller.js:L53`](file:///c:/Projects/CivicFlow/BACKEND/src/controller/complaint.controller.js#L53)), `upsertIncidentCluster(complaint)` is invoked, which executes the modern 5-feature HISC scorer (`scorePair.js`).
- Consequently, `complaint.duplicateOf` reflects the legacy heuristic score, while `complaint.groupId` and cluster assignments reflect the modern HISC engine.

---

## 5. Stored Details for Target Challenge Pairs (CH0001, CH0031, CH0106, CH0102)

Below are the exact values stored in [`BACKEND/results/paper_extras/features_550_pairs.json`](file:///c:/Projects/CivicFlow/BACKEND/results/paper_extras/features_550_pairs.json) and [`BACKEND/results/final_held_out_evaluation.json`](file:///c:/Projects/CivicFlow/BACKEND/results/final_held_out_evaluation.json):

### 5.1 Target Pairs Summary Table

| Pair ID | Distance | Hours Delta | HISC Score | Rule Fired | Actual Label | Predicted Label | Evaluation Outcome |
|---|:---:|:---:|:---:|---|:---:|:---:|:---:|
| **`CH0001`** | **15.53 m** | **0.75 h** (45m) | **0.635575** | `rule_5_duplicate` | `duplicate` | `duplicate` | **Correct** |
| **`CH0031`** | **15.53 m** | **0.75 h** (45m) | **0.675992** | `rule_5_duplicate` | `duplicate` | `duplicate` | **Correct** |
| **`CH0106`** | **133.43 m** | **1.50 h** (90m) | **0.886237** | `rule_5_opposing_direction` | `independent` | `independent` | **Correct** |
| **`CH0102`** | **46.58 m** | **1.33 h** (80m) | **0.805012** | `rule_5_duplicate` | `related` | `duplicate` | **Error (False Duplicate)** |

---

### 5.2 Deep-Dive Context for Each Pair

#### 1. `CH0001` (Synonymous Civic Phrasing)
- **Complaint A Text:** *"Deep asphalt fissure and tarmac peeling opposite Medavakkam petrol bunk."*
- **Complaint B Text:** *"Severe bitumen subsidence and sunken road depression near Medavakkam fuel station."*
- **Category:** Roads & Transport $\leftrightarrow$ Roads & Transport ($C = 1.0$)
- **Spatial / Temporal:** Distance = $15.53\text{ m}$ ($G = 0.9846$), $\Delta t = 0.75\text{ h}$ ($T = 0.9990$)
- **Text Affinity:** Lexical Jaccard = $0.0625$, Semantic Concept = $0.1111$
- **Scoring & Rule:** Weighted Score = **0.635575**. Because score $\ge 0.60$ and spatial threshold ($\le 250\text{ m}$) + category criteria are met, **`rule_5_duplicate`** fires.
- **Classification:** Predicted `duplicate`, matching ground truth `duplicate`.

#### 2. `CH0031` (Tamil-English Code-Mixing / Tanglish)
- **Complaint A Text:** *"Salai romba mosama irukku near Medavakkam junction periya pallam."*
- **Complaint B Text:** *"Periya kuli on road at Medavakkam junction vandi poda mudiyala."*
- **Category:** Roads & Transport $\leftrightarrow$ Roads & Transport ($C = 1.0$)
- **Spatial / Temporal:** Distance = $15.53\text{ m}$ ($G = 0.9846$), $\Delta t = 0.75\text{ h}$ ($T = 0.9990$)
- **Text Affinity:** Lexical Jaccard = $0.2000$, Semantic Concept = $0.2000$
- **Scoring & Rule:** Weighted Score = **0.675992**. Meets duplicate gate, firing **`rule_5_duplicate`**.
- **Classification:** Predicted `duplicate`, matching ground truth `duplicate`.

#### 3. `CH0106` (Opposing Cardinal Direction Override)
- **Complaint A Text:** *"Broken bus shelter glass panel at Medavakkam junction **southbound** bus stop."*
- **Complaint B Text:** *"Broken bus shelter glass panel at Medavakkam junction **northbound** bus stop."*
- **Category:** Street Infrastructure $\leftrightarrow$ Street Infrastructure ($C = 1.0$)
- **Spatial / Temporal:** Distance = $133.43\text{ m}$ ($G = 0.8751$), $\Delta t = 1.50\text{ h}$ ($T = 0.9979$)
- **Text Affinity:** Lexical Jaccard = $0.7778$, Semantic Concept = $0.8000$
- **Scoring & Rule:** Raw Weighted Score is extremely high (**0.886237**). However, the regex detected opposing directions (`southbound` vs `northbound`).
- **Rule Action:** In [`scorePair.js:269`](file:///c:/Projects/CivicFlow/BACKEND/src/hisc/scorePair.js#L269):
  `return opposingDir ? "rule_5_opposing_direction" : "rule_5_downgraded_related";`
  Because `opposingDir` is true, **`rule_5_opposing_direction`** executes and overrides the score, forcing the classification to **`independent`**.
- **Classification:** Predicted `independent`, correctly matching ground truth `independent`.

#### 4. `CH0102` (Causal Infrastructure Cascade — False Duplicate)
- **Complaint A Text:** *"Stormwater drain inlet grate missing opposite Velachery railway station allowing trash inside."*
- **Complaint B Text:** *"Stormwater conduit blocked by trash 20 meters downstream of missing grate opposite Velachery railway station."*
- **Category:** Drainage & Flooding $\leftrightarrow$ Drainage & Flooding ($C = 1.0$)
- **Spatial / Temporal:** Distance = $46.58\text{ m}$ ($G = 0.9545$), $\Delta t = 1.33\text{ h}$ ($T = 0.9982$)
- **Text Affinity:** Lexical Jaccard = $0.5000$, Semantic Concept = $0.5556$
- **Scoring & Rule:** Weighted Score = **0.805012**. Because both complaints share category and coordinates within 50 meters, the rule engine fired **`rule_5_duplicate`**.
- **Ground Truth vs Prediction:** The actual human relationship is **`related`** (upstream missing grate caused downstream conduit blockage, requiring separate repair tasks). HISC misclassifies this pair as **`duplicate`**, representing a known edge-case false positive documented in the error analysis.
