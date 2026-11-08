import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDatasetPartitions } from "../hiscEvaluationHarness.js";
import { scorePair } from "../../hisc/scorePair.js";
import { HISC_EVAL_PRESET } from "../../hisc/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, "../../../results/paper_extras");
const OUTPUT_CSV = path.join(OUTPUT_DIR, "features_550_pairs.csv");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "features_550_pairs.json");

export function extractAllFeatures() {
   const { partitions } = loadDatasetPartitions();

   const splits = [
      { name: "train", pairs: partitions.train },
      { name: "val", pairs: partitions.val },
      { name: "test", pairs: partitions.test },
      { name: "challenge", pairs: partitions.challenge },
   ];

   const rows = [];

   for (const { name: splitName, pairs } of splits) {
      for (const pair of pairs) {
         const scoring = scorePair(pair.complaint_a, pair.complaint_b, HISC_EVAL_PRESET);
         const context = scoring.context || {};
         const features = scoring.features || {};

         const groupId = pair.incident_id || `__pair_${pair.pair_id}`;

         const row = {
            pair_id: pair.pair_id,
            split: splitName,
            group_id: groupId,
            score_C: Number(features.category.toFixed(6)),
            score_G: Number(features.geographic.toFixed(6)),
            score_L: Number(features.lexical.toFixed(6)),
            score_S: Number(features.semantic.toFixed(6)),
            score_T: Number(features.temporal.toFixed(6)),
            distance_meters: Number((scoring.distance ?? context.distance ?? 0).toFixed(2)),
            hours_delta: Number((scoring.hours ?? context.hours ?? 0).toFixed(2)),
            category_similarity: Number((context.catSim ?? 0).toFixed(4)),
            flag_causal_concept: context.causallyConnected ? 1 : 0,
            flag_opposing_direction: context.opposingDir ? 1 : 0,
            rule_fired: scoring.rule_fired || "threshold",
            hisc_score: Number(scoring.score.toFixed(6)),
            hisc_predicted: scoring.label,
            ground_truth_label: pair.label,
         };

         // Safety validation: ensure no NaN or undefined values
         for (const [key, val] of Object.entries(row)) {
            if (val === undefined || (typeof val === "number" && Number.isNaN(val))) {
               throw new Error(`NaN/undefined encountered in row ${pair.pair_id} for field ${key}`);
            }
         }

         rows.push(row);
      }
   }

   if (rows.length !== 550) {
      throw new Error(`Expected exactly 550 rows, got ${rows.length}`);
   }

   if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
   }

   // Format as CSV
   const headers = Object.keys(rows[0]);
   const csvLines = [headers.join(",")];
   for (const row of rows) {
      csvLines.push(headers.map((h) => row[h]).join(","));
   }
   fs.writeFileSync(OUTPUT_CSV, `${csvLines.join("\n")}\n`, "utf8");
   fs.writeFileSync(OUTPUT_JSON, JSON.stringify(rows, null, 2), "utf8");

   console.log(`[Phase 1] Successfully extracted ${rows.length} rows to:`);
   console.log(`  - CSV: ${OUTPUT_CSV}`);
   console.log(`  - JSON: ${OUTPUT_JSON}`);

   return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   extractAllFeatures();
}
