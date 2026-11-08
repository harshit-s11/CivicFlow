import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadDatasetPartitions } from "../hiscEvaluationHarness.js";
import { distanceInMeters } from "../../hisc/scorePair.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, "../../../results/paper_extras");
const RELEASE_CSV = path.join(OUTPUT_DIR, "civicflow_evaluation_release_550_pairs.csv");

export function exportReleaseCsv() {
   const { partitions } = loadDatasetPartitions();

   const partitionsList = [
      { name: "train", pairs: partitions.train },
      { name: "val", pairs: partitions.val },
      { name: "test", pairs: partitions.test },
      { name: "challenge", pairs: partitions.challenge },
   ];

   const escapeCsv = (str) => {
      const s = String(str ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
      return `"${s}"`;
   };

   const headers = [
      "pair_id",
      "split",
      "category_a",
      "category_b",
      "complaint_a",
      "complaint_b",
      "latitude_a",
      "longitude_a",
      "latitude_b",
      "longitude_b",
      "distance_meters",
      "hours_delta",
      "label",
   ];

   const lines = [headers.join(",")];
   let totalCount = 0;

   for (const { name: splitName, pairs } of partitionsList) {
      for (const p of pairs) {
         const coordsA = p.complaint_a.location?.coordinates || [0, 0];
         const coordsB = p.complaint_b.location?.coordinates || [0, 0];
         const dist = distanceInMeters(coordsA, coordsB);

         const dateA = new Date(p.complaint_a.createdAt).getTime();
         const dateB = new Date(p.complaint_b.createdAt).getTime();
         const hours = Math.abs(dateA - dateB) / 3600000;

         const row = [
            p.pair_id,
            splitName,
            escapeCsv(p.complaint_a.category),
            escapeCsv(p.complaint_b.category),
            escapeCsv(p.complaint_a.title),
            escapeCsv(p.complaint_b.title),
            coordsA[1].toFixed(6), // latitude
            coordsA[0].toFixed(6), // longitude
            coordsB[1].toFixed(6), // latitude
            coordsB[0].toFixed(6), // longitude
            dist.toFixed(2),
            hours.toFixed(2),
            p.label,
         ];

         lines.push(row.join(","));
         totalCount++;
      }
   }

   if (totalCount !== 550) {
      throw new Error(`Expected exactly 550 pairs exported, got ${totalCount}`);
   }

   if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
   }

   fs.writeFileSync(RELEASE_CSV, `${lines.join("\n")}\n`, "utf8");
   console.log(`[Phase 6] Successfully exported canonical release CSV with ${totalCount} pairs to:`);
   console.log(`  -> ${RELEASE_CSV}`);

   return totalCount;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
   exportReleaseCsv();
}
