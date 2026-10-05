# Model Card: ChurnGuard v1.0.0

## Model Details
- **Developer:** ChurnGuard Machine Learning Engineering Team
- **Model Date:** October 2026
- **Model Version:** v1.0.0 (Production Release)
- **Model Type:** Extreme Gradient Boosting (XGBoost) with Isotonic Probability Calibration
- **Pipeline:** Preprocessing (ColumnTransformer: Median Imputation + OneHotEncoder) -> XGBClassifier (tuned via Optuna) -> CalibratedClassifierCV(method='isotonic', cv='prefit')
- **Serialization:** Joblib bundle (calibrator, base estimator, preprocessor, threshold, feature definitions)

## Intended Use
- **Primary Intended Uses:** Proactive identification of retail banking customers at risk of attrition within 3-6 months.
- **Intended Users:** Relationship Managers (RMs), Retention Specialists, and Marketing Campaign Managers.
- **Out-of-Scope Uses:** Automated account closure, credit underwriting, pricing discrimination, or legal contract alteration without human review. All predictions are strictly advisory.

## Training & Evaluation Data
- **Dataset:** Bank Customer Churn Modelling dataset (10,000 real records).
- **Integrity:** SHA-256: 3996cd1fa372e0db0cd9c0ebac35bbd4e8e3c65fb942bb010c826e7b1eeef0a0.
- **Class Balance:** 79.63% retained (0) vs. 20.37% churned (1).
- **Data Splitting:** Stratified 70/15/15:
  - Training Set: 7,000 samples (1,426 churners, 20.37%)
  - Validation Set: 1,500 samples (305 churners, 20.33%)
  - Held-out Test Set: 1,500 samples (306 churners, 20.40%) - touched exactly ONCE during final verification.

## Cross-Validation Model Comparison (Train Set, 5-Fold Stratified CV)
| Model | ROC-AUC | PR-AUC | Recall | Precision | F1 Score | Accuracy | Brier Score | Train Time |
|---|---|---|---|---|---|---|---|---|
| Logistic Regression | 0.7810 | 0.4983 | 0.7104 | 0.3955 | 0.5080 | 0.7200 | 0.1900 | 3.53s |
| Random Forest | 0.8525 | 0.6522 | 0.6795 | 0.5533 | 0.6093 | 0.8227 | 0.1361 | 3.73s |
| **XGBoost (Winner)** | **0.8597** | **0.6934** | **0.6879** | **0.5477** | **0.6096** | **0.8204** | **0.1277** | **3.19s** |
| LightGBM | 0.8592 | 0.6911 | 0.7006 | 0.5425 | 0.6111 | 0.8181 | 0.1285 | 2.74s |
| Soft-Voting Ensemble | 0.8635 | 0.6912 | 0.6908 | 0.5528 | 0.6137 | 0.8229 | 0.1267 | 11.46s |

## Hyperparameter Optimization (Optuna, 50 trials, PR-AUC Objective)
- 
_estimators: 231
- max_depth: 5
- learning_rate: 0.03008
- subsample: 0.8738
- colsample_bytree: 0.7722
- min_child_weight: 7
- 
eg_lambda: 0.9563
- scale_pos_weight: 3.91 (computed from training set class ratio)

## Calibration & Decision Threshold
- **Calibration Method:** Isotonic regression on validation split.
- **Brier Score:** Improved from 0.1319 to 0.0953 on validation.
- **Expected Calibration Error (ECE):** Reduced from 0.1539 to 0.0000 on validation (0.0169 on held-out test).
- **Cost-Optimal Threshold:** tau = 0.140, determined by minimizing expected financial cost: Cost(tau) = 5 * FN + 1 * FP.

## Final Held-Out Test Set Performance (N = 1,500)
- **ROC-AUC:** 0.8592 (Target: >= 0.8400 - MET)
- **PR-AUC:** 0.6635 (Target: >= 0.6500 - MET)
- **Recall:** 0.8268 (Caught 253 of 306 true churners)
- **Precision:** 0.4231
- **F1 Score:** 0.5597
- **Accuracy:** 0.7347
- **Brier Score:** 0.1066
- **ECE:** 0.0169 (Target: <= 0.0500 - MET)
- **Confusion Matrix:**
  - True Negatives (TN): 849
  - False Positives (FP): 345
  - False Negatives (FN): 53
  - True Positives (TP): 253

## Explainability & Global Feature Importance (Top Drivers)
1. **Age:** mean |SHAP| = 0.6971 (Older customers, especially 45-60, experience significantly higher attrition)
2. **NumOfProducts:** mean |SHAP| = 0.5988 (Holding 3 or 4 products has near 85-100% churn; 2 products is most stable)
3. **IsActiveMember:** mean |SHAP| = 0.2112 (Active members show strong account stickiness)
4. **Engagement Score:** mean |SHAP| = 0.1995 (Composite activity index)
5. **Geography: Germany:** mean |SHAP| = 0.1967 (German market exhibits 2x baseline attrition compared to France/Spain)

## Fairness & Demographic Parity Audit
- **Gender:**
  - Female: Count=703, Positive Rate=47.94%, TPR=87.01%, FPR=34.79%
  - Male: Count=797, Positive Rate=32.75%, TPR=76.74%, FPR=24.25%
  - Disparate Impact Ratio: 0.6831 (flags disparity due to higher baseline female churn in the raw portfolio: 25.07% female vs 16.46% male).
- **Geography:**
  - France (Baseline): Positive Rate=29.92%, TPR=73.85%, FPR=21.03%
  - Germany: Positive Rate=65.00%, TPR=91.96%, FPR=53.73%, Disparate Impact Ratio: 2.1723 (disparity flag triggered; driven by underlying 32.44% churn rate in Germany vs 16.15% in France).
  - Spain: Positive Rate=34.48%, TPR=84.38%, FPR=23.24%, Disparate Impact Ratio: 1.1524 (Within 0.8 - 1.25 bounds).

## Known Limitations
1. **Historical Static Snapshot:** The dataset captures a cross-sectional snapshot; time-varying interaction sequences are inferred.
2. **Regional Disparities:** Higher predicted churn in Germany reflects genuine ground truth in the historical training data. Models in production should be paired with tailored regional campaigns rather than blanket policies.
3. **Threshold Sensitivity:** The cost-optimal threshold of 0.14 prioritizes recall (82.7%) over precision, accepting more false positives to protect high customer lifetime value. If retention intervention costs rise, the threshold can be re-tuned in Model Lab.
