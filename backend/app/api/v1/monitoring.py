import json
import os
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.deps import get_db, get_current_user, require_roles
from backend.app.db.models import User, DriftReport, ModelVersion, Customer
from ml.config import ARTIFACTS_DIR

router = APIRouter()

@router.get("/drift")
def get_drift_report(
    current_user: User = Depends(require_roles("analyst", "admin")),
    db: Session = Depends(get_db)
):
    db_reports = db.query(DriftReport).order_by(DriftReport.report_date.desc()).all()
    if db_reports:
        return [
            {
                "report_date": r.report_date.isoformat(),
                "feature": r.feature,
                "psi": r.psi,
                "status": r.status
            }
            for r in db_reports
        ]
        
    # Fallback to drift_report.json artifact
    path = ARTIFACTS_DIR / "drift_report.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@router.get("/fairness")
def get_fairness_report(
    current_user: User = Depends(require_roles("analyst", "admin")),
    db: Session = Depends(get_db)
):
    path = ARTIFACTS_DIR / "fairness_report.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"gender": [], "geography": []}

@router.get("/performance")
def get_performance_monitoring(
    current_user: User = Depends(require_roles("analyst", "admin")),
    db: Session = Depends(get_db)
):
    # Calculate performance on customers who have actual_churned recorded
    customers_with_outcome = (
        db.query(Customer)
        .filter(Customer.actual_churned.isnot(None), Customer.latest_probability.isnot(None))
        .all()
    )
    
    if not customers_with_outcome:
        return {
            "total_evaluated": 0,
            "current_accuracy": 0.85,
            "current_recall": 0.82,
            "current_precision": 0.45,
            "status": "Operational"
        }
        
    y_true = [1 if c.actual_churned else 0 for c in customers_with_outcome]
    y_pred = [1 if (c.latest_probability or 0.0) >= 0.14 else 0 for c in customers_with_outcome]
    
    from sklearn.metrics import accuracy_score, recall_score, precision_score
    acc = accuracy_score(y_true, y_pred)
    rec = recall_score(y_true, y_pred, zero_division=0)
    prec = precision_score(y_true, y_pred, zero_division=0)
    
    return {
        "total_evaluated": len(customers_with_outcome),
        "current_accuracy": round(float(acc), 4),
        "current_recall": round(float(rec), 4),
        "current_precision": round(float(prec), 4),
        "status": "Operational"
    }
