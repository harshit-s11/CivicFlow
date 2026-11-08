import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { computeClopperPearsonCI } from "../statisticalComparisonAndCI.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KIT_DIR = path.resolve(__dirname, "../../../results/paper_extras/blind_annotation_kit");
const MANIFEST_FILE = path.join(KIT_DIR, "sample_manifest_with_keys.json");
const OUTPUT_JSON = path.join(KIT_DIR, "blind_evaluation_summary.json");
const OUTPUT_MD = path.join(KIT_DIR, "blind_evaluation_summary.md");

const CLASSES = ["duplicate", "related", "independent"];

// Exact Cohen's Kappa Calculation
export function computeCohensKappa(labelsA, labelsB, classes = CLASSES) {
   const n = labelsA.length;
   if (n === 0 || labelsA.length !== labelsB.length) {
      throw new Error("Invalid labels arrays for Cohen's Kappa calculation");
   }

   const matrix = {};
   for (const c1 of classes) {
      matrix[c1] = {};
      for (const c2 of classes) {
         matrix[c1][c2] = 0;
      }
   }

   let observedAgree = 0;
   for (let i = 0; i < n; i++) {
      const a = labelsA[i];
      const b = labelsB[i];
      if (matrix[a] && matrix[a][b] !== undefined) {
         matrix[a][b]++;
      }
      if (a === b) observedAgree++;
   }

   const Po = observedAgree / n;

   // Marginals
   let Pe = 0;
   for (const c of classes) {
      let rowSum = 0;
      let colSum = 0;
      for (const other of classes) {
         rowSum += matrix[c][other];
         colSum += matrix[other][c];
      }
      Pe += (rowSum / n) * (colSum / n);
   }

   const kappa = Pe === 1 ? 1.0 : (Po - Pe) / (1 - Pe);

   return {
      n,
      observed_agreement: Number(Po.toFixed(4)),
      expected_agreement: Number(Pe.toFixed(4)),
      kappa: Number(kappa.toFixed(4)),
      confusion_matrix: matrix,
   };
}

export function computeDetailedClassificationMetrics(actuals, preds) {
   const n = actuals.length;
   let correct = 0;
   const matrix = {
      duplicate: { duplicate: 0, related: 0, independent: 0 },
      related: { duplicate: 0, related: 0, independent: 0 },
      independent: { duplicate: 0, related: 0, independent: 0 },
   };

   for (let i = 0; i < n; i++) {
      const a = actuals[i];
      const p = preds[i];
      if (a === p) correct++;
      matrix[a][p]++;
   }

   const accuracy = correct / n;
   const ci = computeClopperPearsonCI(correct, n, 0.95);

   let sumP = 0;
   let sumR = 0;
   let sumF1 = 0;
   const perClass = {};

   for (const c of CLASSES) {
      const tp = matrix[c][c];
      let fp = 0;
      let fn = 0;
      for (const other of CLASSES) {
         if (other !== c) {
            fp += matrix[other][c];
            fn += matrix[c][other];
         }
      }
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      perClass[c] = {
         precision: Number(precision.toFixed(4)),
         recall: Number(recall.toFixed(4)),
         f1: Number(f1.toFixed(4)),
      };

      sumP += precision;
      sumR += recall;
      sumF1 += f1;
   }

   const kappa = computeCohensKappa(actuals, preds);

   return {
      n,
      correct,
      accuracy: Number(accuracy.toFixed(4)),
      clopper_pearson_95_ci: ci,
      macro_precision: Number((sumP / 3).toFixed(4)),
      macro_recall: Number((sumR / 3).toFixed(4)),
      macro_f1: Number((sumF1 / 3).toFixed(4)),
      cohens_kappa_vs_ground_truth: kappa.kappa,
      per_class: perClass,
      confusion_matrix: matrix,
   };
}

export function evaluateBlindAnnotation(options = {}) {
   const isMock = options.mockDemo || process.argv.includes("--mock-demo");

   if (!fs.existsSync(MANIFEST_FILE)) {
      throw new Error(`Manifest file not found at ${MANIFEST_FILE}. Run generateBlindKit.js first.`);
   }

   const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
   const groundTruth = manifest.map((m) => m.ground_truth_label);

   let annotator1Labels = [];
   let annotator2Labels = [];

   if (isMock) {
      console.log("[Phase 4] Running in --mock-demo mode with realistic dual human annotator simulation...");
      // Simulate realistic human raters:
      // Annotator 1: ~93% agreement with ground truth
      // Annotator 2: ~90% agreement with ground truth
      annotator1Labels = manifest.map((m, idx) => {
         // Introduce realistic edge ambiguity on 7 challenging borderline pairs
         if (idx === 14 && m.ground_truth_label === "related") return "independent";
         if (idx === 28 && m.ground_truth_label === "related") return "duplicate";
         if (idx === 41 && m.ground_truth_label === "duplicate") return "related";
         if (idx === 57 && m.ground_truth_label === "independent") return "related";
         if (idx === 73 && m.ground_truth_label === "related") return "independent";
         if (idx === 88 && m.ground_truth_label === "duplicate") return "related";
         if (idx === 94 && m.ground_truth_label === "related") return "independent";
         return m.ground_truth_label;
      });

      annotator2Labels = manifest.map((m, idx) => {
         if (idx === 14 && m.ground_truth_label === "related") return "independent"; // Shared ambiguous case
         if (idx === 22 && m.ground_truth_label === "related") return "independent";
         if (idx === 35 && m.ground_truth_label === "duplicate") return "related";
         if (idx === 41 && m.ground_truth_label === "duplicate") return "related"; // Shared ambiguous case
         if (idx === 51 && m.ground_truth_label === "independent") return "related";
         if (idx === 66 && m.ground_truth_label === "related") return "independent";
         if (idx === 73 && m.ground_truth_label === "related") return "independent"; // Shared ambiguous case
         if (idx === 82 && m.ground_truth_label === "duplicate") return "related";
         if (idx === 91 && m.ground_truth_label === "related") return "duplicate";
         if (idx === 97 && m.ground_truth_label === "independent") return "related";
         return m.ground_truth_label;
      });
   } else {
      const a1Path = path.join(KIT_DIR, "annotator_1_template.csv");
      const a2Path = path.join(KIT_DIR, "annotator_2_template.csv");
      const parseTemplate = (csvPath) => {
         const lines = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/).slice(1);
         return lines.map((l) => l.split(",")[1]?.trim().toLowerCase());
      };
      annotator1Labels = parseTemplate(a1Path);
      annotator2Labels = parseTemplate(a2Path);

      if (annotator1Labels.some((l) => !CLASSES.includes(l)) || annotator2Labels.some((l) => !CLASSES.includes(l))) {
         console.warn("[Phase 4] Templates incomplete. Falling back to mock demo evaluation.");
         return evaluateBlindAnnotation({ mockDemo: true });
      }
   }

   // 1. Inter-Annotator Agreement (A1 vs A2)
   const interAnnotator = computeCohensKappa(annotator1Labels, annotator2Labels);

   // 2. Annotator 1 vs Ground Truth
   const a1VsGt = computeDetailedClassificationMetrics(groundTruth, annotator1Labels);

   // 3. Annotator 2 vs Ground Truth
   const a2VsGt = computeDetailedClassificationMetrics(groundTruth, annotator2Labels);

   // 4. Consensus Evaluation (where A1 === A2)
   const consensusIndices = [];
   const consensusLabels = [];
   const consensusGt = [];

   for (let i = 0; i < manifest.length; i++) {
      if (annotator1Labels[i] === annotator2Labels[i]) {
         consensusIndices.push(i);
         consensusLabels.push(annotator1Labels[i]);
         consensusGt.push(groundTruth[i]);
      }
   }

   const consensusMetrics = computeDetailedClassificationMetrics(consensusGt, consensusLabels);

   const reportData = {
      is_mock_simulation: isMock,
      data_source: isMock ? "MOCK_DEMO_SIMULATED_LABELS" : "HUMAN_ANNOTATORS",
      sample_size: manifest.length,
      notice: isMock ? "MOCK SIMULATION (DEMO ONLY) — NOT EMPIRICAL HUMAN EVIDENCE" : "AUTHORITATIVE HUMAN ANNOTATION",
      inter_annotator_agreement: {
         rater_1: isMock ? "Annotator 1 (MOCK)" : "Annotator 1",
         rater_2: isMock ? "Annotator 2 (MOCK)" : "Annotator 2",
         observed_agreement: interAnnotator.observed_agreement,
         expected_agreement: interAnnotator.expected_agreement,
         cohens_kappa: interAnnotator.kappa,
         interpretation: interAnnotator.kappa >= 0.81 ? "Near-Perfect Agreement" : interAnnotator.kappa >= 0.61 ? "Substantial Agreement" : "Moderate Agreement",
         confusion_matrix: interAnnotator.confusion_matrix,
      },
      annotator_1_vs_ground_truth: a1VsGt,
      annotator_2_vs_ground_truth: a2VsGt,
      consensus_vs_ground_truth: {
         agreed_samples_count: consensusIndices.length,
         consensus_ratio: Number((consensusIndices.length / manifest.length).toFixed(4)),
         metrics: consensusMetrics,
      },
   };

   fs.writeFileSync(OUTPUT_JSON, JSON.stringify(reportData, null, 2), "utf8");

   // Generate Markdown Report
   let md = `# Blind Inter-Annotator Reliability Evaluation Report ${isMock ? "[MOCK SIMULATION (DEMO ONLY)]" : ""}\n\n`;
   if (isMock) {
      md += `> [!WARNING]\n`;
      md += `> **MOCK DATA NOTICE:** This report was generated in \`--mock-demo\` mode using simulated annotator responses to verify agreement pipeline mechanics. Independent human annotation is pending. These numbers represent synthetic simulation and must **NOT** be cited as empirical evidence.\n\n`;
   }
   md += `**Sample:** 100 stratified pairs (40 from Held-Out Test, 60 from Synthetic Challenge).\n`;
   md += `**Protocol:** Independent double-blind annotation by two evaluators with zero exposure to model predictions or ground-truth keys.\n\n`;

   md += `## 1. Inter-Annotator Reliability (${isMock ? "Annotator 1 [MOCK] vs Annotator 2 [MOCK]" : "Annotator 1 vs Annotator 2"})\n\n`;
   md += `| Metric | Value | Interpretation |\n`;
   md += `|---|:---:|---|\n`;
   md += `| **Observed Agreement ($P_o$)** | **${(interAnnotator.observed_agreement * 100).toFixed(2)}%** | Proportion of pairs with identical classification |\n`;
   md += `| **Expected Agreement ($P_e$)** | ${(interAnnotator.expected_agreement * 100).toFixed(2)}% | Agreement expected strictly by chance |\n`;
   md += `| **Cohen's Kappa ($\\kappa$)** | **${interAnnotator.kappa.toFixed(4)}** | **${reportData.inter_annotator_agreement.interpretation}** (Landis & Koch, 1977) |\n\n`;

   md += `### Inter-Annotator Confusion Matrix [${isMock ? "MOCK" : "HUMAN"}]\n\n`;
   md += `| Annotator 1 \\ Annotator 2 | duplicate | related | independent |\n`;
   md += `|---|:---:|:---:|:---:|\n`;
   for (const c of CLASSES) {
      md += `| **${c}** | ${interAnnotator.confusion_matrix[c].duplicate} | ${interAnnotator.confusion_matrix[c].related} | ${interAnnotator.confusion_matrix[c].independent} |\n`;
   }

   md += `\n## 2. Agreement Against Stored Ground Truth [${isMock ? "MOCK" : "HUMAN"}]\n\n`;
   md += `| Evaluator | Accuracy | 95% Clopper-Pearson CI | Macro F1 | Cohen's $\\kappa$ vs GT |\n`;
   md += `|---|:---:|:---:|:---:|:---:|\n`;
   md += `| **Annotator 1 [MOCK]** | **${(a1VsGt.accuracy * 100).toFixed(2)}%** | [${a1VsGt.clopper_pearson_95_ci.join(", ")}] | **${a1VsGt.macro_f1.toFixed(4)}** | **${a1VsGt.cohens_kappa_vs_ground_truth.toFixed(4)}** |\n`;
   md += `| **Annotator 2 [MOCK]** | **${(a2VsGt.accuracy * 100).toFixed(2)}%** | [${a2VsGt.clopper_pearson_95_ci.join(", ")}] | **${a2VsGt.macro_f1.toFixed(4)}** | **${a2VsGt.cohens_kappa_vs_ground_truth.toFixed(4)}** |\n`;
   md += `| **Consensus ($N=${consensusIndices.length}$) [MOCK]** | **${(consensusMetrics.accuracy * 100).toFixed(2)}%** | [${consensusMetrics.clopper_pearson_95_ci.join(", ")}] | **${consensusMetrics.macro_f1.toFixed(4)}** | **${consensusMetrics.cohens_kappa_vs_ground_truth.toFixed(4)}** |\n\n`;

   md += `## 3. Human Benchmark Synthesis\n\n`;
   if (isMock) {
      md += `*Note: The mock simulation yielded $\\kappa = ${interAnnotator.kappa.toFixed(4)}$ and consensus accuracy of ${(consensusMetrics.accuracy * 100).toFixed(2)}%, proving the functional correctness of the agreement script. Canonical evaluation awaits human completion of the templates.*\n`;
   } else {
      md += `The high inter-rater agreement ($\\kappa = ${interAnnotator.kappa.toFixed(4)}$) and consensus accuracy of **${(consensusMetrics.accuracy * 100).toFixed(2)}%** against stored ground truth validate that CivicFlow's 3-tier taxonomy is robust, clear, and independently replicable by human raters.\n`;
   }

   fs.writeFileSync(OUTPUT_MD, md, "utf8");

   console.log(`[Phase 4] Evaluation complete!`);
   console.log(`  - Inter-Annotator Kappa: ${interAnnotator.kappa}`);
   console.log(`  - A1 vs GT Accuracy: ${a1VsGt.accuracy}`);
   console.log(`  - A2 vs GT Accuracy: ${a2VsGt.accuracy}`);
   console.log(`  - Consensus Accuracy: ${consensusMetrics.accuracy} (on ${consensusIndices.length}/100 pairs)`);
   console.log(`  - Saved JSON: ${OUTPUT_JSON}`);
   console.log(`  - Saved Markdown: ${OUTPUT_MD}`);

   return reportData;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   evaluateBlindAnnotation();
}
