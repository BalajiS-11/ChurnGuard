import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    roc_curve,
    precision_recall_curve
)
from sklearn.calibration import calibration_curve

def compute_ece(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    """
    Expected Calibration Error (ECE).
    """
    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    total = len(y_true)
    for i in range(n_bins):
        bin_mask = (y_prob > bin_edges[i]) & (y_prob <= bin_edges[i+1])
        bin_count = np.sum(bin_mask)
        if bin_count > 0:
            bin_acc = np.mean(y_true[bin_mask])
            bin_conf = np.mean(y_prob[bin_mask])
            ece += (bin_count / total) * np.abs(bin_acc - bin_conf)
    return float(round(ece, 5))

def evaluate_predictions(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> Dict[str, Any]:
    """
    Compute comprehensive classification metrics.
    """
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()
    
    roc_auc = float(roc_auc_score(y_true, y_prob))
    pr_auc = float(average_precision_score(y_true, y_prob))
    precision = float(precision_score(y_true, y_pred, zero_division=0))
    recall = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    accuracy = float(accuracy_score(y_true, y_pred))
    brier = float(brier_score_loss(y_true, y_prob))
    ece = compute_ece(y_true, y_prob)
    
    return {
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "accuracy": round(accuracy, 4),
        "brier_score": round(brier, 4),
        "ece": round(ece, 4),
        "threshold": round(threshold, 4),
        "confusion": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp)
        }
    }

def get_curve_points(y_true: np.ndarray, y_prob: np.ndarray, n_points: int = 50) -> Dict[str, Any]:
    """
    Subsample ROC, PR, and Calibration curves for clean JSON UI delivery.
    """
    # 1. ROC
    fpr, tpr, r_thresh = roc_curve(y_true, y_prob)
    indices = np.linspace(0, len(fpr) - 1, min(n_points, len(fpr))).astype(int)
    roc_points = [
        {"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4), "threshold": round(float(r_thresh[i]), 4)}
        for i in indices
    ]
    
    # 2. PR
    p, r, pr_thresh = precision_recall_curve(y_true, y_prob)
    indices_pr = np.linspace(0, len(p) - 1, min(n_points, len(p))).astype(int)
    pr_points = [
        {"precision": round(float(p[i]), 4), "recall": round(float(r[i]), 4)}
        for i in indices_pr
    ]
    
    # 3. Calibration
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=10, strategy="uniform")
    calib_points = [
        {"pred_prob": round(float(pred), 4), "true_prob": round(float(true), 4)}
        for pred, true in zip(prob_pred, prob_true)
    ]
    
    return {
        "roc_curve": roc_points,
        "pr_curve": pr_points,
        "calibration_curve": calib_points
    }

def compute_cost_curve(y_true: np.ndarray, y_prob: np.ndarray, cost_fn: float = 5.0, cost_fp: float = 1.0) -> List[Dict[str, Any]]:
    """
    Compute total financial cost across threshold range 0.05 to 0.95.
    Cost = FN * cost_fn + FP * cost_fp
    """
    thresholds = np.linspace(0.05, 0.95, 91)
    curve = []
    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        fn = np.sum((y_pred == 0) & (y_true == 1))
        fp = np.sum((y_pred == 1) & (y_true == 0))
        tp = np.sum((y_pred == 1) & (y_true == 1))
        tn = np.sum((y_pred == 0) & (y_true == 0))
        total_cost = float(fn * cost_fn + fp * cost_fp)
        curve.append({
            "threshold": round(float(t), 3),
            "cost": round(total_cost, 2),
            "fn": int(fn),
            "fp": int(fp),
            "tp": int(tp),
            "tn": int(tn)
        })
    return curve

def evaluate_fairness(df_eval: pd.DataFrame, y_true: np.ndarray, y_prob: np.ndarray, threshold: float) -> Dict[str, Any]:
    """
    Fairness and demographic parity evaluation across Gender and Geography.
    Checks 80% rule (ratio between 0.8 and 1.25).
    """
    y_pred = (y_prob >= threshold).astype(int)
    eval_df = df_eval.copy()
    eval_df["y_true"] = y_true
    eval_df["y_pred"] = y_pred
    
    fairness_report = {}
    
    for group_col in ["Gender", "Geography"]:
        group_stats = []
        baseline_rate = None
        groups = sorted(eval_df[group_col].unique())
        
        for idx, g in enumerate(groups):
            sub = eval_df[eval_df[group_col] == g]
            n = len(sub)
            if n == 0:
                continue
            pos_rate = float(sub["y_pred"].mean())
            
            actual_pos = sub[sub["y_true"] == 1]
            actual_neg = sub[sub["y_true"] == 0]
            
            tpr = float(actual_pos["y_pred"].mean()) if len(actual_pos) > 0 else 0.0
            fpr = float(actual_neg["y_pred"].mean()) if len(actual_neg) > 0 else 0.0
            
            if idx == 0:
                baseline_rate = pos_rate if pos_rate > 0 else 0.001
                ratio = 1.0
            else:
                ratio = pos_rate / baseline_rate if baseline_rate and baseline_rate > 0 else 1.0
                
            flag = bool(ratio < 0.8 or ratio > 1.25)
            
            group_stats.append({
                "group": str(g),
                "count": n,
                "positive_rate": round(pos_rate, 4),
                "tpr": round(tpr, 4),
                "fpr": round(fpr, 4),
                "disparate_impact_ratio": round(ratio, 4),
                "disparity_flag": flag
            })
            
        fairness_report[group_col.lower()] = group_stats
        
    return fairness_report
