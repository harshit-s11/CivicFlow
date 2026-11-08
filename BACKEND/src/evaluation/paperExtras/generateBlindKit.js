import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadDatasetPartitions } from "../hiscEvaluationHarness.js";
import { distanceInMeters } from "../../hisc/scorePair.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, "../../../results/paper_extras/blind_annotation_kit");

// Seeded PRNG (Mulberry32)
export function createMulberry32(seed = 42) {
   let s = seed >>> 0;
   return function next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}

function sampleFromArray(arr, count, rand) {
   const copy = [...arr];
   for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
   }
   return copy.slice(0, count);
}

export function generateBlindKit() {
   const rand = createMulberry32(42);
   const { partitions } = loadDatasetPartitions();

   const testPairs = partitions.test;
   const challengePairs = partitions.challenge;

   // Test partition sampling (40 pairs: 12 dup, 14 rel, 14 ind)
   const testDup = testPairs.filter((p) => p.label === "duplicate");
   const testRel = testPairs.filter((p) => p.label === "related");
   const testInd = testPairs.filter((p) => p.label === "independent");

   const sampledTestDup = sampleFromArray(testDup, 12, rand);
   const sampledTestRel = sampleFromArray(testRel, 14, rand);
   const sampledTestInd = sampleFromArray(testInd, 14, rand);

   // Challenge partition sampling (60 pairs: 20 dup, 17 rel, 23 ind)
   const chalDup = challengePairs.filter((p) => p.label === "duplicate");
   const chalRel = challengePairs.filter((p) => p.label === "related");
   const chalInd = challengePairs.filter((p) => p.label === "independent");

   const sampledChalDup = sampleFromArray(chalDup, 20, rand);
   const sampledChalRel = sampleFromArray(chalRel, 17, rand);
   const sampledChalInd = sampleFromArray(chalInd, 23, rand);

   const allSampled = [
      ...sampledTestDup.map((p) => ({ ...p, source_split: "test" })),
      ...sampledTestRel.map((p) => ({ ...p, source_split: "test" })),
      ...sampledTestInd.map((p) => ({ ...p, source_split: "test" })),
      ...sampledChalDup.map((p) => ({ ...p, source_split: "challenge" })),
      ...sampledChalRel.map((p) => ({ ...p, source_split: "challenge" })),
      ...sampledChalInd.map((p) => ({ ...p, source_split: "challenge" })),
   ];

   if (allSampled.length !== 100) {
      throw new Error(`Expected exactly 100 sampled pairs, got ${allSampled.length}`);
   }

   // Shuffle the 100 pairs deterministically to blind annotators to source split and class blocks
   for (let i = allSampled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [allSampled[i], allSampled[j]] = [allSampled[j], allSampled[i]];
   }

   if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
   }

   // Generate clean manifest with keys
   const manifest = [];
   const blindCsvRows = [
      "sample_id,source_split,category_a,category_b,complaint_a,complaint_b,distance_meters,hours_delta",
   ];
   const templateCsvRows = [
      "sample_id,annotator_label,confidence,notes",
   ];

   const escapeCsv = (str) => {
      const s = String(str ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
      return `"${s}"`;
   };

   allSampled.forEach((item, idx) => {
      const sampleId = `S${String(idx + 1).padStart(3, "0")}`;

      const coordsA = item.complaint_a.location?.coordinates;
      const coordsB = item.complaint_b.location?.coordinates;
      const dist = distanceInMeters(coordsA, coordsB);

      const dateA = new Date(item.complaint_a.createdAt).getTime();
      const dateB = new Date(item.complaint_b.createdAt).getTime();
      const hours = Math.abs(dateA - dateB) / 3600000;

      const titleA = item.complaint_a.title || "";
      const titleB = item.complaint_b.title || "";

      manifest.push({
         sample_id: sampleId,
         pair_id: item.pair_id,
         source_split: item.source_split,
         ground_truth_label: item.label,
         category_a: item.complaint_a.category,
         category_b: item.complaint_b.category,
         complaint_a: titleA,
         complaint_b: titleB,
         distance_meters: Number(dist.toFixed(2)),
         hours_delta: Number(hours.toFixed(2)),
      });

      blindCsvRows.push(
         [
            sampleId,
            item.source_split,
            escapeCsv(item.complaint_a.category),
            escapeCsv(item.complaint_b.category),
            escapeCsv(titleA),
            escapeCsv(titleB),
            dist.toFixed(2),
            hours.toFixed(2),
         ].join(",")
      );

      templateCsvRows.push(`${sampleId},,,`);
   });

   // Write files
   const blindCsvPath = path.join(OUTPUT_DIR, "blind_annotation_100_pairs.csv");
   const annotator1Path = path.join(OUTPUT_DIR, "annotator_1_template.csv");
   const annotator2Path = path.join(OUTPUT_DIR, "annotator_2_template.csv");
   const manifestPath = path.join(OUTPUT_DIR, "sample_manifest_with_keys.json");
   const guidelinesPath = path.join(OUTPUT_DIR, "ANNOTATION_GUIDELINES.md");

   fs.writeFileSync(blindCsvPath, `${blindCsvRows.join("\n")}\n`, "utf8");
   fs.writeFileSync(annotator1Path, `${templateCsvRows.join("\n")}\n`, "utf8");
   fs.writeFileSync(annotator2Path, `${templateCsvRows.join("\n")}\n`, "utf8");
   fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

   // Annotation Guidelines Markdown
   const guidelinesMd = `# Civic Complaint Pairwise Annotation Guidelines

## Overview
This document guides independent human evaluators in assessing the relationship between two municipal civic complaints. Each evaluated pair must be classified into exactly one of three mutually exclusive categories:
- \`duplicate\`
- \`related\`
- \`independent\`

---

## 1. Category Definitions

### A. \`duplicate\`
The two complaints refer to the **exact same physical defect, obstruction, or occurrence** at the same location and during the same active lifecycle.
- **Criteria:**
  - High categorical compatibility (e.g., both Roads & Transport, or both Waste & Cleanliness).
  - Spatial proximity typically within 250 meters.
  - Temporal proximity typically within 7 days (168 hours).
  - Describes the same physical defect (e.g., "huge pothole outside metro gate" vs "deep crater near metro entrance").
- **Exclusion:** Opposing traffic directions on divided highways (e.g., "northbound lane" vs "southbound lane") are NOT duplicates; they are separate defects.

### B. \`related\`
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

### C. \`independent\`
The two complaints represent **completely separate, unrelated incidents** that happen to occur in the municipality.
- **Criteria:**
  - Different physical locations (>1,000 meters, or distant municipal wards).
  - Unrelated categories with no causal coupling (e.g., streetlight repair vs garbage collection 800m away).
  - Large temporal separation (>30 days / 720 hours).
  - Coincidental proximity without defect commonality.

---

## 2. Instructions for Annotators
1. Open \`blind_annotation_100_pairs.csv\`.
2. For each row (\`S001\` through \`S100\`), record your assessment in \`annotator_X_template.csv\`:
   - \`annotator_label\`: exactly one of \`duplicate\`, \`related\`, \`independent\`.
   - \`confidence\`: subjective rating from 1 (low) to 5 (high).
   - \`notes\`: optional brief rationale, especially for edge cases.
3. Save the completed file and submit for agreement evaluation using \`evaluateBlindAnnotation.js\`.
`;

   fs.writeFileSync(guidelinesPath, guidelinesMd, "utf8");

   console.log(`[Phase 4] Generated turn-key blind annotation kit at: ${OUTPUT_DIR}`);
   console.log(`  - Blinded CSV (100 pairs): ${blindCsvPath}`);
   console.log(`  - Annotator 1 Template: ${annotator1Path}`);
   console.log(`  - Annotator 2 Template: ${annotator2Path}`);
   console.log(`  - Guidelines: ${guidelinesPath}`);
   console.log(`  - Secret Manifest (keys): ${manifestPath}`);

   return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   generateBlindKit();
}
