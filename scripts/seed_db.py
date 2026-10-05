import os
import sys
import time
import math
import random
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.db.session import engine, Base, SessionLocal
from backend.app.db.models import (
    User,
    Customer,
    CustomerSnapshot,
    ModelVersion,
    ModelMetric,
    Prediction,
    PredictionDriver,
    RetentionAction,
    Campaign,
    CampaignCustomer,
    DriftReport,
    Notification,
    SystemSetting
)
from backend.app.core.security import get_password_hash
from backend.app.services.model_runtime import get_runtime
from backend.app.services.prediction_service import calculate_risk_tier
from ml.config import DATA_PATH, ALL_FEATURES
from ml.features import engineer_features

def seed_database():
    print("=" * 70)
    print("CHURNGUARD: DATABASE SEEDING ENGINE")
    print("=" * 70)
    
    # 1. Reset / Ensure tables
    print("[1/7] Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clear existing records
    print("Clearing previous records for idempotent fresh seed...")
    for model in [
        CampaignCustomer, Campaign, RetentionAction, PredictionDriver,
        Prediction, CustomerSnapshot, Customer, DriftReport, Notification,
        ModelMetric, ModelVersion, SystemSetting, User
    ]:
        db.query(model).delete()
    db.commit()
    
    # 2. Seed Users
    print("\n[2/7] Seeding Demo Users...")
    demo_users = [
        {
            "email": "admin@churnguard.io",
            "full_name": "Samira Khan (Admin)",
            "role": "admin",
            "password": "Admin@123",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        },
        {
            "email": "manager@churnguard.io",
            "full_name": "Priya Sharma (Retention Lead)",
            "role": "manager",
            "password": "Manager@123",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
        },
        {
            "email": "rm@churnguard.io",
            "full_name": "Arjun Mehta (Senior RM)",
            "role": "rm",
            "password": "Rm@12345",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        },
        {
            "email": "analyst@churnguard.io",
            "full_name": "Dr. Meera Patel (Data Scientist)",
            "role": "analyst",
            "password": "Analyst@123",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        },
        {
            "email": "vikram@churnguard.io",
            "full_name": "Vikram Verma (Associate RM)",
            "role": "rm",
            "password": "Rm@12345",
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
        }
    ]
    
    user_map = {}
    rm_users = []
    for u in demo_users:
        user_obj = User(
            email=u["email"],
            full_name=u["full_name"],
            password_hash=get_password_hash(u["password"]),
            role=u["role"],
            is_active=True,
            avatar_url=u["avatar_url"],
            preferences={"theme": "system"}
        )
        db.add(user_obj)
        db.flush()
        user_map[u["role"]] = user_obj
        if u["role"] == "rm":
            rm_users.append(user_obj)
            
    print(f"Created {len(demo_users)} users.")
    
    # 3. Seed Active Model Version
    print("\n[3/7] Registering Production Model Version in Registry...")
    runtime = get_runtime()
    bundle = runtime.bundle
    
    model_version = ModelVersion(
        version="v1.0.0",
        algorithm="XGBoost (Calibrated Isotonic)",
        status="active",
        threshold=float(bundle["threshold"]),
        artifact_path=str(bundle.get("artifact_path", "ml/artifacts/model_v1.joblib")),
        feature_list=bundle["features"],
        hyperparameters=bundle.get("hyperparameters", {}),
        training_rows=7000,
        data_hash=bundle.get("data_hash", "3996cd1fa372e0db0cd9c0ebac35bbd4e8e3c65fb942bb010c826e7b1eeef0a0"),
        trained_by=user_map["analyst"].id,
        notes="Production baseline model calibrated with isotonic regression; threshold tuned on cost curve."
    )
    db.add(model_version)
    db.flush()
    
    # Seed Model Metrics
    metric_record = ModelMetric(
        model_id=model_version.id,
        split="test",
        roc_auc=0.8592,
        pr_auc=0.6635,
        recall=0.8268,
        precision=0.4231,
        f1=0.5597,
        accuracy=0.7347,
        brier_score=0.1066,
        ece=0.0169,
        confusion={"tn": 849, "fp": 345, "fn": 53, "tp": 253}
    )
    db.add(metric_record)
    
    # 4. Import & Score All 10,000 Customers with the Real Model
    print(f"\n[4/7] Importing & Scoring all 10,000 customers from {DATA_PATH}...")
    raw_df = pd.read_csv(DATA_PATH)
    total_rows = len(raw_df)
    
    df_feat = engineer_features(raw_df)
    X_trans = bundle["preprocessor"].transform(df_feat)
    probabilities = bundle["model"].predict_proba(X_trans)[:, 1]
    threshold = float(bundle["threshold"])
    
    customers_to_add = []
    print("Batch inserting customers with calibrated scores...")
    for i in range(total_rows):
        row = raw_df.iloc[i]
        prob = float(round(probabilities[i], 4))
        tier = calculate_risk_tier(prob)
        assigned_rm = rm_users[i % len(rm_users)]
        
        cust = Customer(
            external_id=int(row["CustomerId"]),
            surname=str(row["Surname"]),
            credit_score=int(row["CreditScore"]),
            geography=str(row["Geography"]).capitalize(),
            gender=str(row["Gender"]).capitalize(),
            age=int(row["Age"]),
            tenure=int(row["Tenure"]),
            balance=float(row["Balance"]),
            num_of_products=int(row["NumOfProducts"]),
            has_cr_card=bool(row["HasCrCard"]),
            is_active_member=bool(row["IsActiveMember"]),
            estimated_salary=float(row["EstimatedSalary"]),
            actual_churned=bool(row["Exited"]),
            assigned_rm_id=assigned_rm.id,
            latest_probability=prob,
            latest_risk_tier=tier,
            latest_scored_at=datetime.now(timezone.utc)
        )
        customers_to_add.append(cust)
        
    db.bulk_save_objects(customers_to_add)
    db.commit()
    print("10,000 customers saved.")
    
    # Retrieve top 500 at-risk customers for SHAP drivers
    top_risk_customers = (
        db.query(Customer)
        .order_by(Customer.latest_probability.desc())
        .limit(500)
        .all()
    )
    print(f"\nGenerating SHAP drivers for top {len(top_risk_customers)} at-risk customers...")
    for cust in top_risk_customers[:500]:
        c_df = pd.DataFrame([{
            "CreditScore": cust.credit_score,
            "Geography": cust.geography,
            "Gender": cust.gender,
            "Age": cust.age,
            "Tenure": cust.tenure,
            "Balance": cust.balance,
            "NumOfProducts": cust.num_of_products,
            "HasCrCard": int(cust.has_cr_card),
            "IsActiveMember": int(cust.is_active_member),
            "EstimatedSalary": cust.estimated_salary
        }])
        
        # Create non-whatif prediction record
        pred = Prediction(
            customer_id=cust.id,
            model_id=model_version.id,
            requested_by=cust.assigned_rm_id,
            input_features=c_df.iloc[0].to_dict(),
            probability=cust.latest_probability,
            risk_tier=cust.latest_risk_tier,
            predicted_churn=bool(cust.latest_probability >= threshold),
            is_whatif=False,
            latency_ms=15
        )
        db.add(pred)
        db.flush()
        
        drivers = runtime.explainer.explain_instance(c_df, top_k=5)
        for d in drivers:
            dr_obj = PredictionDriver(
                prediction_id=pred.id,
                rank=d["rank"],
                feature=d["feature"],
                feature_value=str(d.get("feature_value", "")),
                shap_value=d["shap_value"],
                direction=d["direction"],
                reason_text=d["reason_text"]
            )
            db.add(dr_obj)
            
    db.commit()
    print("SHAP drivers successfully stored for high-risk accounts.")
    
    # 5. Simulate 12 Months of Monthly Snapshot History
    print("\n[5/7] Simulating 12 Months of Snapshot History (for trend analytics & drift)...")
    today = date.today()
    sample_customers = db.query(Customer).limit(2000).all()
    
    # Baseline probabilities for each customer
    for month_offset in range(12, 0, -1):
        snapshot_d = today.replace(day=1) - timedelta(days=month_offset * 30)
        # Seasonal drift simulation: winter months had slightly higher churn
        drift_factor = 1.0 + (0.05 * math.sin(month_offset))
        
        snapshots = []
        for c in sample_customers:
            simulated_p = min(1.0, max(0.0, (c.latest_probability or 0.2) * drift_factor + (random.uniform(-0.03, 0.03))))
            snapshots.append(
                CustomerSnapshot(
                    customer_id=c.id,
                    snapshot_date=snapshot_d,
                    features={
                        "credit_score": c.credit_score,
                        "balance": c.balance,
                        "products": c.num_of_products,
                        "active": c.is_active_member
                    },
                    probability=round(simulated_p, 4)
                )
            )
        db.bulk_save_objects(snapshots)
    db.commit()
    print("Simulated 12 monthly portfolio snapshots.")
    
    # 6. Seed Retention Actions & Campaigns
    print("\n[6/7] Seeding Retention Actions, Campaigns, and Notifications...")
    action_types = ["call", "meeting", "offer", "product_review", "fee_waiver"]
    action_titles = [
        "High-balance account retention call",
        "Multi-product fee rationalization review",
        "German market preferential rate consultation",
        "Digital app adoption & cashback activation",
        "Quarterly proactive relationship review"
    ]
    
    for i, cust in enumerate(top_risk_customers[:35]):
        act_status = "todo" if i < 15 else ("in_progress" if i < 25 else "done")
        act_outcome = "pending" if act_status != "done" else ("retained" if i % 2 == 0 else "churned")
        due = today + timedelta(days=(i % 10) + 1)
        
        action = RetentionAction(
            customer_id=cust.id,
            created_by=user_map["manager"].id,
            assignee_id=cust.assigned_rm_id,
            type=action_types[i % len(action_types)],
            title=action_titles[i % len(action_titles)],
            notes=f"Contacted customer regarding recent balance drop. Priority level: {cust.latest_risk_tier.upper()}.",
            status=act_status,
            outcome=act_outcome,
            due_date=due,
            completed_at=datetime.now(timezone.utc) if act_status == "done" else None
        )
        db.add(action)
        
    # Campaigns
    c1 = Campaign(
        name="Germany High-Balance Retention Sprint",
        description="Targeting premium customers in Germany with balance > €100,000 facing neo-bank competition.",
        owner_id=user_map["manager"].id,
        status="active",
        segment_rules=[
            {"field": "geography", "op": "eq", "value": "Germany"},
            {"field": "balance", "op": "gte", "value": 100000}
        ],
        offer="Preferred 3.85% APY fixed savings tier + waiver of international wire charges",
        control_pct=10,
        start_date=today - timedelta(days=15),
        end_date=today + timedelta(days=45),
        audience_size=1250,
        projected_revenue_at_risk=2850000.0
    )
    db.add(c1)
    db.flush()
    
    # Link customers to campaign with control group
    germany_custs = (
        db.query(Customer)
        .filter(Customer.geography == "Germany", Customer.balance >= 100000)
        .limit(100)
        .all()
    )
    for idx, gc in enumerate(germany_custs):
        is_ctrl = (idx % 10 == 0)
        out = "retained" if idx % 3 == 0 else ("churned" if idx % 7 == 0 else "pending")
        db.add(CampaignCustomer(
            campaign_id=c1.id,
            customer_id=gc.id,
            is_control=is_ctrl,
            contacted_at=datetime.now(timezone.utc) - timedelta(days=5),
            outcome=out
        ))
        
    # Notifications
    notifications = [
        Notification(
            user_id=user_map["rm"].id,
            type="high_risk",
            title="5 New Critical-Risk Customers Detected",
            body="New batch inference flagged 5 customers in your portfolio with churn probability > 80%.",
            link="/watchlist",
            is_read=False
        ),
        Notification(
            user_id=user_map["rm"].id,
            type="task_due",
            title="Retention Action Due Today",
            body="Call scheduled with customer 15634602 regarding multi-product consolidation.",
            link="/watchlist",
            is_read=False
        ),
        Notification(
            user_id=user_map["analyst"].id,
            type="drift",
            title="Weekly Drift Check Passed",
            body="All 17 production features remain within PSI < 0.10 boundaries.",
            link="/monitoring",
            is_read=True
        ),
        Notification(
            user_id=user_map["manager"].id,
            type="campaign_milestone",
            title="Germany Campaign Reached 50% Contact Target",
            body="500 of 1,000 customers have been reached with 68% retention sentiment.",
            link="/campaigns",
            is_read=False
        )
    ]
    db.bulk_save_objects(notifications)
    
    # Drift Reports
    features_to_report = ["Age", "Balance", "NumOfProducts", "EstimatedSalary", "CreditScore", "Geography"]
    for f in features_to_report:
        db.add(DriftReport(
            model_id=model_version.id,
            report_date=today - timedelta(days=7),
            feature=f,
            psi=round(random.uniform(0.015, 0.045), 4),
            status="ok"
        ))
        
    # 7. System Settings
    print("\n[7/7] Seeding System Financial & Governance Settings...")
    settings = [
        SystemSetting(
            key="cost_fn",
            value={"cost": 5.0, "description": "Financial cost of a False Negative (missed churner)"},
            updated_by=user_map["admin"].id
        ),
        SystemSetting(
            key="cost_fp",
            value={"cost": 1.0, "description": "Financial cost of a False Positive (wasted offer)"},
            updated_by=user_map["admin"].id
        ),
        SystemSetting(
            key="tier_thresholds",
            value={"low": 0.30, "medium": 0.60, "high": 0.80},
            updated_by=user_map["admin"].id
        ),
        SystemSetting(
            key="revenue_formula",
            value={
                "balance_rate": 0.02,
                "salary_rate": 0.01,
                "product_annual_fee": 150.0,
                "description": "Annual customer gross value = Balance*2% + Salary*1% + Products*150"
            },
            updated_by=user_map["admin"].id
        )
    ]
    for s in settings:
        db.add(s)
        
    db.commit()
    db.close()
    print("\n" + "=" * 70)
    print("DATABASE SEEDING COMPLETE! ALL 10,000 CUSTOMERS READY WITH REAL SCORES.")
    print("=" * 70)

if __name__ == "__main__":
    seed_database()
