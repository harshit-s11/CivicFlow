import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
   computeExactMcNemar,
   computeClopperPearsonCI,
} from "../statisticalComparisonAndCI.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURES_JSON = path.resolve(__dirname, "../../../results/paper_extras/features_550_pairs.json");
const OUTPUT_DIR = path.resolve(__dirname, "../../../results/paper_extras");

const OUTPUT_JSON = path.join(OUTPUT_DIR, "learned_baselines_summary.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "learned_baselines_summary.md");
const OUTPUT_PREDICTIONS_CSV = path.join(OUTPUT_DIR, "learned_baselines_predictions.csv");

const CLASSES = ["duplicate", "related", "independent"];
const CLASS_TO_IDX = { duplicate: 0, related: 1, independent: 2 };
const IDX_TO_CLASS = ["duplicate", "related", "independent"];

const ALL_RULES = [
   "rule_1_distant_boundary",
   "rule_2_temporal_boundary",
   "rule_3_operational_radius",
   "rule_4_incompatible_categories",
   "rule_5_duplicate",
   "rule_5_opposing_direction",
   "rule_5_downgraded_related",
   "rule_opposing_direction_related",
   "threshold",
];

// Feature vector definitions
export function extractVectorA(row) {
   return [
      row.score_C,
      row.score_G,
      row.score_L,
      row.score_S,
      row.score_T,
   ];
}

export function extractVectorB(row) {
   const oneHotRule = ALL_RULES.map((r) => (row.rule_fired === r ? 1 : 0));
   return [
      row.score_C,
      row.score_G,
      row.score_L,
      row.score_S,
      row.score_T,
      row.distance_meters,
      row.hours_delta,
      row.category_similarity,
      row.flag_causal_concept,
      row.flag_opposing_direction,
      row.hisc_score,
      ...oneHotRule,
   ];
}

// Standardization helper
export function computeStandardizer(X) {
   const d = X[0].length;
   const means = new Array(d).fill(0);
   const stds = new Array(d).fill(0);
   const n = X.length;

   for (const x of X) {
      for (let j = 0; j < d; j++) {
         means[j] += x[j];
      }
   }
   for (let j = 0; j < d; j++) {
      means[j] /= n;
   }

   for (const x of X) {
      for (let j = 0; j < d; j++) {
         stds[j] += (x[j] - means[j]) ** 2;
      }
   }
   for (let j = 0; j < d; j++) {
      stds[j] = Math.sqrt(stds[j] / (n - 1)) || 1.0;
   }

   return {
      means,
      stds,
      transform: (vec) => vec.map((val, j) => (val - means[j]) / stds[j]),
   };
}

// -------------------------------------------------------------
// Model 1: Multinomial Logistic Regression (Softmax Regression)
// -------------------------------------------------------------
export class MultinomialLogisticRegression {
   constructor(options = {}) {
      this.l2 = options.l2 ?? 0.01;
      this.lr = options.lr ?? 0.05;
      this.maxIter = options.maxIter ?? 400;
      this.weights = null; // 3 x d
      this.biases = null;  // 3
   }

   fit(X, y) {
      const n = X.length;
      const d = X[0].length;
      const numClasses = 3;

      this.weights = Array.from({ length: numClasses }, () => new Array(d).fill(0));
      this.biases = new Array(numClasses).fill(0);

      for (let iter = 0; iter < this.maxIter; iter++) {
         const gradW = Array.from({ length: numClasses }, () => new Array(d).fill(0));
         const gradB = new Array(numClasses).fill(0);

         for (let i = 0; i < n; i++) {
            const x = X[i];
            const yi = y[i];

            // compute logits
            const logits = [0, 1, 2].map((c) => {
               let s = this.biases[c];
               for (let j = 0; j < d; j++) s += this.weights[c][j] * x[j];
               return s;
            });

            // softmax
            const maxLogit = Math.max(...logits);
            const expSum = logits.reduce((acc, l) => acc + Math.exp(l - maxLogit), 0);
            const probs = logits.map((l) => Math.exp(l - maxLogit) / expSum);

            for (let c = 0; c < numClasses; c++) {
               const err = probs[c] - (yi === c ? 1 : 0);
               gradB[c] += err;
               for (let j = 0; j < d; j++) {
                  gradW[c][j] += err * x[j];
               }
            }
         }

         // update with L2 regularization
         for (let c = 0; c < numClasses; c++) {
            this.biases[c] -= (this.lr * gradB[c]) / n;
            for (let j = 0; j < d; j++) {
               const reg = this.l2 * this.weights[c][j];
               this.weights[c][j] -= this.lr * (gradW[c][j] / n + reg);
            }
         }
      }
   }

   predictProbs(x) {
      const numClasses = 3;
      const d = x.length;
      const logits = [0, 1, 2].map((c) => {
         let s = this.biases[c];
         for (let j = 0; j < d; j++) s += this.weights[c][j] * x[j];
         return s;
      });
      const maxLogit = Math.max(...logits);
      const expSum = logits.reduce((acc, l) => acc + Math.exp(l - maxLogit), 0);
      return logits.map((l) => Math.exp(l - maxLogit) / expSum);
   }

   predict(x) {
      const probs = this.predictProbs(x);
      let bestC = 0;
      let bestP = probs[0];
      for (let c = 1; c < 3; c++) {
         if (probs[c] > bestP) {
            bestP = probs[c];
            bestC = c;
         }
      }
      return bestC;
   }
}

// -------------------------------------------------------------
// Model 2: Multi-Class Decision Tree (CART, depth <= 4)
// -------------------------------------------------------------
function giniImpurity(counts, total) {
   if (total === 0) return 0;
   let sumSquares = 0;
   for (let i = 0; i < counts.length; i++) {
      const p = counts[i] / total;
      sumSquares += p * p;
   }
   return 1 - sumSquares;
}

export class DecisionTree {
   constructor(options = {}) {
      this.maxDepth = options.maxDepth ?? 4;
      this.minSamplesSplit = options.minSamplesSplit ?? 5;
      this.root = null;
   }

   fit(X, y) {
      const indices = Array.from({ length: X.length }, (_, i) => i);
      this.root = this._buildTree(X, y, indices, 0);
   }

   _buildTree(X, y, indices, depth) {
      const counts = [0, 0, 0];
      for (const i of indices) counts[y[i]]++;
      const majorityClass = counts.indexOf(Math.max(...counts));

      if (
         depth >= this.maxDepth ||
         indices.length < this.minSamplesSplit ||
         counts.filter((c) => c > 0).length <= 1
      ) {
         return { isLeaf: true, classIdx: majorityClass, counts };
      }

      const total = indices.length;
      const currentGini = giniImpurity(counts, total);
      const d = X[0].length;

      let bestGain = 0;
      let bestFeature = -1;
      let bestThreshold = null;
      let bestLeft = null;
      let bestRight = null;

      for (let feat = 0; feat < d; feat++) {
         // Sort distinct values
         const vals = Array.from(new Set(indices.map((i) => X[i][feat]))).sort((a, b) => a - b);
         if (vals.length <= 1) continue;

         for (let v = 0; v < vals.length - 1; v++) {
            const thresh = (vals[v] + vals[v + 1]) / 2;
            const left = [];
            const right = [];

            for (const i of indices) {
               if (X[i][feat] <= thresh) left.push(i);
               else right.push(i);
            }

            if (left.length === 0 || right.length === 0) continue;

            const leftCounts = [0, 0, 0];
            for (const i of left) leftCounts[y[i]]++;
            const rightCounts = [0, 0, 0];
            for (const i of right) rightCounts[y[i]]++;

            const leftGini = giniImpurity(leftCounts, left.length);
            const rightGini = giniImpurity(rightCounts, right.length);
            const splitGini = (left.length / total) * leftGini + (right.length / total) * rightGini;
            const gain = currentGini - splitGini;

            if (gain > bestGain) {
               bestGain = gain;
               bestFeature = feat;
               bestThreshold = thresh;
               bestLeft = left;
               bestRight = right;
            }
         }
      }

      if (bestGain <= 1e-7 || !bestLeft || !bestRight) {
         return { isLeaf: true, classIdx: majorityClass, counts };
      }

      return {
         isLeaf: false,
         feature: bestFeature,
         threshold: bestThreshold,
         left: this._buildTree(X, y, bestLeft, depth + 1),
         right: this._buildTree(X, y, bestRight, depth + 1),
         majorityClass,
      };
   }

   predict(x) {
      let node = this.root;
      while (!node.isLeaf) {
         if (x[node.feature] <= node.threshold) {
            node = node.left;
         } else {
            node = node.right;
         }
      }
      return node.classIdx;
   }
}

// -------------------------------------------------------------
// Model 3: Gradient Boosted Decision Trees (GBDT)
// -------------------------------------------------------------
class RegressionTree {
   constructor(maxDepth = 3, minSamplesSplit = 5) {
      this.maxDepth = maxDepth;
      this.minSamplesSplit = minSamplesSplit;
      this.root = null;
   }

   fit(X, residuals) {
      const indices = Array.from({ length: X.length }, (_, i) => i);
      this.root = this._build(X, residuals, indices, 0);
   }

   _build(X, residuals, indices, depth) {
      let sum = 0;
      for (const i of indices) sum += residuals[i];
      const mean = sum / (indices.length || 1);

      if (depth >= this.maxDepth || indices.length < this.minSamplesSplit) {
         return { isLeaf: true, value: mean };
      }

      const d = X[0].length;
      let bestVarianceReduction = 0;
      let bestFeature = -1;
      let bestThreshold = null;
      let bestLeft = null;
      let bestRight = null;

      let totalVariance = 0;
      for (const i of indices) totalVariance += (residuals[i] - mean) ** 2;

      for (let feat = 0; feat < d; feat++) {
         const vals = Array.from(new Set(indices.map((i) => X[i][feat]))).sort((a, b) => a - b);
         if (vals.length <= 1) continue;

         for (let v = 0; v < vals.length - 1; v++) {
            const thresh = (vals[v] + vals[v + 1]) / 2;
            const left = [];
            const right = [];
            let sumL = 0;
            let sumR = 0;

            for (const i of indices) {
               if (X[i][feat] <= thresh) {
                  left.push(i);
                  sumL += residuals[i];
               } else {
                  right.push(i);
                  sumR += residuals[i];
               }
            }

            if (left.length === 0 || right.length === 0) continue;

            const meanL = sumL / left.length;
            const meanR = sumR / right.length;
            let varL = 0;
            let varR = 0;
            for (const i of left) varL += (residuals[i] - meanL) ** 2;
            for (const i of right) varR += (residuals[i] - meanR) ** 2;

            const varianceReduction = totalVariance - (varL + varR);
            if (varianceReduction > bestVarianceReduction) {
               bestVarianceReduction = varianceReduction;
               bestFeature = feat;
               bestThreshold = thresh;
               bestLeft = left;
               bestRight = right;
            }
         }
      }

      if (bestVarianceReduction <= 1e-7 || !bestLeft || !bestRight) {
         return { isLeaf: true, value: mean };
      }

      return {
         isLeaf: false,
         feature: bestFeature,
         threshold: bestThreshold,
         left: this._build(X, residuals, bestLeft, depth + 1),
         right: this._build(X, residuals, bestRight, depth + 1),
      };
   }

   predict(x) {
      let node = this.root;
      while (!node.isLeaf) {
         if (x[node.feature] <= node.threshold) {
            node = node.left;
         } else {
            node = node.right;
         }
      }
      return node.value;
   }
}

export class GradientBoostingClassifier {
   constructor(options = {}) {
      this.nEstimators = options.nEstimators ?? 30;
      this.lr = options.lr ?? 0.1;
      this.maxDepth = options.maxDepth ?? 3;
      this.minSamplesSplit = options.minSamplesSplit ?? 5;
      this.trees = []; // [round][class]
      this.initialLogits = [0, 0, 0];
   }

   fit(X, y) {
      const n = X.length;
      const numClasses = 3;

      // Initialize logits F_c(x) = 0
      const F = Array.from({ length: n }, () => [0, 0, 0]);
      this.trees = [];

      for (let round = 0; round < this.nEstimators; round++) {
         const roundTrees = [];

         // Compute current probabilities via softmax
         const probs = F.map((logits) => {
            const maxL = Math.max(...logits);
            const sumExp = logits.reduce((s, l) => s + Math.exp(l - maxL), 0);
            return logits.map((l) => Math.exp(l - maxL) / sumExp);
         });

         for (let c = 0; c < numClasses; c++) {
            // Negative gradient: r_ic = y_ic - p_ic
            const residuals = new Array(n);
            for (let i = 0; i < n; i++) {
               const yic = y[i] === c ? 1 : 0;
               residuals[i] = yic - probs[i][c];
            }

            const tree = new RegressionTree(this.maxDepth, this.minSamplesSplit);
            tree.fit(X, residuals);
            roundTrees.push(tree);

            // Update F
            for (let i = 0; i < n; i++) {
               F[i][c] += this.lr * tree.predict(X[i]);
            }
         }

         this.trees.push(roundTrees);
      }
   }

   predict(x) {
      const F = [0, 0, 0];
      for (const roundTrees of this.trees) {
         for (let c = 0; c < 3; c++) {
            F[c] += this.lr * roundTrees[c].predict(x);
         }
      }
      return F.indexOf(Math.max(...F));
   }
}

// -------------------------------------------------------------
// Metrics & Statistical Calculations
// -------------------------------------------------------------
function computeMetrics(actuals, preds) {
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

   const perClass = {};
   let sumP = 0;
   let sumR = 0;
   let sumF1 = 0;

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
         support: tp + fn,
         true_positives: tp,
         false_positives: fp,
         false_negatives: fn,
         precision: Number(precision.toFixed(4)),
         recall: Number(recall.toFixed(4)),
         f1: Number(f1.toFixed(4)),
      };

      sumP += precision;
      sumR += recall;
      sumF1 += f1;
   }

   const macroP = sumP / 3;
   const macroR = sumR / 3;
   const macroF1 = sumF1 / 3;

   return {
      sample_size: n,
      correct,
      accuracy: Number(accuracy.toFixed(4)),
      clopper_pearson_95_ci: ci,
      macro_precision: Number(macroP.toFixed(4)),
      macro_recall: Number(macroR.toFixed(4)),
      macro_f1: Number(macroF1.toFixed(4)),
      per_class: perClass,
      confusion_matrix: matrix,
   };
}

// -------------------------------------------------------------
// Cross Validation & Training Pipeline
// -------------------------------------------------------------
export function runLearnedBaselines() {
   const allData = JSON.parse(fs.readFileSync(FEATURES_JSON, "utf8"));

   const trainData = allData.filter((d) => d.split === "train");
   const testData = allData.filter((d) => d.split === "test");
   const challengeData = allData.filter((d) => d.split === "challenge");

   console.log(`[Phase 2] Loaded feature rows: Train=${trainData.length}, Test=${testData.length}, Challenge=${challengeData.length}`);

   // Build 5 stratified folds based on incident_id / group_id
   // In trainData, each pair has group_id. We stratify by class to ensure 16 dup, 16 rel, 16 ind per fold.
   const folds = Array.from({ length: 5 }, () => []);
   for (const c of CLASSES) {
      const classPairs = trainData.filter((d) => d.ground_truth_label === c);
      classPairs.forEach((pair, idx) => {
         folds[idx % 5].push(pair);
      });
   }

   // Model configurations to train
   // 3 models x 2 conditions = 6 conditions
   const conditions = [
      {
         key: "logistic_regression_5features",
         modelName: "Multinomial Logistic Regression",
         featureSet: "(a) Five component scores only",
         featureExtractor: extractVectorA,
         useScaler: true,
         hyperGrid: [{ l2: 0.001 }, { l2: 0.01 }, { l2: 0.1 }, { l2: 1.0 }, { l2: 10.0 }],
         createModel: (params) => new MultinomialLogisticRegression({ ...params, lr: 0.08, maxIter: 500 }),
      },
      {
         key: "logistic_regression_stacked",
         modelName: "Multinomial Logistic Regression",
         featureSet: "(b) Stacked on HISC outputs",
         featureExtractor: extractVectorB,
         useScaler: true,
         hyperGrid: [{ l2: 0.001 }, { l2: 0.01 }, { l2: 0.1 }, { l2: 1.0 }, { l2: 10.0 }],
         createModel: (params) => new MultinomialLogisticRegression({ ...params, lr: 0.08, maxIter: 500 }),
      },
      {
         key: "decision_tree_depth4_5features",
         modelName: "Depth-4 Decision Tree",
         featureSet: "(a) Five component scores only",
         featureExtractor: extractVectorA,
         useScaler: false,
         hyperGrid: [{ minSamplesSplit: 2 }, { minSamplesSplit: 5 }, { minSamplesSplit: 10 }],
         createModel: (params) => new DecisionTree({ ...params, maxDepth: 4 }),
      },
      {
         key: "decision_tree_depth4_stacked",
         modelName: "Depth-4 Decision Tree",
         featureSet: "(b) Stacked on HISC outputs",
         featureExtractor: extractVectorB,
         useScaler: false,
         hyperGrid: [{ minSamplesSplit: 2 }, { minSamplesSplit: 5 }, { minSamplesSplit: 10 }],
         createModel: (params) => new DecisionTree({ ...params, maxDepth: 4 }),
      },
      {
         key: "gbdt_5features",
         modelName: "Gradient Boosted Decision Trees",
         featureSet: "(a) Five component scores only",
         featureExtractor: extractVectorA,
         useScaler: false,
         hyperGrid: [
            { lr: 0.05, maxDepth: 2, nEstimators: 25 },
            { lr: 0.1, maxDepth: 2, nEstimators: 25 },
            { lr: 0.05, maxDepth: 3, nEstimators: 30 },
            { lr: 0.1, maxDepth: 3, nEstimators: 30 },
         ],
         createModel: (params) => new GradientBoostingClassifier(params),
      },
      {
         key: "gbdt_stacked",
         modelName: "Gradient Boosted Decision Trees",
         featureSet: "(b) Stacked on HISC outputs",
         featureExtractor: extractVectorB,
         useScaler: false,
         hyperGrid: [
            { lr: 0.05, maxDepth: 2, nEstimators: 25 },
            { lr: 0.1, maxDepth: 2, nEstimators: 25 },
            { lr: 0.05, maxDepth: 3, nEstimators: 30 },
            { lr: 0.1, maxDepth: 3, nEstimators: 30 },
         ],
         createModel: (params) => new GradientBoostingClassifier(params),
      },
   ];

   const results = {};
   const predictionsByModel = {
      test: {},
      challenge: {},
   };

   // Record HISC predictions on Test and Challenge for comparison
   const hiscTestPreds = testData.map((d) => d.hisc_predicted);
   const hiscChallengePreds = challengeData.map((d) => d.hisc_predicted);
   const testActuals = testData.map((d) => d.ground_truth_label);
   const challengeActuals = challengeData.map((d) => d.ground_truth_label);

   const hiscTestMetrics = computeMetrics(testActuals, hiscTestPreds);
   const hiscChallengeMetrics = computeMetrics(challengeActuals, hiscChallengePreds);

   console.log(`[Phase 2] HISC Evaluation Preset Test Accuracy: ${hiscTestMetrics.accuracy} (F1: ${hiscTestMetrics.macro_f1})`);
   console.log(`[Phase 2] HISC Evaluation Preset Challenge Accuracy: ${hiscChallengeMetrics.accuracy} (F1: ${hiscChallengeMetrics.macro_f1})`);

   for (const config of conditions) {
      console.log(`\n[Phase 2] Tuning ${config.modelName} [${config.featureSet}]...`);

      // 5-fold cross validation grid search
      let bestMacroF1 = -1;
      let bestHyper = null;

      for (const hyper of config.hyperGrid) {
         const oofPreds = [];
         const oofActuals = [];

         for (let f = 0; f < 5; f++) {
            const valFold = folds[f];
            const trainFolds = folds.filter((_, idx) => idx !== f).flat();

            let trainX = trainFolds.map(config.featureExtractor);
            const trainY = trainFolds.map((d) => CLASS_TO_IDX[d.ground_truth_label]);
            let valX = valFold.map(config.featureExtractor);
            const valY = valFold.map((d) => d.ground_truth_label);

            let scaler = null;
            if (config.useScaler) {
               scaler = computeStandardizer(trainX);
               trainX = trainX.map(scaler.transform);
               valX = valX.map(scaler.transform);
            }

            const model = config.createModel(hyper);
            model.fit(trainX, trainY);

            const foldPreds = valX.map((x) => IDX_TO_CLASS[model.predict(x)]);
            oofPreds.push(...foldPreds);
            oofActuals.push(...valY);
         }

         const cvMetrics = computeMetrics(oofActuals, oofPreds);
         if (cvMetrics.macro_f1 > bestMacroF1) {
            bestMacroF1 = cvMetrics.macro_f1;
            bestHyper = hyper;
         }
      }

      console.log(`  -> Best Hyperparameters: ${JSON.stringify(bestHyper)} (OOF Macro-F1: ${bestMacroF1.toFixed(4)})`);

      // Refit final model on full training split (240 samples)
      let fullTrainX = trainData.map(config.featureExtractor);
      const fullTrainY = trainData.map((d) => CLASS_TO_IDX[d.ground_truth_label]);

      let scaler = null;
      if (config.useScaler) {
         scaler = computeStandardizer(fullTrainX);
         fullTrainX = fullTrainX.map(scaler.transform);
      }

      const finalModel = config.createModel(bestHyper);
      finalModel.fit(fullTrainX, fullTrainY);

      // Evaluate on Test
      let testX = testData.map(config.featureExtractor);
      if (scaler) testX = testX.map(scaler.transform);
      const testPreds = testX.map((x) => IDX_TO_CLASS[finalModel.predict(x)]);
      const testMetrics = computeMetrics(testActuals, testPreds);

      // Evaluate on Challenge
      let challengeX = challengeData.map(config.featureExtractor);
      if (scaler) challengeX = challengeX.map(scaler.transform);
      const challengePreds = challengeX.map((x) => IDX_TO_CLASS[finalModel.predict(x)]);
      const challengeMetrics = computeMetrics(challengeActuals, challengePreds);

      // Paired McNemar vs HISC on Test
      let bTest = 0; // HISC correct, Model incorrect
      let cTest = 0; // HISC incorrect, Model correct
      for (let i = 0; i < testActuals.length; i++) {
         const hiscOk = hiscTestPreds[i] === testActuals[i];
         const modelOk = testPreds[i] === testActuals[i];
         if (hiscOk && !modelOk) bTest++;
         if (!hiscOk && modelOk) cTest++;
      }
      const mcNemarTest = computeExactMcNemar(bTest, cTest);

      // Paired McNemar vs HISC on Challenge
      let bChal = 0;
      let cChal = 0;
      for (let i = 0; i < challengeActuals.length; i++) {
         const hiscOk = hiscChallengePreds[i] === challengeActuals[i];
         const modelOk = challengePreds[i] === challengeActuals[i];
         if (hiscOk && !modelOk) bChal++;
         if (!hiscOk && modelOk) cChal++;
      }
      const mcNemarChal = computeExactMcNemar(bChal, cChal);

      const bonferroniAlpha = Number((0.05 / 6).toFixed(6)); // 0.008333 for family of 6 models

      results[config.key] = {
         model_name: config.modelName,
         feature_set_label: config.featureSet,
         best_hyperparameters: bestHyper,
         tuning_oof_macro_f1: Number(bestMacroF1.toFixed(4)),
         test: {
            ...testMetrics,
            mcnemar_vs_hisc: {
               b_hisc_correct_model_wrong: bTest,
               c_hisc_wrong_model_correct: cTest,
               total_discordant: mcNemarTest.totalDiscordant,
               p_value_raw: mcNemarTest.pValue,
               bonferroni_threshold: bonferroniAlpha,
               statistically_significant: mcNemarTest.pValue < bonferroniAlpha,
            },
         },
         challenge: {
            ...challengeMetrics,
            mcnemar_vs_hisc: {
               b_hisc_correct_model_wrong: bChal,
               c_hisc_wrong_model_correct: cChal,
               total_discordant: mcNemarChal.totalDiscordant,
               p_value_raw: mcNemarChal.pValue,
               bonferroni_threshold: bonferroniAlpha,
               statistically_significant: mcNemarChal.pValue < bonferroniAlpha,
            },
         },
      };

      predictionsByModel.test[config.key] = testPreds;
      predictionsByModel.challenge[config.key] = challengePreds;

      console.log(`  -> Test Acc: ${testMetrics.accuracy} (F1: ${testMetrics.macro_f1}), McNemar b=${bTest}, c=${cTest}, p=${mcNemarTest.pValue}`);
      console.log(`  -> Challenge Acc: ${challengeMetrics.accuracy} (F1: ${challengeMetrics.macro_f1}), McNemar b=${bChal}, c=${cChal}, p=${mcNemarChal.pValue}`);
   }

   // Prepare output summary JSON
   const outputData = {
      family_size: 6,
      bonferroni_alpha: Number((0.05 / 6).toFixed(6)),
      hisc_eval_baseline: {
         test: hiscTestMetrics,
         challenge: hiscChallengeMetrics,
      },
      models: results,
   };

   fs.writeFileSync(OUTPUT_JSON, JSON.stringify(outputData, null, 2), "utf8");

   // Generate Markdown Summary
   let md = `# Learned Baselines vs HISC Experimental Summary\n\n`;
   md += `**Protocol:** Supervised models trained strictly on Training split ($N=240$) using 5-fold Stratified Group-K-Fold on \`incident_id\`.  \n`;
   md += `**Statistical Testing:** Exact two-sided McNemar against HISC evaluation preset ($p = \\min(1, 2\\sum_{k=0}^{\\min(b,c)} \\binom{b+c}{k} 0.5^{b+c})$).  \n`;
   md += `**Family-Wise Error Rate Control:** Bonferroni threshold $\\alpha = 0.05 / 6 = ${outputData.bonferroni_alpha}$ across the 6 model conditions.  \n\n`;

   md += `## 1. Test Split Performance ($N=80$)\n\n`;
   md += `| Model | Feature Set | Accuracy | 95% Clopper-Pearson CI | Macro F1 | McNemar $b$ | McNemar $c$ | Raw $p$-value | Significant ($p < ${outputData.bonferroni_alpha}$) |\n`;
   md += `|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n`;
   md += `| **HISC (Evaluation Preset)** | Production Components | **${hiscTestMetrics.accuracy.toFixed(4)}** | [${hiscTestMetrics.clopper_pearson_95_ci.join(", ")}] | **${hiscTestMetrics.macro_f1.toFixed(4)}** | - | - | - | Reference |\n`;

   for (const key of Object.keys(results)) {
      const m = results[key];
      const t = m.test;
      const mc = t.mcnemar_vs_hisc;
      md += `| ${m.model_name} | ${m.feature_set_label} | ${t.accuracy.toFixed(4)} | [${t.clopper_pearson_95_ci.join(", ")}] | ${t.macro_f1.toFixed(4)} | ${mc.b_hisc_correct_model_wrong} | ${mc.c_hisc_wrong_model_correct} | ${mc.p_value_raw.toFixed(6)} | ${mc.statistically_significant ? "**Yes**" : "No"} |\n`;
   }

   md += `\n## 2. Synthetic Challenge Set Performance ($N=150$)\n\n`;
   md += `| Model | Feature Set | Accuracy | 95% Clopper-Pearson CI | Macro F1 | McNemar $b$ | McNemar $c$ | Raw $p$-value | Significant ($p < ${outputData.bonferroni_alpha}$) |\n`;
   md += `|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n`;
   md += `| **HISC (Evaluation Preset)** | Production Components | **${hiscChallengeMetrics.accuracy.toFixed(4)}** | [${hiscChallengeMetrics.clopper_pearson_95_ci.join(", ")}] | **${hiscChallengeMetrics.macro_f1.toFixed(4)}** | - | - | - | Reference |\n`;

   for (const key of Object.keys(results)) {
      const m = results[key];
      const c = m.challenge;
      const mc = c.mcnemar_vs_hisc;
      md += `| ${m.model_name} | ${m.feature_set_label} | ${c.accuracy.toFixed(4)} | [${c.clopper_pearson_95_ci.join(", ")}] | ${c.macro_f1.toFixed(4)} | ${mc.b_hisc_correct_model_wrong} | ${mc.c_hisc_wrong_model_correct} | ${mc.p_value_raw.toFixed(6)} | ${mc.statistically_significant ? "**Yes**" : "No"} |\n`;
   }

   md += `\n## 3. Confusion Matrices on Held-Out Test ($N=80$)\n\n`;
   for (const key of Object.keys(results)) {
      const m = results[key];
      const cm = m.test.confusion_matrix;
      md += `### ${m.model_name} — ${m.feature_set_label}\n\n`;
      md += `| Actual \\ Predicted | duplicate | related | independent |\n`;
      md += `|---|:---:|:---:|:---:|\n`;
      for (const act of CLASSES) {
         md += `| **${act}** | ${cm[act].duplicate} | ${cm[act].related} | ${cm[act].independent} |\n`;
      }
      md += `\n`;
   }

   fs.writeFileSync(OUTPUT_MD, md, "utf8");

   // Export Per-Pair Predictions CSV
   const csvHeaders = [
      "pair_id",
      "split",
      "ground_truth",
      "hisc",
      ...conditions.map((c) => c.key),
   ];

   const csvRows = [csvHeaders.join(",")];

   // Add Test rows
   for (let i = 0; i < testData.length; i++) {
      const row = testData[i];
      const line = [
         row.pair_id,
         "test",
         row.ground_truth_label,
         hiscTestPreds[i],
         ...conditions.map((c) => predictionsByModel.test[c.key][i]),
      ];
      csvRows.push(line.join(","));
   }

   // Add Challenge rows
   for (let i = 0; i < challengeData.length; i++) {
      const row = challengeData[i];
      const line = [
         row.pair_id,
         "challenge",
         row.ground_truth_label,
         hiscChallengePreds[i],
         ...conditions.map((c) => predictionsByModel.challenge[c.key][i]),
      ];
      csvRows.push(line.join(","));
   }

   fs.writeFileSync(OUTPUT_PREDICTIONS_CSV, `${csvRows.join("\n")}\n`, "utf8");

   console.log(`\n[Phase 2] Execution complete!`);
   console.log(`  - Summary JSON: ${OUTPUT_JSON}`);
   console.log(`  - Markdown Report: ${OUTPUT_MD}`);
   console.log(`  - Predictions CSV: ${OUTPUT_PREDICTIONS_CSV}`);

   return outputData;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   runLearnedBaselines();
}
