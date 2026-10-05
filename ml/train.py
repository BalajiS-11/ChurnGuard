import json
import time
import hashlib
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import optuna
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    brier_score_loss
)
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

from ml.config import (
    DATA_PATH,
    ARTIFACTS_DIR,
    PLOTS_DIR,
    RANDOM_STATE,
    ALL_FEATURES,
    COST_FN,
    COST_FP
)
from ml.features import engineer_features, get_preprocessor
from ml.evaluate import (
    compute_ece,
    evaluate_predictions,
    get_curve_points,
    compute_cost_curve,
    evaluate_fairness
)
from ml.explain import ModelExplainer
from ml.drift import compute_dataset_drift

# Suppress optuna logging noise
optuna.logging.set_verbosity(optuna.logging.WARNING)

def train_pipeline():
    print("=" * 70)
    print("CHURNGUARD: MACHINE LEARNING TRAINING & EVALUATION PIPELINE")
    print("=" * 70)
    
    # 1. Load Data
    print(f"\n[1/8] Loading dataset from {DATA_PATH}...")
    raw_df = pd.read_csv(DATA_PATH)
    with open(DATA_PATH, "rb") as f:
        data_hash = hashlib.sha256(f.read()).hexdigest()
    print(f"Loaded {len(raw_df)} rows. SHA256: {data_hash[:12]}...")
    
    # Feature Engineering
    print("Applying feature engineering...")
    df_feat = engineer_features(raw_df)
    X = df_feat[ALL_FEATURES]
    y = df_feat["Exited"].values
    
    # 2. Stratified Split 70 / 15 / 15
    print("\n[2/8] Creating Stratified 70/15/15 Split (train/val/test)...")
    # First split off 15% test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, stratify=y, random_state=RANDOM_STATE
    )
    # Next split remaining 85% into train (70/85 ~= 0.8235) and val (15/85 ~= 0.1765)
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.17647, stratify=y_train_val, random_state=RANDOM_STATE
    )
    
    print(f"Train set: {len(X_train)} samples ({y_train.sum()} churned, {y_train.mean():.1%})")
    print(f"Validation set: {len(X_val)} samples ({y_val.sum()} churned, {y_val.mean():.1%})")
    print(f"Test set (HELD OUT): {len(X_test)} samples ({y_test.sum()} churned, {y_test.mean():.1%})")
    
    # Preprocessor fit strictly on train
    preprocessor = get_preprocessor()
    preprocessor.fit(X_train)
    
    X_train_trans = preprocessor.transform(X_train)
    X_val_trans = preprocessor.transform(X_val)
    X_test_trans = preprocessor.transform(X_test)
    
    # Class imbalance scale_pos_weight
    spw = float((y_train == 0).sum() / (y_train == 1).sum())
    print(f"Imbalance ratio (scale_pos_weight): {spw:.2f}")
    
    # 3. Model Comparison on Stratified 5-Fold CV
    print("\n[3/8] Comparing Models with Stratified 5-Fold CV on Train split...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    
    candidate_models = {
        "Logistic Regression": LogisticRegression(
            class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=300, max_depth=8, class_weight="balanced",
            random_state=RANDOM_STATE, n_jobs=-1
        ),
        "XGBoost": XGBClassifier(
            n_estimators=300, max_depth=5, learning_rate=0.05,
            scale_pos_weight=spw, eval_metric="logloss",
            random_state=RANDOM_STATE, n_jobs=-1
        ),
        "LightGBM": LGBMClassifier(
            n_estimators=300, max_depth=5, learning_rate=0.05,
            scale_pos_weight=spw, random_state=RANDOM_STATE,
            verbosity=-1, n_jobs=-1
        )
    }
    
    comparison_results = []
    
    for name, clf in candidate_models.items():
        t0 = time.time()
        cv_roc, cv_pr, cv_rec, cv_prec, cv_f1, cv_acc, cv_brier = [], [], [], [], [], [], []
        
        for tr_idx, va_idx in cv.split(X_train_trans, y_train):
            x_tr_fold, y_tr_fold = X_train_trans[tr_idx], y_train[tr_idx]
            x_va_fold, y_va_fold = X_train_trans[va_idx], y_train[va_idx]
            
            clf.fit(x_tr_fold, y_tr_fold)
            p_fold = clf.predict_proba(x_va_fold)[:, 1]
            y_pred_fold = (p_fold >= 0.5).astype(int)
            
            cv_roc.append(roc_auc_score(y_va_fold, p_fold))
            cv_pr.append(average_precision_score(y_va_fold, p_fold))
            cv_rec.append(recall_score(y_va_fold, y_pred_fold, zero_division=0))
            cv_prec.append(precision_score(y_va_fold, y_pred_fold, zero_division=0))
            cv_f1.append(f1_score(y_va_fold, y_pred_fold, zero_division=0))
            cv_acc.append(accuracy_score(y_va_fold, y_pred_fold))
            cv_brier.append(brier_score_loss(y_va_fold, p_fold))
            
        dur = round(time.time() - t0, 2)
        res = {
            "model": name,
            "roc_auc": round(float(np.mean(cv_roc)), 4),
            "pr_auc": round(float(np.mean(cv_pr)), 4),
            "recall": round(float(np.mean(cv_rec)), 4),
            "precision": round(float(np.mean(cv_prec)), 4),
            "f1": round(float(np.mean(cv_f1)), 4),
            "accuracy": round(float(np.mean(cv_acc)), 4),
            "brier_score": round(float(np.mean(cv_brier)), 4),
            "train_time_sec": dur
        }
        comparison_results.append(res)
        print(f"  -> {name:<20}: ROC-AUC={res['roc_auc']:.4f} | PR-AUC={res['pr_auc']:.4f} | F1={res['f1']:.4f} ({dur}s)")
        
    # Also evaluate Soft-Voting Ensemble (XGBoost + LightGBM + RF)
    t0 = time.time()
    ens = VotingClassifier(
        estimators=[
            ("xgb", candidate_models["XGBoost"]),
            ("lgb", candidate_models["LightGBM"]),
            ("rf", candidate_models["Random Forest"])
        ],
        voting="soft"
    )
    cv_roc, cv_pr, cv_rec, cv_prec, cv_f1, cv_acc, cv_brier = [], [], [], [], [], [], []
    for tr_idx, va_idx in cv.split(X_train_trans, y_train):
        x_tr_fold, y_tr_fold = X_train_trans[tr_idx], y_train[tr_idx]
        x_va_fold, y_va_fold = X_train_trans[va_idx], y_train[va_idx]
        ens.fit(x_tr_fold, y_tr_fold)
        p_fold = ens.predict_proba(x_va_fold)[:, 1]
        y_pred_fold = (p_fold >= 0.5).astype(int)
        cv_roc.append(roc_auc_score(y_va_fold, p_fold))
        cv_pr.append(average_precision_score(y_va_fold, p_fold))
        cv_rec.append(recall_score(y_va_fold, y_pred_fold, zero_division=0))
        cv_prec.append(precision_score(y_va_fold, y_pred_fold, zero_division=0))
        cv_f1.append(f1_score(y_va_fold, y_pred_fold, zero_division=0))
        cv_acc.append(accuracy_score(y_va_fold, y_pred_fold))
        cv_brier.append(brier_score_loss(y_va_fold, p_fold))
    dur = round(time.time() - t0, 2)
    ens_res = {
        "model": "Soft-Voting Ensemble",
        "roc_auc": round(float(np.mean(cv_roc)), 4),
        "pr_auc": round(float(np.mean(cv_pr)), 4),
        "recall": round(float(np.mean(cv_rec)), 4),
        "precision": round(float(np.mean(cv_prec)), 4),
        "f1": round(float(np.mean(cv_f1)), 4),
        "accuracy": round(float(np.mean(cv_acc)), 4),
        "brier_score": round(float(np.mean(cv_brier)), 4),
        "train_time_sec": dur
    }
    comparison_results.append(ens_res)
    print(f"  -> {'Soft-Voting Ensemble':<20}: ROC-AUC={ens_res['roc_auc']:.4f} | PR-AUC={ens_res['pr_auc']:.4f} | F1={ens_res['f1']:.4f} ({dur}s)")
    
    # Save comparison table
    with open(ARTIFACTS_DIR / "model_comparison.json", "w", encoding="utf-8") as f:
        json.dump(comparison_results, f, indent=2)
        
    # 4. Optuna Hyperparameter Tuning for XGBoost
    print("\n[4/8] Running Optuna Hyperparameter Tuning (50 trials, PR-AUC objective)...")
    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 150, 600),
            "max_depth": trial.suggest_int("max_depth", 3, 7),
            "learning_rate": trial.suggest_float("learning_rate", 0.015, 0.15, log=True),
            "subsample": trial.suggest_float("subsample", 0.65, 0.95),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.65, 0.95),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 8),
            "reg_lambda": trial.suggest_float("reg_lambda", 0.1, 8.0, log=True),
            "scale_pos_weight": spw,
            "eval_metric": "logloss",
            "random_state": RANDOM_STATE,
            "n_jobs": -1
        }
        scores = []
        for tr_idx, va_idx in cv.split(X_train_trans, y_train):
            m = XGBClassifier(**params)
            m.fit(X_train_trans[tr_idx], y_train[tr_idx])
            p = m.predict_proba(X_train_trans[va_idx])[:, 1]
            scores.append(average_precision_score(y_train[va_idx], p))
        return float(np.mean(scores))
        
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=50)
    print(f"Best Optuna PR-AUC: {study.best_value:.4f}")
    print(f"Best hyperparameters: {study.best_params}")
    
    # Train best XGBoost model on full training set
    best_clf = XGBClassifier(**study.best_params, scale_pos_weight=spw, eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1)
    best_clf.fit(X_train_trans, y_train)
    
    # 5. Isotonic Calibration on Validation Set
    print("\n[5/8] Fitting Isotonic Probability Calibration on Validation split...")
    raw_val_probs = best_clf.predict_proba(X_val_trans)[:, 1]
    brier_before = float(brier_score_loss(y_val, raw_val_probs))
    ece_before = compute_ece(y_val, raw_val_probs)
    
    calibrator = CalibratedClassifierCV(best_clf, method="isotonic", cv="prefit")
    calibrator.fit(X_val_trans, y_val)
    
    calib_val_probs = calibrator.predict_proba(X_val_trans)[:, 1]
    brier_after = float(brier_score_loss(y_val, calib_val_probs))
    ece_after = compute_ece(y_val, calib_val_probs)
    
    print(f"Validation Brier Score: {brier_before:.4f} -> {brier_after:.4f} (improvement: {brier_before - brier_after:+.4f})")
    print(f"Validation ECE:         {ece_before:.4f} -> {ece_after:.4f} (improvement: {ece_before - ece_after:+.4f})")
    
    calibration_metrics = {
        "brier_before": round(brier_before, 4),
        "brier_after": round(brier_after, 4),
        "ece_before": round(ece_before, 4),
        "ece_after": round(ece_after, 4)
    }
    with open(ARTIFACTS_DIR / "calibration_metrics.json", "w", encoding="utf-8") as f:
        json.dump(calibration_metrics, f, indent=2)
        
    # 6. Cost-Optimal Decision Threshold
    print("\n[6/8] Finding Cost-Optimal Decision Threshold on Validation set (FN cost 5, FP cost 1)...")
    cost_curve = compute_cost_curve(y_val, calib_val_probs, cost_fn=COST_FN, cost_fp=COST_FP)
    min_cost_entry = min(cost_curve, key=lambda x: x["cost"])
    optimal_threshold = float(min_cost_entry["threshold"])
    print(f"Optimal Decision Threshold: {optimal_threshold:.3f} (Expected Cost: {min_cost_entry['cost']:.1f})")
    
    with open(ARTIFACTS_DIR / "cost_threshold_curve.json", "w", encoding="utf-8") as f:
        json.dump(cost_curve, f, indent=2)
        
    # 7. Final Evaluation ONCE on Held-Out Test Set
    print("\n[7/8] Evaluating Final Calibrated Model ONCE on Held-Out Test Set...")
    p_test = calibrator.predict_proba(X_test_trans)[:, 1]
    test_metrics = evaluate_predictions(y_test, p_test, threshold=optimal_threshold)
    curve_points = get_curve_points(y_test, p_test)
    
    print("-" * 50)
    print(f"FINAL TEST SET RESULTS (N={len(y_test)}):")
    print(f"  ROC-AUC:   {test_metrics['roc_auc']:.4f} (Target: >= 0.8400) -> {'PASS' if test_metrics['roc_auc'] >= 0.84 else 'FAIL'}")
    print(f"  PR-AUC:    {test_metrics['pr_auc']:.4f}")
    print(f"  Recall:    {test_metrics['recall']:.4f}")
    print(f"  Precision: {test_metrics['precision']:.4f}")
    print(f"  F1 Score:  {test_metrics['f1']:.4f}")
    print(f"  Accuracy:  {test_metrics['accuracy']:.4f}")
    print(f"  ECE:       {test_metrics['ece']:.4f}")
    print(f"  Confusion: TN={test_metrics['confusion']['tn']}, FP={test_metrics['confusion']['fp']}, FN={test_metrics['confusion']['fn']}, TP={test_metrics['confusion']['tp']}")
    print("-" * 50)
    
    # Save test metrics and curve points
    all_test_metrics = {
        **test_metrics,
        **curve_points,
        "calibration": calibration_metrics
    }
    with open(ARTIFACTS_DIR / "test_metrics.json", "w", encoding="utf-8") as f:
        json.dump(all_test_metrics, f, indent=2)
        
    # Generate and save publication-quality plots for evaluation
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    fig.patch.set_facecolor('#FFFFFF')
    
    # Plot 1: ROC Curve
    roc_df = pd.DataFrame(curve_points["roc_curve"])
    axes[0].plot(roc_df["fpr"], roc_df["tpr"], color="#4F46E5", lw=2.5, label=f"ROC (AUC = {test_metrics['roc_auc']:.3f})")
    axes[0].plot([0, 1], [0, 1], color="#94A3B8", linestyle="--", lw=1.5)
    axes[0].set_title("Test ROC Curve", fontsize=12, fontweight="bold")
    axes[0].set_xlabel("False Positive Rate")
    axes[0].set_ylabel("True Positive Rate")
    axes[0].legend(loc="lower right")
    
    # Plot 2: PR Curve
    pr_df = pd.DataFrame(curve_points["pr_curve"])
    axes[1].plot(pr_df["recall"], pr_df["precision"], color="#10B981", lw=2.5, label=f"PR (AUC = {test_metrics['pr_auc']:.3f})")
    axes[1].set_title("Test Precision-Recall Curve", fontsize=12, fontweight="bold")
    axes[1].set_xlabel("Recall")
    axes[1].set_ylabel("Precision")
    axes[1].legend(loc="lower left")
    
    # Plot 3: Calibration Curve
    cal_df = pd.DataFrame(curve_points["calibration_curve"])
    axes[2].plot(cal_df["pred_prob"], cal_df["true_prob"], "s-", color="#F59E0B", lw=2, label="Calibrated Isotonic")
    axes[2].plot([0, 1], [0, 1], color="#94A3B8", linestyle="--", lw=1.5, label="Perfect Calibration")
    axes[2].set_title("Reliability Calibration Diagram", fontsize=12, fontweight="bold")
    axes[2].set_xlabel("Mean Predicted Probability")
    axes[2].set_ylabel("Fraction of Positives")
    axes[2].legend(loc="upper left")
    
    plt.tight_layout()
    eval_plot_path = PLOTS_DIR / "model_evaluation_curves.png"
    fig.savefig(eval_plot_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved evaluation curves plot to {eval_plot_path}")
    
    # 8. Explainability, Fairness & Drift
    print("\n[8/8] Computing SHAP Global Explainability, Fairness Audit & Feature Drift...")
    explainer = ModelExplainer(best_clf, preprocessor)
    
    # Global SHAP importance on sample of 250 rows
    sample_df = df_feat.sample(min(250, len(df_feat)), random_state=RANDOM_STATE)
    global_importance = explainer.explain_global(sample_df, max_features=15)
    with open(ARTIFACTS_DIR / "global_shap.json", "w", encoding="utf-8") as f:
        json.dump(global_importance, f, indent=2)
    print("Top 5 Global Drivers:")
    for d in global_importance[:5]:
        print(f"  - {d['friendly_name']:<25}: mean |SHAP| = {d['mean_abs_shap']:.4f}")
        
    # Fairness Audit on Test Set
    df_test_raw = raw_df.iloc[X_test.index].copy()
    fairness_report = evaluate_fairness(df_test_raw, y_test, p_test, threshold=optimal_threshold)
    with open(ARTIFACTS_DIR / "fairness_report.json", "w", encoding="utf-8") as f:
        json.dump(fairness_report, f, indent=2)
    print(f"Fairness evaluated across Gender and Geography (80% rule audit).")
    
    # Drift Baseline vs Validation/Test
    drift_report = compute_dataset_drift(X_train, X_test, feature_cols=ALL_FEATURES)
    with open(ARTIFACTS_DIR / "drift_report.json", "w", encoding="utf-8") as f:
        json.dump(drift_report, f, indent=2)
    print(f"Initial drift check: {sum(1 for d in drift_report if d['status'] == 'ok')}/{len(drift_report)} features OK.")
    
    # Save Final Bundle
    bundle = {
        "model": calibrator,
        "base_classifier": best_clf,
        "preprocessor": preprocessor,
        "threshold": optimal_threshold,
        "features": ALL_FEATURES,
        "transformed_features": list(preprocessor.get_feature_names_out()),
        "hyperparameters": study.best_params,
        "data_hash": data_hash
    }
    model_path = ARTIFACTS_DIR / "model_v1.joblib"
    joblib.dump(bundle, model_path)
    print(f"\nSaved production model bundle to {model_path}")
    
    metadata = {
        "model_version": "v1.0.0",
        "algorithm": "XGBoost (Calibrated Isotonic)",
        "train_date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "data_hash": data_hash,
        "training_samples": len(X_train),
        "validation_samples": len(X_val),
        "test_samples": len(X_test),
        "threshold": optimal_threshold,
        "roc_auc": test_metrics["roc_auc"],
        "pr_auc": test_metrics["pr_auc"],
        "recall": test_metrics["recall"],
        "precision": test_metrics["precision"],
        "f1": test_metrics["f1"],
        "accuracy": test_metrics["accuracy"],
        "brier_score": test_metrics["brier_score"],
        "ece": test_metrics["ece"],
        "features": ALL_FEATURES
    }
    with open(ARTIFACTS_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {ARTIFACTS_DIR / 'metadata.json'}")
    
    print("\n" + "=" * 70)
    print("TRAINING PIPELINE COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    return test_metrics

if __name__ == "__main__":
    train_pipeline()
