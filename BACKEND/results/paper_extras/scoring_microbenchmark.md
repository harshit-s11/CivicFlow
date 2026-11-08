# In-Memory Scoring Micro-Benchmark & Hardware Profile

**Protocol:** Isolated CPU microbenchmark evaluating 10,000 pairwise comparisons with zero disk/network I/O after 1,000 JIT warm-up cycles. Measured using `process.hrtime.bigint()`.  

## 1. Latency & Throughput Benchmark

| Preset | Duplicate Threshold | Related Threshold | Mean Latency | Median (p50) | p90 | p95 | p99 | Throughput |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Evaluation Preset (`HISC-eval`)** | 0.60 | 0.10 | **450.1 μs** (0.450 ms) | **375.0 μs** | 656.4 μs | 768.2 μs | 1047.4 μs | **2,221.9 pairs/s** |
| **Deployed Preset (`DEFAULT_HISC_CONFIG`)** | 0.60 | 0.35 | **410.2 μs** (0.410 ms) | **353.5 μs** | 609.2 μs | 725.3 μs | 1030.4 μs | **2,438.1 pairs/s** |

## 2. Hardware Environment

- **Processor (CPU):** AMD Ryzen 5 5600H with Radeon Graphics          (6 physical cores / 12 logical threads @ 3294 MHz)
- **Memory (RAM):** 7.88 GB total (1.15 GB free)
- **Operating System:** Windows_NT (win32 10.0.26300 x64)
- **Node.js Runtime:** Node v22.16.0 (V8 12.4.254.21-node.26)
- **Database Engine:** MongoDB 8.3.11 (Mongoose driver 9.9.4)
