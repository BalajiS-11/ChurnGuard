import pytest
import time
import io
import pandas as pd
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.model_runtime import get_runtime
from ml.config import DATA_PATH

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    resp = client.post("/api/v1/auth/login", json={"email": "admin@churnguard.io", "password": "Admin@123"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def rm_token():
    resp = client.post("/api/v1/auth/login", json={"email": "rm@churnguard.io", "password": "Rm@12345"})
    assert resp.status_code == 200, f"RM login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def analyst_token():
    resp = client.post("/api/v1/auth/login", json={"email": "analyst@churnguard.io", "password": "Analyst@123"})
    assert resp.status_code == 200, f"Analyst login failed: {resp.text}"
    return resp.json()["access_token"]

def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert "version" in data

def test_auth_login_invalid():
    resp = client.post("/api/v1/auth/login", json={"email": "admin@churnguard.io", "password": "WrongPassword"})
    assert resp.status_code == 401

def test_rbac_admin_vs_rm(admin_token, rm_token):
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_rm = {"Authorization": f"Bearer {rm_token}"}
    
    # Admin accesses /admin/users -> 200
    r_admin = client.get("/api/v1/admin/users", headers=headers_admin)
    assert r_admin.status_code == 200
    
    # RM accesses /admin/users -> 403 Forbidden
    r_rm = client.get("/api/v1/admin/users", headers=headers_rm)
    assert r_rm.status_code == 403

def test_dashboard_summary(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_customers" in data
    assert "churn_rate" in data
    assert "at_risk_count" in data
    assert "revenue_at_risk" in data
    assert data["total_customers"] > 0

def test_analyst_pii_masking(admin_token, analyst_token):
    # Fetch customers with admin
    r_admin = client.get("/api/v1/customers?page=1&page_size=5", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_admin.status_code == 200
    admin_items = r_admin.json()["items"]
    assert len(admin_items) > 0
    # Admin sees unmasked surname
    assert "***" not in admin_items[0]["surname"]
    
    # Fetch customers with analyst
    r_analyst = client.get("/api/v1/customers?page=1&page_size=5", headers={"Authorization": f"Bearer {analyst_token}"})
    assert r_analyst.status_code == 200
    analyst_items = r_analyst.json()["items"]
    # Analyst sees masked surname
    assert "***" in analyst_items[0]["surname"] or analyst_items[0]["surname"] == "***"

def test_prediction_parity_with_offline_model(admin_token):
    """
    Verify API prediction matches offline model within 1e-6 tolerance.
    """
    runtime = get_runtime()
    sample = {
        "credit_score": 619,
        "geography": "France",
        "gender": "Female",
        "age": 42,
        "tenure": 2,
        "balance": 0.0,
        "num_of_products": 1,
        "has_cr_card": 1,
        "is_active_member": 1,
        "estimated_salary": 101348.88
    }
    
    # API score
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.post("/api/v1/predict", json=sample, headers=headers)
    assert resp.status_code == 200
    api_prob = resp.json()["probability"]
    
    # Offline score
    from ml.features import engineer_features
    df_raw = pd.DataFrame([{
        "CreditScore": 619, "Geography": "France", "Gender": "Female", "Age": 42,
        "Tenure": 2, "Balance": 0.0, "NumOfProducts": 1, "HasCrCard": 1,
        "IsActiveMember": 1, "EstimatedSalary": 101348.88
    }])
    df_feat = engineer_features(df_raw)
    X_trans = runtime.bundle["preprocessor"].transform(df_feat)
    offline_prob = float(runtime.bundle["model"].predict_proba(X_trans)[0, 1])
    
    assert abs(api_prob - offline_prob) < 1e-6, f"Parity mismatch: API={api_prob}, Offline={offline_prob}"

def test_prediction_latency_p95(admin_token):
    """
    Measure single prediction latency: target p95 < 300 ms.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    sample = {
        "credit_score": 650, "geography": "Germany", "gender": "Female", "age": 48,
        "tenure": 3, "balance": 120000.0, "num_of_products": 2, "has_cr_card": 1,
        "is_active_member": 0, "estimated_salary": 85000.0
    }
    
    latencies = []
    for _ in range(15):
        t0 = time.time()
        resp = client.post("/api/v1/predict", json=sample, headers=headers)
        assert resp.status_code == 200
        latencies.append((time.time() - t0) * 1000)
        
    p95 = sorted(latencies)[int(len(latencies) * 0.95)]
    print(f"\nMeasured p95 single prediction latency: {p95:.2f} ms")
    assert p95 < 300.0, f"Latency p95 exceeded 300 ms: {p95:.2f} ms"

def test_whatif_simulator(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    req = {
        "base_features": {
            "credit_score": 600, "geography": "Germany", "gender": "Male", "age": 52,
            "tenure": 2, "balance": 110000.0, "num_of_products": 1, "has_cr_card": 1,
            "is_active_member": 0, "estimated_salary": 75000.0
        },
        "modified_features": {
            "credit_score": 600, "geography": "Germany", "gender": "Male", "age": 52,
            "tenure": 2, "balance": 110000.0, "num_of_products": 2, "has_cr_card": 1,
            "is_active_member": 1, "estimated_salary": 75000.0
        }
    }
    resp = client.post("/api/v1/predict/whatif", json=req, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "delta_probability" in data
    # Modifying from inactive + 1 product to active + 2 products should reduce risk
    assert data["delta_probability"] < 0, f"Expected risk to drop, got {data['delta_probability']}"

def test_batch_prediction_validation_and_rejection(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Invalid file type
    resp_txt = client.post(
        "/api/v1/predict/batch",
        files={"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")},
        headers=headers
    )
    assert resp_txt.status_code == 400
    
    # 2. Valid CSV upload
    csv_data = """CreditScore,Geography,Gender,Age,Tenure,Balance,NumOfProducts,HasCrCard,IsActiveMember,EstimatedSalary
619,France,Female,42,2,0.0,1,1,1,101348.88
608,Spain,Female,41,1,83807.86,1,0,1,112542.58
"""
    resp_csv = client.post(
        "/api/v1/predict/batch",
        files={"file": ("sample.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        headers=headers
    )
    assert resp_csv.status_code == 200
    job_id = resp_csv.json()["id"]
    assert job_id is not None
