import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import { scorePair } from "../../hisc/scorePair.js";
import { DEFAULT_HISC_CONFIG, HISC_EVAL_PRESET } from "../../hisc/config.js";
import { loadDatasetPartitions } from "../hiscEvaluationHarness.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, "../../../results/paper_extras");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "scoring_microbenchmark.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "scoring_microbenchmark.md");
const OUTPUT_HARDWARE_JSON = path.join(OUTPUT_DIR, "hardware.json");

export function calculatePercentile(values, p) {
   if (!values || values.length === 0) return 0;
   const sorted = [...values].sort((a, b) => a - b);
   const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
   return sorted[idx];
}

export function computeLatencyStats(durationsNs) {
   const n = durationsNs.length;
   const sumNs = durationsNs.reduce((acc, v) => acc + v, 0);
   const meanNs = sumNs / n;
   const varianceNs = durationsNs.reduce((acc, v) => acc + (v - meanNs) ** 2, 0) / (n - 1 || 1);
   const stdNs = Math.sqrt(varianceNs);

   const p50Ns = calculatePercentile(durationsNs, 0.50);
   const p90Ns = calculatePercentile(durationsNs, 0.90);
   const p95Ns = calculatePercentile(durationsNs, 0.95);
   const p99Ns = calculatePercentile(durationsNs, 0.99);
   const p99_9Ns = calculatePercentile(durationsNs, 0.999);
   const minNs = Math.min(...durationsNs);
   const maxNs = Math.max(...durationsNs);

   const totalSec = sumNs / 1e9;
   const throughput = n / totalSec;

   return {
      sample_count: n,
      total_time_seconds: Number(totalSec.toFixed(4)),
      throughput_pairs_per_sec: Number(throughput.toFixed(1)),
      mean_microseconds: Number((meanNs / 1000).toFixed(3)),
      mean_milliseconds: Number((meanNs / 1000000).toFixed(4)),
      std_microseconds: Number((stdNs / 1000).toFixed(3)),
      p50_median_microseconds: Number((p50Ns / 1000).toFixed(3)),
      p90_microseconds: Number((p90Ns / 1000).toFixed(3)),
      p95_microseconds: Number((p95Ns / 1000).toFixed(3)),
      p99_microseconds: Number((p99Ns / 1000).toFixed(3)),
      p99_9_microseconds: Number((p99_9Ns / 1000).toFixed(3)),
      min_microseconds: Number((minNs / 1000).toFixed(3)),
      max_microseconds: Number((maxNs / 1000).toFixed(3)),
   };
}

export async function extractHardwareProfile() {
   const cpus = os.cpus();
   let mongoVersion = "Unknown (Not Connected)";

   try {
      await mongoose.connect("mongodb://127.0.0.1:27017/civicflow_cluster_eval_isolated", { serverSelectionTimeoutMS: 2000 });
      const adminDb = mongoose.connection.db.admin();
      const buildInfo = await adminDb.buildInfo();
      mongoVersion = buildInfo.version || "Unknown";
      await mongoose.disconnect();
   } catch {
      // Standalone fallback
   }

   const profile = {
      cpu: {
         model: cpus[0]?.model || "Unknown",
         speed_mhz: cpus[0]?.speed || 0,
         cores_physical: Math.max(1, Math.floor(cpus.length / 2)),
         cores_logical: cpus.length,
      },
      memory: {
         total_gb: Number((os.totalmem() / 1e9).toFixed(2)),
         free_gb: Number((os.freemem() / 1e9).toFixed(2)),
      },
      os: {
         platform: os.platform(),
         type: os.type(),
         release: os.release(),
         arch: os.arch(),
      },
      runtime: {
         node_version: process.version,
         v8_version: process.versions.v8,
      },
      database: {
         mongodb_version: mongoVersion,
         mongoose_version: mongoose.version,
      },
   };

   return profile;
}

export async function runScoringMicrobenchmark() {
   console.log("[Phase 5] Loading evaluation pairs for zero-I/O scoring benchmark...");
   const { partitions } = loadDatasetPartitions();

   const allPairs = [
      ...partitions.train,
      ...partitions.val,
      ...partitions.test,
      ...partitions.challenge,
   ];

   console.log(`[Phase 5] Pool size: ${allPairs.length} unique pairs. Generating 10,000 deterministic sample sequence...`);

   // Build 10,000 sample pairs by cycling deterministically
   const testSamples = [];
   for (let i = 0; i < 10000; i++) {
      testSamples.push(allPairs[i % allPairs.length]);
   }

   // JIT Warm-up (1,000 unrecorded calls)
   console.log("[Phase 5] Warming up V8 JIT & TurboFan inline caches (1,000 calls)...");
   for (let i = 0; i < 1000; i++) {
      const p = testSamples[i];
      scorePair(p.complaint_a, p.complaint_b, HISC_EVAL_PRESET);
   }

   // 1. Benchmark Evaluation Preset (relatedThreshold = 0.10)
   console.log("[Phase 5] Benchmarking Preset 1: Evaluation Preset (relatedThreshold = 0.10, 10,000 calls)...");
   const evalDurationsNs = [];
   for (let i = 0; i < 10000; i++) {
      const p = testSamples[i];
      const t0 = process.hrtime.bigint();
      scorePair(p.complaint_a, p.complaint_b, HISC_EVAL_PRESET);
      const t1 = process.hrtime.bigint();
      evalDurationsNs.push(Number(t1 - t0));
   }
   const evalStats = computeLatencyStats(evalDurationsNs);
   console.log(`  -> Mean: ${evalStats.mean_microseconds} μs (${evalStats.mean_milliseconds} ms), p50: ${evalStats.p50_median_microseconds} μs, p95: ${evalStats.p95_microseconds} μs, p99: ${evalStats.p99_microseconds} μs`);
   console.log(`  -> Throughput: ${evalStats.throughput_pairs_per_sec.toLocaleString()} pairs/sec`);

   // 2. Benchmark Deployed Preset (relatedThreshold = 0.35)
   console.log("[Phase 5] Benchmarking Preset 2: Deployed Preset (DEFAULT_HISC_CONFIG, relatedThreshold = 0.35, 10,000 calls)...");
   const deployedDurationsNs = [];
   for (let i = 0; i < 10000; i++) {
      const p = testSamples[i];
      const t0 = process.hrtime.bigint();
      scorePair(p.complaint_a, p.complaint_b, DEFAULT_HISC_CONFIG);
      const t1 = process.hrtime.bigint();
      deployedDurationsNs.push(Number(t1 - t0));
   }
   const deployedStats = computeLatencyStats(deployedDurationsNs);
   console.log(`  -> Mean: ${deployedStats.mean_microseconds} μs (${deployedStats.mean_milliseconds} ms), p50: ${deployedStats.p50_median_microseconds} μs, p95: ${deployedStats.p95_microseconds} μs, p99: ${deployedStats.p99_microseconds} μs`);
   console.log(`  -> Throughput: ${deployedStats.throughput_pairs_per_sec.toLocaleString()} pairs/sec`);

   // Hardware extraction
   const hardware = await extractHardwareProfile();

   const resultsPayload = {
      benchmark_protocol: {
         sample_size: 10000,
         jit_warmup_iterations: 1000,
         timing_method: "process.hrtime.bigint()",
         io_mode: "zero-I/O in-memory",
      },
      evaluation_preset: {
         name: "HISC-eval",
         thresholds: { duplicate: HISC_EVAL_PRESET.duplicateThreshold, related: HISC_EVAL_PRESET.relatedThreshold },
         statistics: evalStats,
      },
      deployed_preset: {
         name: "production-default (DEFAULT_HISC_CONFIG)",
         thresholds: { duplicate: DEFAULT_HISC_CONFIG.duplicateThreshold, related: DEFAULT_HISC_CONFIG.relatedThreshold },
         statistics: deployedStats,
      },
      hardware,
   };

   if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
   }

   fs.writeFileSync(OUTPUT_JSON, JSON.stringify(resultsPayload, null, 2), "utf8");
   fs.writeFileSync(OUTPUT_HARDWARE_JSON, JSON.stringify(hardware, null, 2), "utf8");

   // Generate Markdown Report
   let md = `# In-Memory Scoring Micro-Benchmark & Hardware Profile\n\n`;
   md += `**Protocol:** Isolated CPU microbenchmark evaluating 10,000 pairwise comparisons with zero disk/network I/O after 1,000 JIT warm-up cycles. Measured using \`process.hrtime.bigint()\`.  \n\n`;

   md += `## 1. Latency & Throughput Benchmark\n\n`;
   md += `| Preset | Duplicate Threshold | Related Threshold | Mean Latency | Median (p50) | p90 | p95 | p99 | Throughput |\n`;
   md += `|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n`;
   md += `| **Evaluation Preset (\`HISC-eval\`)** | ${HISC_EVAL_PRESET.duplicateThreshold.toFixed(2)} | ${HISC_EVAL_PRESET.relatedThreshold.toFixed(2)} | **${evalStats.mean_microseconds.toFixed(1)} μs** (${evalStats.mean_milliseconds.toFixed(3)} ms) | **${evalStats.p50_median_microseconds.toFixed(1)} μs** | ${evalStats.p90_microseconds.toFixed(1)} μs | ${evalStats.p95_microseconds.toFixed(1)} μs | ${evalStats.p99_microseconds.toFixed(1)} μs | **${evalStats.throughput_pairs_per_sec.toLocaleString()} pairs/s** |\n`;
   md += `| **Deployed Preset (\`DEFAULT_HISC_CONFIG\`)** | ${DEFAULT_HISC_CONFIG.duplicateThreshold.toFixed(2)} | ${DEFAULT_HISC_CONFIG.relatedThreshold.toFixed(2)} | **${deployedStats.mean_microseconds.toFixed(1)} μs** (${deployedStats.mean_milliseconds.toFixed(3)} ms) | **${deployedStats.p50_median_microseconds.toFixed(1)} μs** | ${deployedStats.p90_microseconds.toFixed(1)} μs | ${deployedStats.p95_microseconds.toFixed(1)} μs | ${deployedStats.p99_microseconds.toFixed(1)} μs | **${deployedStats.throughput_pairs_per_sec.toLocaleString()} pairs/s** |\n\n`;

   md += `## 2. Hardware Environment\n\n`;
   md += `- **Processor (CPU):** ${hardware.cpu.model} (${hardware.cpu.cores_physical} physical cores / ${hardware.cpu.cores_logical} logical threads @ ${hardware.cpu.speed_mhz} MHz)\n`;
   md += `- **Memory (RAM):** ${hardware.memory.total_gb} GB total (${hardware.memory.free_gb} GB free)\n`;
   md += `- **Operating System:** ${hardware.os.type} (${hardware.os.platform} ${hardware.os.release} ${hardware.os.arch})\n`;
   md += `- **Node.js Runtime:** Node ${hardware.runtime.node_version} (V8 ${hardware.runtime.v8_version})\n`;
   md += `- **Database Engine:** MongoDB ${hardware.database.mongodb_version} (Mongoose driver ${hardware.database.mongoose_version})\n`;

   fs.writeFileSync(OUTPUT_MD, md, "utf8");

   console.log(`[Phase 5] Benchmark complete!`);
   console.log(`  - Results JSON: ${OUTPUT_JSON}`);
   console.log(`  - Results Markdown: ${OUTPUT_MD}`);
   console.log(`  - Hardware JSON: ${OUTPUT_HARDWARE_JSON}`);

   return resultsPayload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   runScoringMicrobenchmark();
}
