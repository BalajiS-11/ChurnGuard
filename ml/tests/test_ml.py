import pytest
import numpy as np
import pandas as pd
import joblib
from ml.config import ARTIFACTS_DIR, DATA_PATH, ALL_FEATURES
from ml.features import engineer_features
from ml.explain import ModelExplainer
from ml.recommend import generate_recommendations
from ml.drift import calculate_psi

@pytest.fixture(scope="module")
def bundle():
    model_path = ARTIFACTS_DIR / "model_v1.joblib"
    assert model_path.exists(), f"Model artifact not found at {model_path}. Run ml/train.py first."
    return joblib.load(model_path)

@pytest.fixture(scope="module")
def sample_customer():
    return pd.DataFrame([{
        "CreditScore": 619,
        "Geography": "France",
        "Gender": "Female",
        "Age": 42,
        "Tenure": 2,
        "Balance": 0.0,
        "NumOfProducts": 1,
        "HasCrCard": 1,
        "IsActiveMember": 1,
        "EstimatedSalary": 101348.88
    }])

def test_no_data_leakage(bundle):
    """
    Ensure PII / ID columns (RowNumber, CustomerId, Surname) are NOT in model features.
    """
    forbidden = ["RowNumber", "CustomerId", "Surname", "row_number", "customer_id", "surname"]
    features = bundle["features"]
    transformed_features = bundle["transformed_features"]
    
    for f in forbidden:
        assert f not in features, f"Forbidden feature '{f}' found in model input features!"
        for tf in transformed_features:
            assert f not in tf.lower(), f"Forbidden identifier '{f}' found in transformed feature '{tf}'!"

def test_probability_bounds_and_calibration(bundle, sample_customer):
    """
    Verify model predictions output valid probabilities strictly in [0.0, 1.0].
    """
    model = bundle["model"]
    preprocessor = bundle["preprocessor"]
    
    df_feat = engineer_features(sample_customer)
    X_trans = preprocessor.transform(df_feat)
    probs = model.predict_proba(X_trans)[0]
    
    assert len(probs) == 2
    assert 0.0 <= probs[0] <= 1.0
    assert 0.0 <= probs[1] <= 1.0
    assert np.isclose(probs.sum(), 1.0, atol=1e-5)

def test_pipeline_handles_unseen_category(bundle):
    """
    Verify OneHotEncoder inside pipeline handles unseen category gracefully without error.
    """
    unseen_customer = pd.DataFrame([{
        "CreditScore": 650,
        "Geography": "Switzerland",  # Unseen geography
        "Gender": "NonBinary",       # Unseen gender
        "Age": 35,
        "Tenure": 5,
        "Balance": 50000.0,
        "NumOfProducts": 2,
        "HasCrCard": 1,
        "IsActiveMember": 1,
        "EstimatedSalary": 85000.0
    }])
    
    df_feat = engineer_features(unseen_customer)
    X_trans = bundle["preprocessor"].transform(df_feat)
    p = bundle["model"].predict_proba(X_trans)[0, 1]
    assert 0.0 <= p <= 1.0

def test_explain_returns_5_drivers(bundle, sample_customer):
    """
    Verify ModelExplainer returns top 5 structured drivers with all required attributes.
    """
    explainer = ModelExplainer(bundle["base_classifier"], bundle["preprocessor"])
    drivers = explainer.explain_instance(sample_customer, top_k=5)
    
    assert len(drivers) == 5
    for d in drivers:
        assert "rank" in d
        assert "feature" in d
        assert "friendly_name" in d
        assert "shap_value" in d
        assert "direction" in d
        assert d["direction"] in ["increases", "decreases"]
        assert "reason_text" in d
        assert len(d["reason_text"]) > 5

def test_recommendation_engine(sample_customer):
    """
    Verify recommendation engine produces actionable Next-Best-Actions.
    """
    high_risk_features = {
        "NumOfProducts": 3,
        "IsActiveMember": 0,
        "Balance": 120000.0,
        "Age": 52,
        "Geography": "Germany"
    }
    recs = generate_recommendations(high_risk_features, [])
    assert len(recs) >= 1
    for r in recs:
        assert "title" in r
        assert "priority" in r
        assert "action_type" in r
        assert "description" in r

def test_psi_calculation():
    """
    Verify Population Stability Index (PSI) calculation on synthetic baseline vs shifted.
    """
    np.random.seed(42)
    baseline = np.random.normal(0, 1, 1000)
    target_identical = np.random.normal(0, 1, 1000)
    target_shifted = np.random.normal(2, 1, 1000)
    
    psi_low = calculate_psi(baseline, target_identical)
    psi_high = calculate_psi(baseline, target_shifted)
    
    assert psi_low < 0.10, f"Expected low PSI for identical distribution, got {psi_low}"
    assert psi_high > 0.25, f"Expected alert PSI for shifted distribution, got {psi_high}"
