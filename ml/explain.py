import numpy as np
import pandas as pd
import shap
from typing import Dict, Any, List, Tuple
from ml.features import engineer_features

def get_friendly_feature_name(col_name: str) -> str:
    name_map = {
        "CreditScore": "Credit Score",
        "Age": "Age",
        "Tenure": "Tenure",
        "Balance": "Account Balance",
        "NumOfProducts": "Number of Products",
        "HasCrCard": "Credit Card Holder",
        "IsActiveMember": "Activity Status",
        "EstimatedSalary": "Estimated Salary",
        "balance_salary_ratio": "Balance-to-Salary Ratio",
        "tenure_age_ratio": "Tenure-to-Age Ratio",
        "products_per_tenure": "Products per Tenure",
        "is_zero_balance": "Zero Balance Indicator",
        "engagement_score": "Engagement Score",
        "Geography_France": "Geography: France",
        "Geography_Germany": "Geography: Germany",
        "Geography_Spain": "Geography: Spain",
        "Gender_Female": "Gender: Female",
        "Gender_Male": "Gender: Male",
        "age_group_<30": "Age Under 30",
        "age_group_30-40": "Age 30-40",
        "age_group_40-50": "Age 40-50",
        "age_group_50-60": "Age 50-60",
        "age_group_60+": "Age 60+",
        "credit_band_Poor": "Poor Credit Band",
        "credit_band_Fair": "Fair Credit Band",
        "credit_band_Good": "Good Credit Band",
        "credit_band_Very Good": "Very Good Credit Band",
        "credit_band_Excellent": "Excellent Credit Band",
    }
    return name_map.get(col_name, col_name)

def generate_reason_text(raw_feature: str, val: Any, direction: str, shap_val: float) -> str:
    """
    Generate crisp, plain-English reason sentences based on TRD 4.5 templates.
    """
    dir_word = "raises" if direction == "increases" else "lowers"
    
    if "NumOfProducts" in raw_feature or raw_feature == "products_per_tenure":
        p = int(float(val)) if val is not None and str(val).replace('.','',1).isdigit() else 1
        if p >= 3:
            return f"Holds {p} products, a customer segment with unusually high churn"
        elif p == 2:
            return f"Holds 2 products, an optimal product bundle that lowers churn risk"
        else:
            return f"Holds only 1 product, indicating lower multi-product stickiness"
            
    if "IsActiveMember" in raw_feature:
        act = int(float(val)) if val is not None else 0
        if act == 0:
            return "Inactive member with lack of recent banking engagement"
        else:
            return "Active member status provides strong retention stability"
            
    if "Age" in raw_feature or "age_group" in raw_feature:
        try:
            a = int(float(val))
            if a >= 50:
                return f"Age {a} sits in the highest-attrition demographic band"
            elif a <= 32:
                return f"Age {a} belongs to younger, high-loyalty cohort"
            else:
                return f"Age {a} moderately {dir_word} churn probability"
        except Exception:
            return f"Age group ({val}) {dir_word} churn probability"
            
    if "Germany" in raw_feature or ("Geography" in raw_feature and str(val).lower() == "germany"):
        return "German customer segment exhibits nearly 2x higher churn than other markets"
        
    if "France" in raw_feature or ("Geography" in raw_feature and str(val).lower() == "france"):
        return "France market shows strong baseline brand retention"
        
    if "Balance" in raw_feature or "is_zero_balance" in raw_feature:
        try:
            b = float(val)
            if b == 0:
                return "Zero account balance signals dormant or secondary account status"
            elif b > 120000:
                return f"High balance (€{b:,.0f}) increases attrition risk due to competitor yield offers"
            else:
                return f"Account balance of €{b:,.0f} {dir_word} churn risk"
        except Exception:
            return f"Balance profile {dir_word} churn risk"
            
    if "balance_salary_ratio" in raw_feature:
        return f"High balance-to-salary ratio ({float(val):.2f}) indicates capital concentration"
        
    if "CreditScore" in raw_feature or "credit_band" in raw_feature:
        try:
            cs = int(float(val))
            if cs < 600:
                return f"Credit score of {cs} indicates financial stress or high rate sensitivity"
            elif cs >= 750:
                return f"Strong credit score ({cs}) reflects prime customer stability"
            else:
                return f"Credit score ({cs}) has neutral-to-positive impact on retention"
        except Exception:
            return f"Credit profile ({val}) {dir_word} churn risk"
            
    if "Tenure" in raw_feature or "tenure_age_ratio" in raw_feature:
        try:
            t = int(float(val))
            if t <= 2:
                return f"Short tenure ({t} yrs) means customer relationship is still vulnerable"
            else:
                return f"Established tenure ({t} yrs) supports long-term account loyalty"
        except Exception:
            pass
            
    return f"{get_friendly_feature_name(raw_feature)} ({val}) {dir_word} churn risk"

class ModelExplainer:
    """
    SHAP-based explainer wrapping an XGBoost / LightGBM model pipeline.
    """
    def __init__(self, clf, preprocessor):
        self.clf = clf
        self.preprocessor = preprocessor
        self.feature_names = list(preprocessor.get_feature_names_out())
        self.explainer = shap.TreeExplainer(self.clf)
        
    def explain_instance(self, raw_input_df: pd.DataFrame, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Explain a single customer row. Returns top_k drivers sorted by magnitude.
        """
        df_feat = engineer_features(raw_input_df)
        X_trans = self.preprocessor.transform(df_feat)
        
        # Calculate SHAP values
        shap_vals = self.explainer.shap_values(X_trans)
        
        # Handle 1D or 2D return from shap_values
        if isinstance(shap_vals, list):
            sv = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
        elif len(shap_vals.shape) == 2:
            sv = shap_vals[0]
        else:
            sv = shap_vals
            
        top_indices = np.argsort(-np.abs(sv))[:top_k]
        
        drivers = []
        for rank, idx in enumerate(top_indices, start=1):
            feat_name = self.feature_names[idx]
            shap_val = float(sv[idx])
            direction = "increases" if shap_val > 0 else "decreases"
            
            # Map back to original feature value if available
            orig_val = None
            if feat_name in df_feat.columns:
                orig_val = df_feat[feat_name].iloc[0]
            else:
                # One-hot encoded feature like Geography_Germany or age_group_40-50
                prefix = feat_name.split("_")[0]
                if prefix in df_feat.columns:
                    orig_val = df_feat[prefix].iloc[0]
                elif feat_name.startswith("age_group"):
                    orig_val = df_feat.get("Age", pd.Series([None])).iloc[0]
                elif feat_name.startswith("credit_band"):
                    orig_val = df_feat.get("CreditScore", pd.Series([None])).iloc[0]
                else:
                    orig_val = X_trans[0, idx]
                    
            reason_text = generate_reason_text(feat_name, orig_val, direction, shap_val)
            
            drivers.append({
                "rank": rank,
                "feature": feat_name,
                "friendly_name": get_friendly_feature_name(feat_name),
                "feature_value": str(orig_val) if orig_val is not None else "",
                "shap_value": round(shap_val, 4),
                "direction": direction,
                "reason_text": reason_text
            })
            
        return drivers

    def explain_global(self, X_sample: pd.DataFrame, max_features: int = 15) -> List[Dict[str, Any]]:
        """
        Compute mean |SHAP| across a sample for global feature importance.
        """
        df_feat = engineer_features(X_sample)
        X_trans = self.preprocessor.transform(df_feat)
        shap_vals = self.explainer.shap_values(X_trans)
        
        if isinstance(shap_vals, list):
            sv = shap_vals[1] if len(shap_vals) > 1 else shap_vals[0]
        else:
            sv = shap_vals
            
        mean_abs = np.mean(np.abs(sv), axis=0)
        top_idx = np.argsort(-mean_abs)[:max_features]
        
        global_importance = []
        for rank, idx in enumerate(top_idx, start=1):
            feat_name = self.feature_names[idx]
            importance = float(mean_abs[idx])
            global_importance.append({
                "rank": rank,
                "feature": feat_name,
                "friendly_name": get_friendly_feature_name(feat_name),
                "mean_abs_shap": round(importance, 4)
            })
        return global_importance
