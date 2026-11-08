import mongoose from "mongoose";
import Complaint from "../../model/complaint.model.js";
import IncidentCluster from "../../model/incidentCluster.model.js";
import { upsertIncidentCluster, analyzeIncident } from "../../service/incidentIntelligence.service.js";
import { generateDemoDataset } from "../../scripts/seedDemo.js";
import { evaluatePairwiseClustering, evaluateBCubedClustering } from "./clusterLevelBenchmark.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/civicflow_cluster_eval_isolated";

export async function runClusterComparison() {
   await mongoose.connect(MONGO_URI);

   const demoData = generateDemoDataset();
   const rawComplaints = demoData.complaints;
   const itemIds = rawComplaints.map((c) => c.tempId);

   const gtClusterMap = new Map();
   for (const c of rawComplaints) {
      gtClusterMap.set(c.tempId, c.clusterGroup != null ? `GT_CLUSTER_${c.clusterGroup}` : `GT_SINGLETON_${c.tempId}`);
   }

   // -------------------------------------------------------------
   // 1. Standard Run: Matches where classification !== "independent"
   // -------------------------------------------------------------
   await Complaint.deleteMany({});
   await IncidentCluster.deleteMany({});
   await Complaint.createIndexes();

   const idToDocStd = new Map();
   const singletonMergeReasonsStd = [];

   for (let idx = 0; idx < rawComplaints.length; idx++) {
      const raw = rawComplaints[idx];
      const complaintDoc = new Complaint({
         complaintId: `C-STD-${idx}`,
         citizenId: new mongoose.Types.ObjectId(),
         title: raw.title,
         description: raw.description,
         category: raw.category,
         location: raw.location,
         address: raw.address,
         status: "submitted",
         priority: "medium",
         createdAt: raw.createdAt,
      });
      await complaintDoc.save({ validateBeforeSave: false });
      idToDocStd.set(raw.tempId, complaintDoc);

      const matches = await analyzeIncident(complaintDoc);
      const strongest = matches[0];
      if (raw.clusterGroup == null && strongest) {
         singletonMergeReasonsStd.push({
            tempId: raw.tempId,
            matchLabel: strongest.classification,
            score: strongest.score,
         });
      }

      await upsertIncidentCluster(complaintDoc);
   }

   const docsStd = await Complaint.find({}, { _id: 1, groupId: 1 });
   const docMapStd = new Map(docsStd.map((d) => [String(d._id), d]));
   const predMapStd = new Map();
   for (const raw of rawComplaints) {
      const saved = idToDocStd.get(raw.tempId);
      const curr = docMapStd.get(String(saved._id));
      predMapStd.set(raw.tempId, curr?.groupId ? `CLUSTER_${curr.groupId}` : `SINGLETON_${raw.tempId}`);
   }

   const pwStd = evaluatePairwiseClustering(itemIds, gtClusterMap, predMapStd);
   const bcStd = evaluateBCubedClustering(itemIds, gtClusterMap, predMapStd);

   const clusterCountsStd = {};
   for (const c of predMapStd.values()) clusterCountsStd[c] = (clusterCountsStd[c] || 0) + 1;
   const sizeHistStd = {};
   for (const size of Object.values(clusterCountsStd)) {
      sizeHistStd[size] = (sizeHistStd[size] || 0) + 1;
   }

   const relCount = singletonMergeReasonsStd.filter((m) => m.matchLabel === "related").length;
   const dupCount = singletonMergeReasonsStd.filter((m) => m.matchLabel === "duplicate").length;

   // -------------------------------------------------------------
   // 2. Duplicate-Only Run: Matches where classification === "duplicate"
   // -------------------------------------------------------------
   await Complaint.deleteMany({});
   await IncidentCluster.deleteMany({});
   await Complaint.createIndexes();

   const idToDocDup = new Map();
   const singletonMergeReasonsDup = [];

   for (let idx = 0; idx < rawComplaints.length; idx++) {
      const raw = rawComplaints[idx];
      const complaintDoc = new Complaint({
         complaintId: `C-DUP-${idx}`,
         citizenId: new mongoose.Types.ObjectId(),
         title: raw.title,
         description: raw.description,
         category: raw.category,
         location: raw.location,
         address: raw.address,
         status: "submitted",
         priority: "medium",
         createdAt: raw.createdAt,
      });
      await complaintDoc.save({ validateBeforeSave: false });
      idToDocDup.set(raw.tempId, complaintDoc);

      const matches = await analyzeIncident(complaintDoc);
      // ONLY DUPLICATES TRIGGER MERGE
      const dupMatches = matches.filter((m) => m.classification === "duplicate");
      const strongest = dupMatches[0];

      if (raw.clusterGroup == null && strongest) {
         singletonMergeReasonsDup.push({
            tempId: raw.tempId,
            matchLabel: strongest.classification,
            score: strongest.score,
         });
      }

      if (strongest) {
         const incident = await IncidentCluster.findOne({ complaintIds: strongest.complaint._id });
         const cluster = incident ?? await IncidentCluster.create({
            clusterId: `INC-DUP-${idx}`,
            primaryComplaint: strongest.complaint._id,
            complaintIds: [strongest.complaint._id],
            category: strongest.complaint.category,
            centroid: strongest.complaint.location,
            complaintCount: 1,
         });

         const cIds = [...new Set([...cluster.complaintIds.map(String), String(complaintDoc._id)])];
         cluster.complaintIds = cIds;
         cluster.complaintCount = cIds.length;
         await cluster.save();

         await Complaint.updateMany(
            { _id: { $in: cIds } },
            { $set: { groupId: cluster._id } }
         );
      }
   }

   const docsDup = await Complaint.find({}, { _id: 1, groupId: 1 });
   const docMapDup = new Map(docsDup.map((d) => [String(d._id), d]));
   const predMapDup = new Map();
   for (const raw of rawComplaints) {
      const saved = idToDocDup.get(raw.tempId);
      const curr = docMapDup.get(String(saved._id));
      predMapDup.set(raw.tempId, curr?.groupId ? `CLUSTER_${curr.groupId}` : `SINGLETON_${raw.tempId}`);
   }

   const pwDup = evaluatePairwiseClustering(itemIds, gtClusterMap, predMapDup);
   const bcDup = evaluateBCubedClustering(itemIds, gtClusterMap, predMapDup);

   const clusterCountsDup = {};
   for (const c of predMapDup.values()) clusterCountsDup[c] = (clusterCountsDup[c] || 0) + 1;
   const sizeHistDup = {};
   for (const size of Object.values(clusterCountsDup)) {
      sizeHistDup[size] = (sizeHistDup[size] || 0) + 1;
   }

   await mongoose.disconnect();

   const results = {
      standard: {
         pairwise_precision: pwStd.precision,
         pairwise_recall: pwStd.recall,
         pairwise_f1: pwStd.f1,
         bcubed_precision: bcStd.precision,
         bcubed_recall: bcStd.recall,
         bcubed_f1: bcStd.f1,
         clusters_formed: Object.keys(clusterCountsStd).length,
         cluster_size_distribution: sizeHistStd,
         seeded_singletons_merged_total: singletonMergeReasonsStd.length,
         merged_by_related: relCount,
         merged_by_duplicate: dupCount,
      },
      duplicate_only: {
         pairwise_precision: pwDup.precision,
         pairwise_recall: pwDup.recall,
         pairwise_f1: pwDup.f1,
         bcubed_precision: bcDup.precision,
         bcubed_recall: bcDup.recall,
         bcubed_f1: bcDup.f1,
         clusters_formed: Object.keys(clusterCountsDup).length,
         cluster_size_distribution: sizeHistDup,
         seeded_singletons_merged_total: singletonMergeReasonsDup.length,
         merged_by_duplicate: singletonMergeReasonsDup.length,
      },
   };

   console.log(JSON.stringify(results, null, 2));
   return results;
}

if (process.argv[1]) {
   runClusterComparison();
}
