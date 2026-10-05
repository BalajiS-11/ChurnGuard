import numpy as np
import pandas as pd
from typing import Dict, Any, List

def calculate_psi(baseline: np.ndarray, target: np.ndarray, num_bins: int = 10, epsilon: float = 1e-4) -> float:
    """
    Calculate Population Stability Index (PSI) between baseline and target distributions.
    """
    baseline = np.asarray(baseline)
    target = np.asarray(target)
    
    # Handle empty or constant arrays
    if len(baseline) == 0 or len(target) == 0:
        return 0.0
    
    # Check if categorical/string or numeric
    if np.issubdtype(baseline.dtype, np.number):
        # Numeric binning using baseline percentiles
        quantiles = np.linspace(0, 100, num_bins + 1)
        bin_edges = np.percentile(baseline, quantiles)
        bin_edges = np.unique(bin_edges)
        if len(bin_edges) <= 1:
            return 0.0
        
        # Adjust boundaries slightly to catch min/max
        bin_edges[0] -= 1e-5
        bin_edges[-1] += 1e-5
        
        b_counts, _ = np.histogram(baseline, bins=bin_edges)
        t_counts, _ = np.histogram(target, bins=bin_edges)
    else:
        # Categorical binning
        categories = np.unique(np.concatenate([baseline, target]))
        b_counts = np.array([(baseline == cat).sum() for cat in categories])
        t_counts = np.array([(target == cat).sum() for cat in categories])

    b_pct = b_counts / len(baseline)
    t_pct = t_counts / len(target)
    
    # Add epsilon to prevent log(0) and division by 0
    b_pct = np.clip(b_pct, epsilon, 1.0)
    t_pct = np.clip(t_pct, epsilon, 1.0)
    
    # Renormalize
    b_pct = b_pct / b_pct.sum()
    t_pct = t_pct / t_pct.sum()
    
    psi_val = np.sum((t_pct - b_pct) * np.log(t_pct / b_pct))
    return float(np.round(psi_val, 4))

def psi_status(psi_value: float) -> str:
    """
    Classify PSI:
    < 0.10: 'ok'
    0.10 - 0.25: 'warn'
    > 0.25: 'alert'
    """
    if psi_value < 0.10:
        return "ok"
    elif psi_value <= 0.25:
        return "warn"
    else:
        return "alert"

def compute_dataset_drift(baseline_df: pd.DataFrame, target_df: pd.DataFrame, feature_cols: List[str]) -> List[Dict[str, Any]]:
    """
    Calculate PSI for each feature between baseline and target DataFrame.
    """
    reports = []
    for col in feature_cols:
        if col in baseline_df.columns and col in target_df.columns:
            psi_val = calculate_psi(baseline_df[col].dropna(), target_df[col].dropna())
            reports.append({
                "feature": col,
                "psi": psi_val,
                "status": psi_status(psi_val)
            })
    return reports
