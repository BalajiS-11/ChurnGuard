import time
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from ml.features import engineer_features
from ml.recommend import generate_recommendations
from backend.app.services.model_runtime import get_runtime
from backend.app.schemas.schemas import CustomerBase, PredictResponse, DriverResponse, RecommendationResponse, WhatIfResponse

def calculate_risk_tier(probability: float) -> str:
    """
    Map probability to risk tier:
    Low: < 0.30
    Medium: 0.30 - 0.60
    High: 0.60 - 0.80
    Critical: >= 0.80
    """
    if probability < 0.30:
        return "low"
    elif probability < 0.60:
        return "medium"
    elif probability < 0.80:
        return "high"
    else:
        return "critical"

def calculate_revenue_at_risk(probability: float, balance: float, estimated_salary: float, num_of_products: int) -> float:
    """
    Revenue at risk formula from PRD / TRD:
    probability * (balance * 0.02 + estimated_salary * 0.01 + num_of_products * 150)
    """
    annual_customer_value = (balance * 0.02) + (estimated_salary * 0.01) + (num_of_products * 150.0)
    return round(float(probability * annual_customer_value), 2)

def to_model_row(customer_data: Dict[str, Any]) -> pd.DataFrame:
    """
    Convert customer dict / schema to standard DataFrame with exact dataset column names.
    """
    row = {
        "CreditScore": int(customer_data.get("credit_score", customer_data.get("CreditScore", 650))),
        "Geography": str(customer_data.get("geography", customer_data.get("Geography", "France"))).capitalize(),
        "Gender": str(customer_data.get("gender", customer_data.get("Gender", "Female"))).capitalize(),
        "Age": int(customer_data.get("age", customer_data.get("Age", 40))),
        "Tenure": int(customer_data.get("tenure", customer_data.get("Tenure", 5))),
        "Balance": float(customer_data.get("balance", customer_data.get("Balance", 0.0))),
        "NumOfProducts": int(customer_data.get("num_of_products", customer_data.get("NumOfProducts", 1))),
        "HasCrCard": int(customer_data.get("has_cr_card", customer_data.get("HasCrCard", 1))),
        "IsActiveMember": int(customer_data.get("is_active_member", customer_data.get("IsActiveMember", 1))),
        "EstimatedSalary": float(customer_data.get("estimated_salary", customer_data.get("EstimatedSalary", 50000.0)))
    }
    return pd.DataFrame([row])

def predict_single(customer_data: Dict[str, Any], with_explain: bool = True) -> Dict[str, Any]:
    """
    Score a single customer, calculate drivers and recommendations.
    """
    t0 = time.time()
    runtime = get_runtime()
    bundle = runtime.bundle
    
    df_raw = to_model_row(customer_data)
    df_feat = engineer_features(df_raw)
    
    # Preprocess & Predict with calibrated model
    X_trans = bundle["preprocessor"].transform(df_feat)
    prob = float(bundle["model"].predict_proba(X_trans)[0, 1])
    
    tier = calculate_risk_tier(prob)
    threshold = float(bundle["threshold"])
    predicted_churn = bool(prob >= threshold)
    
    bal = float(df_raw["Balance"].iloc[0])
    sal = float(df_raw["EstimatedSalary"].iloc[0])
    prod = int(df_raw["NumOfProducts"].iloc[0])
    rev_risk = calculate_revenue_at_risk(prob, bal, sal, prod)
    
    drivers = []
    recommendations = []
    
    if with_explain:
        drivers = runtime.explainer.explain_instance(df_raw, top_k=5)
        recommendations = generate_recommendations(df_raw.iloc[0].to_dict(), drivers)
        
    dur_ms = int((time.time() - t0) * 1000)
    
    return {
        "probability": float(prob),
        "risk_tier": tier,
        "predicted_churn": predicted_churn,
        "threshold": round(threshold, 3),
        "model_version": runtime.model_version,
        "drivers": drivers,
        "recommendations": recommendations,
        "latency_ms": dur_ms,
        "revenue_at_risk": rev_risk
    }

def simulate_whatif(base_features: Dict[str, Any], modified_features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute baseline vs modified scenario with live delta.
    """
    base_res = predict_single(base_features, with_explain=False)
    mod_res = predict_single(modified_features, with_explain=True)
    
    delta_p = round(mod_res["probability"] - base_res["probability"], 4)
    delta_pts = round(delta_p * 100, 2)
    
    return {
        "baseline_probability": base_res["probability"],
        "baseline_risk_tier": base_res["risk_tier"],
        "scenario_probability": mod_res["probability"],
        "scenario_risk_tier": mod_res["risk_tier"],
        "delta_probability": delta_p,
        "delta_points": delta_pts,
        "drivers": mod_res["drivers"],
        "recommendations": mod_res["recommendations"]
    }
