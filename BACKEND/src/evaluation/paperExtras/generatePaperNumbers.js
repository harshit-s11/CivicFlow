import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_DIR = path.resolve(__dirname, "../../../results");
const EXTRAS_DIR = path.resolve(__dirname, "../../../results/paper_extras");
const OUTPUT_FILE = path.join(EXTRAS_DIR, "paper_numbers.json");

function item(value, sourceFile, script) {
   return {
      value,
      source_file: sourceFile,
      script,
   };
}

export function generatePaperNumbers() {
   const freeze = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, "final_held_out_evaluation.json"), "utf8"));
   const spatial = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, "spatial_query_benchmark.json"), "utf8"));
   const learned = JSON.parse(fs.readFileSync(path.join(EXTRAS_DIR, "learned_baselines_summary.json"), "utf8"));
   const cluster = JSON.parse(fs.readFileSync(path.join(EXTRAS_DIR, "cluster_level_evaluation.json"), "utf8"));
   const blind = JSON.parse(fs.readFileSync(path.join(EXTRAS_DIR, "blind_annotation_kit/blind_evaluation_summary.json"), "utf8"));
   const micro = JSON.parse(fs.readFileSync(path.join(EXTRAS_DIR, "scoring_microbenchmark.json"), "utf8"));
   const category = JSON.parse(fs.readFileSync(path.join(EXTRAS_DIR, "challenge_category_breakdown_repaired.json"), "utf8"));

   const numbers = {
      test_suite: {
         total_tests: item(258, "test-runner-output", "npm test"),
         total_suites: item(116, "test-runner-output", "npm test"),
         failing_tests: item(0, "test-runner-output", "npm test"),
      },
      evaluation_freeze: {
         commit_hash: item("327a4fcdbbda3f44492304871bbfbd3b8ab3c366", "final_held_out_evaluation.json", "runFinalEvaluationFreeze.js"),
         split_seed: item(42, "splits.json", "makeSplits.js"),
         development_pairs_count: item(400, "civicflow_400_labeled_complaint_pairs.csv", "extractFeatureTable.js"),
         challenge_pairs_count: item(150, "synthetic_challenge_set_150.csv", "generateChallengeSet.js"),
         total_evaluation_pairs: item(550, "civicflow_evaluation_release_550_pairs.csv", "exportReleaseCsv.js"),
      },
      dataset_checksums: {
         csv_400_checked_out_crlf: item("b4653ac507f422a3b6f5ffadb291d5440eab0cb07174f2398ad72739e86a33f2", "checksum_report.md", "extractFeatureTable.js"),
         csv_400_normalized_lf: item("b418a79a18925ed354093ca4805941cbd455adce654f411c673da996c6074e3c", "checksum_report.md", "extractFeatureTable.js"),
         csv_150_sha256: item("2774c8e133bbc2344c290dd27c52752be7d5137899a369316836e99ca9d8e89b", "checksum_report.md", "generateChallengeSet.js"),
         splits_sha256: item("58039b02ac69bdc78e220e0d979e1e28aa7c6fcdfb0e30595a5082b53bd4a06a", "checksum_report.md", "makeSplits.js"),
      },
      dataset_leakage_audit: {
         test_distinct_texts_in_train_pct: item(84.6, "dataset_leakage_audit.json", "datasetLeakageAudit.js"),
         test_pairs_repeating_train_template_pct: item(71.25, "dataset_leakage_audit.json", "datasetLeakageAudit.js"),
      },
      main_held_out_test_results: {
         sample_size: item(80, "final_held_out_evaluation.json", "runFinalEvaluationFreeze.js"),
         HISC_accuracy: item(freeze.methods.HISC.held_out_test.metrics.accuracy, "final_held_out_evaluation.json", "runFinalEvaluationFreeze.js"),
         HISC_macro_f1: item(freeze.methods.HISC.held_out_test.metrics.macro_f1, "final_held_out_evaluation.json", "runFinalEvaluationFreeze.js"),
         HISC_correct_count: item(80, "final_held_out_evaluation.json", "runFinalEvaluationFreeze.js"),
      },
      synthetic_challenge_set_results: {
         sample_size: item(150, "final_held_out_evaluation.json", "runFinalEvaluationFreeze.js"),
         HISC_accuracy: item(freeze.methods.HISC.synthetic_challenge.metrics.accuracy, "final_held_out_evaluation.json", "runFinalEvaluationFreeze.js"),
         HISC_macro_f1: item(freeze.methods.HISC.synthetic_challenge.metrics.macro_f1, "final_held_out_evaluation.json", "runFinalEvaluationFreeze.js"),
         HISC_correct_count: item(126, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
         B1_jaccard_correct_count: item(35, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
         B2_distance_correct_count: item(73, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
         B3_cat_distance_correct_count: item(85, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
         B4_tfidf_correct_count: item(51, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
         B5_tfidf_distance_correct_count: item(53, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
         B6_embedding_correct_count: item(43, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
         HISC_embed_correct_count: item(120, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
         HISC_learned_weights_correct_count: item(126, "final_held_out_evaluation.json", "repairCategoryMarkdown.js"),
      },
      learned_machine_learning_baselines: {
         bonferroni_significance_cutoff: item(learned.bonferroni_alpha, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         logistic_regression_5features_test_acc: item(learned.models.logistic_regression_5features.test.accuracy, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         logistic_regression_5features_chal_acc: item(learned.models.logistic_regression_5features.challenge.accuracy, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         logistic_regression_5features_mcnemar_p: item(learned.models.logistic_regression_5features.challenge.mcnemar_vs_hisc.p_value_raw, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         logistic_regression_stacked_chal_acc: item(learned.models.logistic_regression_stacked.challenge.accuracy, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         logistic_regression_stacked_mcnemar_p: item(learned.models.logistic_regression_stacked.challenge.mcnemar_vs_hisc.p_value_raw, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         decision_tree_depth4_chal_acc: item(learned.models.decision_tree_depth4_5features.challenge.accuracy, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         decision_tree_depth4_mcnemar_p: item(learned.models.decision_tree_depth4_5features.challenge.mcnemar_vs_hisc.p_value_raw, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         decision_tree_stacked_chal_acc: item(learned.models.decision_tree_depth4_stacked.challenge.accuracy, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         decision_tree_stacked_mcnemar_p: item(learned.models.decision_tree_depth4_stacked.challenge.mcnemar_vs_hisc.p_value_raw, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         gbdt_5features_chal_acc: item(learned.models.gbdt_5features.challenge.accuracy, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         gbdt_5features_mcnemar_p: item(learned.models.gbdt_5features.challenge.mcnemar_vs_hisc.p_value_raw, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         gbdt_stacked_chal_acc: item(learned.models.gbdt_stacked.challenge.accuracy, "learned_baselines_summary.json", "runLearnedBaselines.js"),
         gbdt_stacked_mcnemar_p: item(learned.models.gbdt_stacked.challenge.mcnemar_vs_hisc.p_value_raw, "learned_baselines_summary.json", "runLearnedBaselines.js"),
      },
      cluster_level_sanity_check: {
         label: item("SANITY CHECK ON DESIGNED DATA, NOT INDEPENDENT EVIDENCE", "cluster_level_evaluation.json", "clusterLevelBenchmark.js"),
         total_complaints: item(cluster.dataset_summary.total_complaints, "cluster_level_evaluation.json", "clusterLevelBenchmark.js"),
         ground_truth_clusters: item(cluster.dataset_summary.ground_truth_clusters, "cluster_level_evaluation.json", "clusterLevelBenchmark.js"),
         singletons: item(cluster.dataset_summary.singletons, "cluster_level_evaluation.json", "clusterLevelBenchmark.js"),
         baseline_pairwise_f1: item(cluster.baseline_run.pairwise.f1, "cluster_level_evaluation.json", "clusterLevelBenchmark.js"),
         baseline_bcubed_f1: item(cluster.baseline_run.bcubed.f1, "cluster_level_evaluation.json", "clusterLevelBenchmark.js"),
         monte_carlo_100_runs_bcubed_f1_mean: item(cluster.monte_carlo_100_runs.distribution_statistics.bcubed_f1.mean, "cluster_level_evaluation.json", "clusterLevelBenchmark.js"),
         monte_carlo_100_runs_bcubed_f1_std: item(cluster.monte_carlo_100_runs.distribution_statistics.bcubed_f1.std, "cluster_level_evaluation.json", "clusterLevelBenchmark.js"),
      },
      blind_inter_annotator_reliability: {
         status: item("MOCK_EXCLUDED_PENDING_HUMAN_RATING", "sample_manifest_with_keys.json", "generateBlindKit.js"),
         sample_size: item(100, "blind_annotation_100_pairs.csv", "generateBlindKit.js"),
         notice: item("Mock demo values (kappa=0.9399, accuracy=100%) excluded from canonical paper numbers pending independent human rating", "ANNOTATION_GUIDELINES.md", "evaluateBlindAnnotation.js"),
      },
      scoring_microbenchmark: {
         evaluation_preset_mean_latency_us: item(micro.evaluation_preset.statistics.mean_microseconds, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         evaluation_preset_p50_us: item(micro.evaluation_preset.statistics.p50_median_microseconds, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         evaluation_preset_p95_us: item(micro.evaluation_preset.statistics.p95_microseconds, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         evaluation_preset_p99_us: item(micro.evaluation_preset.statistics.p99_microseconds, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         evaluation_preset_throughput_pairs_sec: item(micro.evaluation_preset.statistics.throughput_pairs_per_sec, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         deployed_preset_mean_latency_us: item(micro.deployed_preset.statistics.mean_microseconds, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         deployed_preset_p50_us: item(micro.deployed_preset.statistics.p50_median_microseconds, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         deployed_preset_p95_us: item(micro.deployed_preset.statistics.p95_microseconds, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         deployed_preset_p99_us: item(micro.deployed_preset.statistics.p99_microseconds, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
         deployed_preset_throughput_pairs_sec: item(micro.deployed_preset.statistics.throughput_pairs_per_sec, "scoring_microbenchmark.json", "scoringMicrobenchmark.js"),
      },
      geospatial_query_speedups: {
         scale_1k_speedup: item(Number((spatial.volumeExperiments[0].unindexed_geoWithin.latency.p50_ms / spatial.volumeExperiments[0].indexed_geoWithin.latency.p50_ms).toFixed(2)), "spatial_query_benchmark.json", "spatialQueryBenchmark.js"),
         scale_10k_speedup: item(Number((spatial.volumeExperiments[1].unindexed_geoWithin.latency.p50_ms / spatial.volumeExperiments[1].indexed_geoWithin.latency.p50_ms).toFixed(2)), "spatial_query_benchmark.json", "spatialQueryBenchmark.js"),
         scale_50k_speedup: item(Number((spatial.volumeExperiments[2].unindexed_geoWithin.latency.p50_ms / spatial.volumeExperiments[2].indexed_geoWithin.latency.p50_ms).toFixed(2)), "spatial_query_benchmark.json", "spatialQueryBenchmark.js"),
         benchmark_repetitions: item(spatial.querySpecification.repetitionsPerCase, "spatial_query_benchmark.json", "spatialQueryBenchmark.js"),
         warmup_runs: item(spatial.querySpecification.warmupCount, "spatial_query_benchmark.json", "spatialQueryBenchmark.js"),
      },
   };

   fs.writeFileSync(OUTPUT_FILE, JSON.stringify(numbers, null, 2), "utf8");
   console.log(`[Phase 8] Successfully compiled paper_numbers.json with source citations to: ${OUTPUT_FILE}`);
   return numbers;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   generatePaperNumbers();
}
