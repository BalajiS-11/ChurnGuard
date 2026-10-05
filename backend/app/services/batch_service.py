import os
import io
import csv
import time
from datetime import datetime, timezone
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.db.models import BatchJob, Prediction, Customer
from backend.app.services.prediction_service import predict_single, calculate_risk_tier, calculate_revenue_at_risk
from backend.app.services.model_runtime import get_runtime
from ml.features import engineer_features

REQUIRED_CSV_COLUMNS = [
    "CreditScore", "Geography", "Gender", "Age", "Tenure",
    "Balance", "NumOfProducts", "HasCrCard", "IsActiveMember", "EstimatedSalary"
]

def validate_csv_content(csv_text: str) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Validate CSV columns and types. Returns (valid_df, list_of_row_errors).
    """
    try:
        df = pd.read_csv(io.StringIO(csv_text))
    except Exception as e:
        return pd.DataFrame(), [{"row": 0, "error": f"Malformed CSV file: {str(e)}"}]
        
    errors = []
    # Case-insensitive column matching
    col_map = {c.lower(): c for c in df.columns}
    missing_cols = []
    for req in REQUIRED_CSV_COLUMNS:
        if req.lower() not in col_map:
            missing_cols.append(req)
            
    if missing_cols:
        return pd.DataFrame(), [{"row": 0, "error": f"Missing required columns: {', '.join(missing_cols)}"}]
        
    # Standardize column names
    standard_df = pd.DataFrame()
    for req in REQUIRED_CSV_COLUMNS:
        orig = col_map[req.lower()]
        standard_df[req] = df[orig]
        
    if "customerid" in col_map:
        standard_df["CustomerId"] = df[col_map["customerid"]]
    if "surname" in col_map:
        standard_df["Surname"] = df[col_map["surname"]]
        
    # Row level validations
    valid_indices = []
    for idx, row in standard_df.iterrows():
        row_err = []
        try:
            cs = int(row["CreditScore"])
            if not (300 <= cs <= 900):
                row_err.append("CreditScore must be between 300 and 900")
        except Exception:
            row_err.append("CreditScore must be integer")
            
        try:
            age = int(row["Age"])
            if not (18 <= age <= 100):
                row_err.append("Age must be between 18 and 100")
        except Exception:
            row_err.append("Age must be integer")
            
        try:
            bal = float(row["Balance"])
            if bal < 0:
                row_err.append("Balance cannot be negative")
        except Exception:
            row_err.append("Balance must be numeric")
            
        if row_err:
            errors.append({"row": idx + 1, "error": "; ".join(row_err)})
        else:
            valid_indices.append(idx)
            
    clean_df = standard_df.loc[valid_indices].reset_index(drop=True)
    return clean_df, errors

def process_batch_job(job_id: str, csv_content: str, db_factory):
    """
    Background worker function for batch scoring.
    """
    db: Session = db_factory()
    try:
        job = db.query(BatchJob).filter(BatchJob.id == job_id).first()
        if not job:
            return
            
        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        db.commit()
        
        clean_df, errors = validate_csv_content(csv_content)
        total_rows = len(clean_df) + len(errors)
        job.total_rows = total_rows
        job.failed_rows = len(errors)
        
        if len(clean_df) == 0:
            job.status = "failed"
            job.error_report = {"summary": "All rows failed validation", "details": errors[:50]}
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            return
            
        runtime = get_runtime()
        bundle = runtime.bundle
        threshold = float(bundle["threshold"])
        
        # Batch inference in chunks
        chunk_size = 500
        scored_records = []
        
        for start_idx in range(0, len(clean_df), chunk_size):
            chunk = clean_df.iloc[start_idx : start_idx + chunk_size].copy()
            chunk_feat = engineer_features(chunk)
            X_trans = bundle["preprocessor"].transform(chunk_feat)
            probs = bundle["model"].predict_proba(X_trans)[:, 1]
            
            for i, p in enumerate(probs):
                row = chunk.iloc[i]
                p_val = float(round(p, 4))
                tier = calculate_risk_tier(p_val)
                rev = calculate_revenue_at_risk(
                    p_val, float(row["Balance"]), float(row["EstimatedSalary"]), int(row["NumOfProducts"])
                )
                rec = {
                    "CustomerId": row.get("CustomerId", f"TEMP_{start_idx+i+1}"),
                    "Surname": row.get("Surname", "Unknown"),
                    "CreditScore": row["CreditScore"],
                    "Geography": row["Geography"],
                    "Gender": row["Gender"],
                    "Age": row["Age"],
                    "Tenure": row["Tenure"],
                    "Balance": row["Balance"],
                    "NumOfProducts": row["NumOfProducts"],
                    "HasCrCard": row["HasCrCard"],
                    "IsActiveMember": row["IsActiveMember"],
                    "EstimatedSalary": row["EstimatedSalary"],
                    "ChurnProbability": p_val,
                    "RiskTier": tier,
                    "PredictedChurn": int(p_val >= threshold),
                    "RevenueAtRisk": rev
                }
                scored_records.append(rec)
                
            job.processed_rows = len(scored_records)
            db.commit()
            
        # Save output CSV to disk
        out_dir = os.path.join("data", "processed", "batch_results")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"batch_{job_id}.csv")
        
        scored_df = pd.DataFrame(scored_records)
        scored_df.to_csv(out_path, index=False)
        
        job.result_path = out_path
        job.status = "completed"
        job.error_report = {"errors": errors[:50], "total_errors": len(errors)} if errors else None
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        
    except Exception as e:
        job = db.query(BatchJob).filter(BatchJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_report = {"exception": str(e)}
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()
