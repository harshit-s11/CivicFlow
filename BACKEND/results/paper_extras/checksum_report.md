# Evaluation Dataset SHA-256 Checksum Report

This report documents the SHA-256 cryptographic hashes of all authoritative evaluation datasets in the CivicFlow repository.

> [!IMPORTANT]
> **Line Ending Sensitivity Notice:**  
> Git checkouts on Windows environments convert line delimiters to CRLF (`\r\n`), altering the byte-level hash of text-based files.  
> Under byte-level LF normalization (`\n`), the checksums are canonical and immutable.  
> **CI running on Linux environments uses the LF checksums.**

## Dataset Checksums

| File | Relative Path | Checked-out Hash (Windows CRLF) | Normalized Hash (Linux CI LF) | Invariant Size |
|---|---|---|---|:---:|
| **Original 400 Labeled Pairs** | `civicflow_400_labeled_complaint_pairs.csv` | `b4653ac507f422a3b6f5ffadb291d5440eab0cb07174f2398ad72739e86a33f2` | `b418a79a18925ed354093ca4805941cbd455adce654f411c673da996c6074e3c` | 400 rows |
| **Synthetic Challenge Set (150 pairs)** | `BACKEND/data/synthetic_challenge_set_150.csv` | `2774c8e133bbc2344c290dd27c52752be7d5137899a369316836e99ca9d8e89b` | `2774c8e133bbc2344c290dd27c52752be7d5137899a369316836e99ca9d8e89b` | 150 rows |
| **Stratified Split Assignments** | `BACKEND/data/splits.json` | `58039b02ac69bdc78e220e0d979e1e28aa7c6fcdfb0e30595a5082b53bd4a06a` | `58039b02ac69bdc78e220e0d979e1e28aa7c6fcdfb0e30595a5082b53bd4a06a` | Seed 42 |

## Evaluation Freeze Commit Reference

- **Evaluation Freeze Commit Hash:** `327a4fcdbbda3f44492304871bbfbd3b8ab3c366`
- **Protected Files Safety Policy:** No `git add --renormalize` command was executed on protected files, preserving historical Git object integrity.
