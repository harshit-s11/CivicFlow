# Blind Inter-Annotator Reliability Evaluation Report [MOCK SIMULATION (DEMO ONLY)]

> [!WARNING]
> **MOCK DATA NOTICE:** This report was generated in `--mock-demo` mode using simulated annotator responses to verify agreement pipeline mechanics. Independent human annotation is pending. These numbers represent synthetic simulation and must **NOT** be cited as empirical evidence.

**Sample:** 100 stratified pairs (40 from Held-Out Test, 60 from Synthetic Challenge).
**Protocol:** Independent double-blind annotation by two evaluators with zero exposure to model predictions or ground-truth keys.

## 1. Inter-Annotator Reliability (Annotator 1 [MOCK] vs Annotator 2 [MOCK])

| Metric | Value | Interpretation |
|---|:---:|---|
| **Observed Agreement ($P_o$)** | **96.00%** | Proportion of pairs with identical classification |
| **Expected Agreement ($P_e$)** | 33.48% | Agreement expected strictly by chance |
| **Cohen's Kappa ($\kappa$)** | **0.9399** | **Near-Perfect Agreement** (Landis & Koch, 1977) |

### Inter-Annotator Confusion Matrix [MOCK]

| Annotator 1 \ Annotator 2 | duplicate | related | independent |
|---|:---:|:---:|:---:|
| **duplicate** | 30 | 1 | 0 |
| **related** | 2 | 30 | 0 |
| **independent** | 0 | 1 | 36 |

## 2. Agreement Against Stored Ground Truth [MOCK]

| Evaluator | Accuracy | 95% Clopper-Pearson CI | Macro F1 | Cohen's $\kappa$ vs GT |
|---|:---:|:---:|:---:|:---:|
| **Annotator 1 [MOCK]** | **99.00%** | [0.9455, 0.9997] | **0.9894** | **0.9850** |
| **Annotator 2 [MOCK]** | **97.00%** | [0.9148, 0.9938] | **0.9691** | **0.9549** |
| **Consensus ($N=96$) [MOCK]** | **100.00%** | [0.9623, 1] | **1.0000** | **1.0000** |

## 3. Human Benchmark Synthesis

*Note: The mock simulation yielded $\kappa = 0.9399$ and consensus accuracy of 100.00%, proving the functional correctness of the agreement script. Canonical evaluation awaits human completion of the templates.*
