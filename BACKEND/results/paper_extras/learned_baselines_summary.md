# Learned Baselines vs HISC Experimental Summary

**Protocol:** Supervised models trained strictly on Training split ($N=240$) using 5-fold Stratified Group-K-Fold on `incident_id`.  
**Statistical Testing:** Exact two-sided McNemar against HISC evaluation preset ($p = \min(1, 2\sum_{k=0}^{\min(b,c)} \binom{b+c}{k} 0.5^{b+c})$).  
**Family-Wise Error Rate Control:** Bonferroni threshold $\alpha = 0.05 / 6 = 0.008333$ across the 6 model conditions.  

## 1. Test Split Performance ($N=80$)

| Model | Feature Set | Accuracy | 95% Clopper-Pearson CI | Macro F1 | McNemar $b$ | McNemar $c$ | Raw $p$-value | Significant ($p < 0.008333$) |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **HISC (Evaluation Preset)** | Production Components | **1.0000** | [0.9549, 1] | **1.0000** | - | - | - | Reference |
| Multinomial Logistic Regression | (a) Five component scores only | 1.0000 | [0.9549, 1] | 1.0000 | 0 | 0 | 1.000000 | No |
| Multinomial Logistic Regression | (b) Stacked on HISC outputs | 1.0000 | [0.9549, 1] | 1.0000 | 0 | 0 | 1.000000 | No |
| Depth-4 Decision Tree | (a) Five component scores only | 1.0000 | [0.9549, 1] | 1.0000 | 0 | 0 | 1.000000 | No |
| Depth-4 Decision Tree | (b) Stacked on HISC outputs | 1.0000 | [0.9549, 1] | 1.0000 | 0 | 0 | 1.000000 | No |
| Gradient Boosted Decision Trees | (a) Five component scores only | 1.0000 | [0.9549, 1] | 1.0000 | 0 | 0 | 1.000000 | No |
| Gradient Boosted Decision Trees | (b) Stacked on HISC outputs | 1.0000 | [0.9549, 1] | 1.0000 | 0 | 0 | 1.000000 | No |

## 2. Synthetic Challenge Set Performance ($N=150$)

| Model | Feature Set | Accuracy | 95% Clopper-Pearson CI | Macro F1 | McNemar $b$ | McNemar $c$ | Raw $p$-value | Significant ($p < 0.008333$) |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **HISC (Evaluation Preset)** | Production Components | **0.8400** | [0.7714, 0.8947] | **0.8343** | - | - | - | Reference |
| Multinomial Logistic Regression | (a) Five component scores only | 0.6133 | [0.5305, 0.6916] | 0.5393 | 40 | 6 | 0.000000 | **Yes** |
| Multinomial Logistic Regression | (b) Stacked on HISC outputs | 0.6733 | [0.5921, 0.7476] | 0.6317 | 31 | 6 | 0.000041 | **Yes** |
| Depth-4 Decision Tree | (a) Five component scores only | 0.7000 | [0.6199, 0.772] | 0.6826 | 22 | 1 | 0.000006 | **Yes** |
| Depth-4 Decision Tree | (b) Stacked on HISC outputs | 0.7000 | [0.6199, 0.772] | 0.6826 | 22 | 1 | 0.000006 | **Yes** |
| Gradient Boosted Decision Trees | (a) Five component scores only | 0.7000 | [0.6199, 0.772] | 0.6826 | 22 | 1 | 0.000006 | **Yes** |
| Gradient Boosted Decision Trees | (b) Stacked on HISC outputs | 0.7000 | [0.6199, 0.772] | 0.6826 | 22 | 1 | 0.000006 | **Yes** |

## 3. Confusion Matrices on Held-Out Test ($N=80$)

### Multinomial Logistic Regression — (a) Five component scores only

| Actual \ Predicted | duplicate | related | independent |
|---|:---:|:---:|:---:|
| **duplicate** | 24 | 0 | 0 |
| **related** | 0 | 28 | 0 |
| **independent** | 0 | 0 | 28 |

### Multinomial Logistic Regression — (b) Stacked on HISC outputs

| Actual \ Predicted | duplicate | related | independent |
|---|:---:|:---:|:---:|
| **duplicate** | 24 | 0 | 0 |
| **related** | 0 | 28 | 0 |
| **independent** | 0 | 0 | 28 |

### Depth-4 Decision Tree — (a) Five component scores only

| Actual \ Predicted | duplicate | related | independent |
|---|:---:|:---:|:---:|
| **duplicate** | 24 | 0 | 0 |
| **related** | 0 | 28 | 0 |
| **independent** | 0 | 0 | 28 |

### Depth-4 Decision Tree — (b) Stacked on HISC outputs

| Actual \ Predicted | duplicate | related | independent |
|---|:---:|:---:|:---:|
| **duplicate** | 24 | 0 | 0 |
| **related** | 0 | 28 | 0 |
| **independent** | 0 | 0 | 28 |

### Gradient Boosted Decision Trees — (a) Five component scores only

| Actual \ Predicted | duplicate | related | independent |
|---|:---:|:---:|:---:|
| **duplicate** | 24 | 0 | 0 |
| **related** | 0 | 28 | 0 |
| **independent** | 0 | 0 | 28 |

### Gradient Boosted Decision Trees — (b) Stacked on HISC outputs

| Actual \ Predicted | duplicate | related | independent |
|---|:---:|:---:|:---:|
| **duplicate** | 24 | 0 | 0 |
| **related** | 0 | 28 | 0 |
| **independent** | 0 | 0 | 28 |

