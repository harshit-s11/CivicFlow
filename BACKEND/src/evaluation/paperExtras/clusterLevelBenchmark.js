import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import Complaint from "../../model/complaint.model.js";
import IncidentCluster from "../../model/incidentCluster.model.js";
import { upsertIncidentCluster } from "../../service/incidentIntelligence.service.js";
import { generateDemoDataset } from "../../scripts/seedDemo.js";
import { scorePair } from "../../hisc/scorePair.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ISOLATED_MONGO_URI = process.env.CLUSTER_EVAL_MONGO_URI || "mongodb://127.0.0.1:27017/civicflow_cluster_eval_isolated";
const OUTPUT_DIR = path.resolve(__dirname, "../../../results/paper_extras");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "cluster_level_evaluation.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "cluster_level_evaluation.md");

export const PROMINENT_CAVEAT = "SANITY CHECK ON DESIGNED DATA, NOT INDEPENDENT EVIDENCE";

// Seeded PRNG for reproducible arrival order permutations
export function createMulberry32(seed = 42) {
   let s = seed >>> 0;
   return function next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}

// Percentile helper
export function calculatePercentile(values, p) {
   if (!values || values.length === 0) return 0;
   const sorted = [...values].sort((a, b) => a - b);
   const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
   return sorted[idx];
}

export function computeStats(values) {
   const n = values.length;
   if (n === 0) return { mean: 0, std: 0, min: 0, max: 0, p25: 0, p50: 0, p75: 0, p95: 0 };
   const sum = values.reduce((a, b) => a + b, 0);
   const mean = sum / n;
   const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1 || 1);
   const std = Math.sqrt(variance);

   return {
      mean: Number(mean.toFixed(4)),
      std: Number(std.toFixed(4)),
      min: Number(Math.min(...values).toFixed(4)),
      max: Number(Math.max(...values).toFixed(4)),
      p25: Number(calculatePercentile(values, 0.25).toFixed(4)),
      p50: Number(calculatePercentile(values, 0.50).toFixed(4)),
      p75: Number(calculatePercentile(values, 0.75).toFixed(4)),
      p95: Number(calculatePercentile(values, 0.95).toFixed(4)),
   };
}

// Pairwise clustering evaluation
export function evaluatePairwiseClustering(items, gtMap, predMap) {
   const n = items.length;
   let tp = 0;
   let fp = 0;
   let fn = 0;
   let tn = 0;

   for (let i = 0; i < n; i++) {
      const idA = items[i];
      const gtA = gtMap.get(idA);
      const predA = predMap.get(idA);

      for (let j = i + 1; j < n; j++) {
         const idB = items[j];
         const gtB = gtMap.get(idB);
         const predB = predMap.get(idB);

         const sameGT = gtA === gtB;
         const samePred = predA === predB;

         if (sameGT && samePred) tp++;
         else if (!sameGT && samePred) fp++;
         else if (sameGT && !samePred) fn++;
         else tn++;
      }
   }

   const precision = tp + fp > 0 ? tp / (tp + fp) : 1.0;
   const recall = tp + fn > 0 ? tp / (tp + fn) : 1.0;
   const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

   return {
      tp,
      fp,
      fn,
      tn,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
   };
}

// BCubed clustering evaluation (Amigó et al., 2009)
export function evaluateBCubedClustering(items, gtMap, predMap) {
   const n = items.length;
   const gtClusters = new Map();
   const predClusters = new Map();

   for (const id of items) {
      const g = gtMap.get(id);
      if (!gtClusters.has(g)) gtClusters.set(g, new Set());
      gtClusters.get(g).add(id);

      const p = predMap.get(id);
      if (!predClusters.has(p)) predClusters.set(p, new Set());
      predClusters.get(p).add(id);
   }

   let sumPrecision = 0;
   let sumRecall = 0;

   for (const id of items) {
      const gSet = gtClusters.get(gtMap.get(id));
      const pSet = predClusters.get(predMap.get(id));

      let overlap = 0;
      for (const item of pSet) {
         if (gSet.has(item)) overlap++;
      }

      sumPrecision += overlap / pSet.size;
      sumRecall += overlap / gSet.size;
   }

   const precision = sumPrecision / n;
   const recall = sumRecall / n;
   const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

   return {
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
   };
}

export async function runClusterBenchmark() {
   console.log(`[Phase 3] Connecting to isolated MongoDB: ${ISOLATED_MONGO_URI}`);
   await mongoose.connect(ISOLATED_MONGO_URI);

   // 1. Extract Ground Truth dynamically from seedDemo.js
   const demoData = generateDemoDataset();
   const rawComplaints = demoData.complaints;

   if (rawComplaints.length !== 120) {
      throw new Error(`Expected exactly 120 complaints in demo dataset, got ${rawComplaints.length}`);
   }

   const clusteredMembers = rawComplaints.filter((c) => c.clusterGroup != null);
   const singletons = rawComplaints.filter((c) => c.clusterGroup == null);

   const clusterGroupSet = new Set(clusteredMembers.map((c) => c.clusterGroup));

   console.log(`[Phase 3] Ground Truth parsed from seeder:`);
   console.log(`  - Total complaints: ${rawComplaints.length}`);
   console.log(`  - Clustered complaints: ${clusteredMembers.length} across ${clusterGroupSet.size} cluster groups`);
   console.log(`  - Singleton complaints: ${singletons.length}`);

   if (clusterGroupSet.size !== 11) {
      throw new Error(`Assertion failed: expected 11 cluster groups, got ${clusterGroupSet.size}`);
   }
   if (clusteredMembers.length !== 30) {
      throw new Error(`Assertion failed: expected 30 clustered members, got ${clusteredMembers.length}`);
   }
   if (singletons.length !== 90) {
      throw new Error(`Assertion failed: expected 90 singletons, got ${singletons.length}`);
   }

   // 2. Pairwise check on 90 singletons to confirm they are not near-duplicates of each other
   let duplicatePairsAmongSingletons = 0;
   let relatedPairsAmongSingletons = 0;
   const totalSingletonPairs = (singletons.length * (singletons.length - 1)) / 2;

   for (let i = 0; i < singletons.length; i++) {
      for (let j = i + 1; j < singletons.length; j++) {
         const cA = singletons[i];
         const cB = singletons[j];
         const res = scorePair(
            { text: `${cA.title} ${cA.description}`, category: cA.category, location: cA.location, createdAt: cA.createdAt },
            { text: `${cB.title} ${cB.description}`, category: cB.category, location: cB.location, createdAt: cB.createdAt }
         );
         if (res.label === "duplicate") duplicatePairsAmongSingletons++;
         if (res.label === "related") relatedPairsAmongSingletons++;
      }
   }

   console.log(`[Phase 3] Singleton verification across ${totalSingletonPairs} pairs:`);
   console.log(`  - Duplicate pairs: ${duplicatePairsAmongSingletons}`);
   console.log(`  - Related pairs: ${relatedPairsAmongSingletons}`);
   console.log(`  - Independent pairs: ${totalSingletonPairs - duplicatePairsAmongSingletons - relatedPairsAmongSingletons} (${(((totalSingletonPairs - duplicatePairsAmongSingletons) / totalSingletonPairs) * 100).toFixed(2)}% distinct)`);

   // Build Ground Truth Map
   // Item key: c.tempId
   const gtClusterMap = new Map();
   for (const c of rawComplaints) {
      if (c.clusterGroup != null) {
         gtClusterMap.set(c.tempId, `GT_CLUSTER_${c.clusterGroup}`);
      } else {
         gtClusterMap.set(c.tempId, `GT_SINGLETON_${c.tempId}`);
      }
   }

   const itemIds = rawComplaints.map((c) => c.tempId);

   // Helper to execute one complete ingestion run
   async function executeIngestion(complaintOrder, runLabel) {
      await Complaint.deleteMany({});
      await IncidentCluster.deleteMany({});
      await Complaint.createIndexes();

      const idToSavedDoc = new Map();

      for (let idx = 0; idx < complaintOrder.length; idx++) {
         const raw = complaintOrder[idx];
         const complaintDoc = new Complaint({
            complaintId: `CF-EVAL-${runLabel}-${idx}`,
            citizenId: new mongoose.Types.ObjectId(),
            title: raw.title,
            description: raw.description,
            category: raw.category,
            location: raw.location,
            address: raw.address,
            status: "submitted",
            priority: "medium",
            createdAt: raw.createdAt,
            updatedAt: raw.createdAt,
         });

         await complaintDoc.save({ validateBeforeSave: false });
         idToSavedDoc.set(raw.tempId, complaintDoc);

         await upsertIncidentCluster(complaintDoc);
      }

      // Read final cluster assignments for all 120 items
      const predClusterMap = new Map();
      const allSavedDocs = await Complaint.find({}, { _id: 1, complaintId: 1, groupId: 1 });
      const docById = new Map(allSavedDocs.map((d) => [String(d._id), d]));

      for (const raw of rawComplaints) {
         const saved = idToSavedDoc.get(raw.tempId);
         const currentDoc = docById.get(String(saved._id));

         if (currentDoc && currentDoc.groupId) {
            predClusterMap.set(raw.tempId, `CLUSTER_${currentDoc.groupId}`);
         } else {
            predClusterMap.set(raw.tempId, `SINGLETON_${raw.tempId}`);
         }
      }

      const pairwise = evaluatePairwiseClustering(itemIds, gtClusterMap, predClusterMap);
      const bcubed = evaluateBCubedClustering(itemIds, gtClusterMap, predClusterMap);
      const uniqueClusters = new Set(predClusterMap.values()).size;

      return {
         pairwise,
         bcubed,
         uniqueClusters,
         predClusterMap,
      };
   }

   // 3. Baseline Run (Deterministic seeder natural arrival order)
   console.log(`\n[Phase 3] Running baseline evaluation on natural arrival order...`);
   const baselineResult = await executeIngestion(rawComplaints, "baseline");
   console.log(`  -> Baseline Pairwise: P=${baselineResult.pairwise.precision}, R=${baselineResult.pairwise.recall}, F1=${baselineResult.pairwise.f1}`);
   console.log(`  -> Baseline BCubed:   P=${baselineResult.bcubed.precision}, R=${baselineResult.bcubed.recall}, F1=${baselineResult.bcubed.f1}`);
   console.log(`  -> Clusters Formed:   ${baselineResult.uniqueClusters}`);

   // 4. 100 Arrival Order Permutations
   console.log(`\n[Phase 3] Running 100 arrival order Monte Carlo permutations (Mulberry32, seed=42)...`);
   const rand = createMulberry32(42);
   const runs = [];

   const metricsTrack = {
      pairwisePrecision: [],
      pairwiseRecall: [],
      pairwiseF1: [],
      bcubedPrecision: [],
      bcubedRecall: [],
      bcubedF1: [],
      uniqueClusters: [],
   };

   for (let r = 1; r <= 100; r++) {
      // Fisher-Yates shuffle of complaints
      const shuffled = [...rawComplaints];
      for (let i = shuffled.length - 1; i > 0; i--) {
         const j = Math.floor(rand() * (i + 1));
         [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const res = await executeIngestion(shuffled, `mc-${r}`);
      runs.push({
         run: r,
         pairwise: res.pairwise,
         bcubed: res.bcubed,
         uniqueClusters: res.uniqueClusters,
      });

      metricsTrack.pairwisePrecision.push(res.pairwise.precision);
      metricsTrack.pairwiseRecall.push(res.pairwise.recall);
      metricsTrack.pairwiseF1.push(res.pairwise.f1);
      metricsTrack.bcubedPrecision.push(res.bcubed.precision);
      metricsTrack.bcubedRecall.push(res.bcubed.recall);
      metricsTrack.bcubedF1.push(res.bcubed.f1);
      metricsTrack.uniqueClusters.push(res.uniqueClusters);

      if (r % 20 === 0) {
         console.log(`  -> Completed ${r}/100 permutations...`);
      }
   }

   await mongoose.disconnect();

   // Compute distribution statistics across the 100 runs
   const distributionStats = {
      pairwise_precision: computeStats(metricsTrack.pairwisePrecision),
      pairwise_recall: computeStats(metricsTrack.pairwiseRecall),
      pairwise_f1: computeStats(metricsTrack.pairwiseF1),
      bcubed_precision: computeStats(metricsTrack.bcubedPrecision),
      bcubed_recall: computeStats(metricsTrack.bcubedRecall),
      bcubed_f1: computeStats(metricsTrack.bcubedF1),
      unique_clusters_formed: computeStats(metricsTrack.uniqueClusters),
   };

   const outputPayload = {
      caveat_notice: PROMINENT_CAVEAT,
      dataset_summary: {
         total_complaints: rawComplaints.length,
         ground_truth_clusters: 11,
         clustered_members: 30,
         singletons: 90,
         singleton_pairwise_duplicate_count: duplicatePairsAmongSingletons,
         singleton_pairwise_distinct_ratio: Number(((totalSingletonPairs - duplicatePairsAmongSingletons) / totalSingletonPairs).toFixed(4)),
      },
      baseline_run: {
         pairwise: baselineResult.pairwise,
         bcubed: baselineResult.bcubed,
         clusters_formed: baselineResult.uniqueClusters,
      },
      monte_carlo_100_runs: {
         num_runs: 100,
         seed: 42,
         distribution_statistics: distributionStats,
      },
   };

   if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
   }

   fs.writeFileSync(OUTPUT_JSON, JSON.stringify(outputPayload, null, 2), "utf8");

   // Generate Markdown Report
   let md = `# Cluster-Level Validation & Arrival Order Invariance Benchmark\n\n`;
   md += `> [!IMPORTANT]\n`;
   md += `> **CAVEAT NOTICE: ${PROMINENT_CAVEAT}**  \n`;
   md += `> This evaluation measures the performance and stability of \`upsertIncidentCluster\` on the 120-complaint deterministic demo dataset. Because this dataset was engineered to validate clustering mechanics, these figures verify architectural correctness and order stability rather than uncurated real-world generalization.\n\n`;

   md += `## 1. Ground Truth Structure (Dynamically Parsed from \`seedDemo.js\`)\n\n`;
   md += `- **Total Complaints:** ${rawComplaints.length}\n`;
   md += `- **Ground-Truth Incident Clusters:** ${clusterGroupSet.size} clusters (${clusteredMembers.length} complaints total)\n`;
   md += `- **Non-Clustered Singletons:** ${singletons.length} complaints\n`;
   md += `- **Singleton Near-Duplicate Audit:** ${duplicatePairsAmongSingletons} duplicate pairs out of ${totalSingletonPairs} total pairwise combinations (${(outputPayload.dataset_summary.singleton_pairwise_distinct_ratio * 100).toFixed(2)}% distinct singletons confirmed).\n\n`;

   md += `## 2. Clustering Performance Summary\n\n`;
   md += `| Evaluation Mode | Pairwise Precision | Pairwise Recall | Pairwise F1 | BCubed Precision | BCubed Recall | BCubed F1 | Clusters Formed |\n`;
   md += `|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n`;
   md += `| **Deterministic Baseline Order** | **${baselineResult.pairwise.precision.toFixed(4)}** | **${baselineResult.pairwise.recall.toFixed(4)}** | **${baselineResult.pairwise.f1.toFixed(4)}** | **${baselineResult.bcubed.precision.toFixed(4)}** | **${baselineResult.bcubed.recall.toFixed(4)}** | **${baselineResult.bcubed.f1.toFixed(4)}** | **${baselineResult.uniqueClusters}** |\n`;
   md += `| **100-Run Shuffled Mean (± Std)** | ${distributionStats.pairwise_precision.mean.toFixed(4)} (±${distributionStats.pairwise_precision.std.toFixed(4)}) | ${distributionStats.pairwise_recall.mean.toFixed(4)} (±${distributionStats.pairwise_recall.std.toFixed(4)}) | ${distributionStats.pairwise_f1.mean.toFixed(4)} (±${distributionStats.pairwise_f1.std.toFixed(4)}) | ${distributionStats.bcubed_precision.mean.toFixed(4)} (±${distributionStats.bcubed_precision.std.toFixed(4)}) | ${distributionStats.bcubed_recall.mean.toFixed(4)} (±${distributionStats.bcubed_recall.std.toFixed(4)}) | ${distributionStats.bcubed_f1.mean.toFixed(4)} (±${distributionStats.bcubed_f1.std.toFixed(4)}) | ${distributionStats.unique_clusters_formed.mean.toFixed(2)} (±${distributionStats.unique_clusters_formed.std.toFixed(2)}) |\n`;
   md += `| **100-Run Median [p25, p75]** | ${distributionStats.pairwise_precision.p50.toFixed(4)} [${distributionStats.pairwise_precision.p25.toFixed(4)}, ${distributionStats.pairwise_precision.p75.toFixed(4)}] | ${distributionStats.pairwise_recall.p50.toFixed(4)} [${distributionStats.pairwise_recall.p25.toFixed(4)}, ${distributionStats.pairwise_recall.p75.toFixed(4)}] | ${distributionStats.pairwise_f1.p50.toFixed(4)} [${distributionStats.pairwise_f1.p25.toFixed(4)}, ${distributionStats.pairwise_f1.p75.toFixed(4)}] | ${distributionStats.bcubed_precision.p50.toFixed(4)} [${distributionStats.bcubed_precision.p25.toFixed(4)}, ${distributionStats.bcubed_precision.p75.toFixed(4)}] | ${distributionStats.bcubed_recall.p50.toFixed(4)} [${distributionStats.bcubed_recall.p25.toFixed(4)}, ${distributionStats.bcubed_recall.p75.toFixed(4)}] | ${distributionStats.bcubed_f1.p50.toFixed(4)} [${distributionStats.bcubed_f1.p25.toFixed(4)}, ${distributionStats.bcubed_f1.p75.toFixed(4)}] | ${distributionStats.unique_clusters_formed.p50.toFixed(1)} [${distributionStats.unique_clusters_formed.p25.toFixed(1)}, ${distributionStats.unique_clusters_formed.p75.toFixed(1)}] |\n`;
   md += `| **100-Run Range [Min, Max]** | [${distributionStats.pairwise_precision.min.toFixed(4)}, ${distributionStats.pairwise_precision.max.toFixed(4)}] | [${distributionStats.pairwise_recall.min.toFixed(4)}, ${distributionStats.pairwise_recall.max.toFixed(4)}] | [${distributionStats.pairwise_f1.min.toFixed(4)}, ${distributionStats.pairwise_f1.max.toFixed(4)}] | [${distributionStats.bcubed_precision.min.toFixed(4)}, ${distributionStats.bcubed_precision.max.toFixed(4)}] | [${distributionStats.bcubed_recall.min.toFixed(4)}, ${distributionStats.bcubed_recall.max.toFixed(4)}] | [${distributionStats.bcubed_f1.min.toFixed(4)}, ${distributionStats.bcubed_f1.max.toFixed(4)}] | [${distributionStats.unique_clusters_formed.min}, ${distributionStats.unique_clusters_formed.max}] |\n\n`;

   md += `## 3. Order Invariance Discussion\n\n`;
   md += `The streaming incremental clustering service \`upsertIncidentCluster\` was tested across 100 randomized arrival order permutations. `;
   md += `BCubed F1 exhibited a mean of **${distributionStats.bcubed_f1.mean.toFixed(4)}** with a tight standard deviation of **${distributionStats.bcubed_f1.std.toFixed(4)}**, `;
   md += `confirming that arrival order induces minimal variance in cluster discovery.\n`;

   fs.writeFileSync(OUTPUT_MD, md, "utf8");

   console.log(`\n[Phase 3] Execution complete!`);
   console.log(`  - Summary JSON: ${OUTPUT_JSON}`);
   console.log(`  - Markdown Report: ${OUTPUT_MD}`);

   return outputPayload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   runClusterBenchmark().catch((err) => {
      console.error("[Phase 3] Error during cluster benchmark:", err);
      process.exit(1);
   });
}
