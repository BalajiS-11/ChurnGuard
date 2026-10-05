# 01 · Product Requirements Document (PRD)

**Product:** ChurnGuard — Banking Customer Retention Intelligence Platform
**Version:** 1.0 · **Owner:** Product · **Status:** Approved for build

---

## 1. Vision & Problem

Acquiring a new banking customer costs 5–25x more than retaining one. Most banks find out a customer is leaving only *after* the account is closed. Existing tools are either raw data-science notebooks (unusable by business teams) or generic BI dashboards (no prediction, no action).

**ChurnGuard** closes the loop: **Predict → Explain → Act → Measure.**

> "Show me who is about to leave, why they are leaving, what I should do about it, and whether it worked."

## 2. Goals & Non-Goals

| Goals | Non-Goals (v1) |
|---|---|
| Predict churn probability per customer (AUC-ROC ≥ 0.84) | Real-time core-banking integration |
| Explain every prediction in plain language (SHAP) | Automated message sending (we generate lists + tasks) |
| Let relationship managers act on high-risk customers | Multi-tenant SaaS billing |
| Track model health and drift | Deep learning / LLM-based prediction |
| Look and feel like a premium fintech product | Native mobile apps (responsive web only) |

## 3. Target Users & Personas

| Persona | Role | Primary Need | Key Screens |
|---|---|---|---|
| **Priya – Retention Manager** | Owns churn KPIs | Portfolio view, campaign ROI | Dashboard, Campaigns, Reports |
| **Arjun – Relationship Manager (RM)** | Handles ~200 customers | "Who do I call today and what do I say?" | Watchlist, Customer 360, Tasks |
| **Dr. Meera – Data Scientist** | Owns model | Metrics, drift, retraining | Model Lab, Monitoring |
| **Sam – Admin / Compliance** | Governance | Users, audit trail, fairness | Admin, Audit Log |

## 4. Core User Stories

**Prediction & Insight**
- US-01: As an RM, I see a ranked list of my highest-risk customers so I can prioritise calls.
- US-02: As an RM, I open a customer and see churn probability, risk tier, and the top 5 reasons driving it.
- US-03: As a manager, I upload a CSV and score thousands of customers in one batch.
- US-04: As an RM, I run a **What-If simulator** (e.g., "if this customer adopts a 2nd product and becomes active, risk drops from 71% to 38%").

**Action**
- US-05: As an RM, I log a retention action (call, offer, fee waiver) and set follow-up.
- US-06: As a manager, I create a campaign targeting a segment (e.g., Germany, 40–55, balance > 100k, risk High) and track outcomes.
- US-07: System recommends a "next best action" per customer based on top risk drivers.

**Monitoring & Governance**
- US-08: As a data scientist, I compare model versions (AUC, PR-AUC, recall, confusion matrix, calibration).
- US-09: As a data scientist, I see data drift (PSI) and get alerted when it exceeds threshold.
- US-10: As compliance, I see an immutable audit log and a fairness report across gender and geography.

## 5. Functional Requirements

### 5.1 Must Have (P0)
| ID | Requirement |
|---|---|
| F-01 | Auth (JWT) with 4 roles: Admin, Manager, RM, Analyst; RBAC on every endpoint |
| F-02 | Executive Dashboard: KPI cards (Total customers, Churn rate, At-risk customers, Revenue at risk), trend chart, risk distribution, churn by geography/age/products |
| F-03 | Customer Directory with search, filters, sort, pagination, risk badges |
| F-04 | Customer 360 page: profile, churn gauge, SHAP waterfall, history of predictions, actions timeline |
| F-05 | Single Prediction form (manual input) returning probability, tier, top drivers, recommended actions |
| F-06 | Batch Prediction: CSV upload → validation → async scoring → results table → CSV download |
| F-07 | What-If Simulator with sliders and live re-scoring |
| F-08 | Retention Actions (CRUD) and Task list with status and due date |
| F-09 | Model Lab: metrics, ROC, PR curve, confusion matrix, feature importance, calibration |
| F-10 | Global explainability: SHAP summary, feature importance |
| F-11 | Audit log for logins, predictions, exports, and role changes |
| F-12 | Light/Dark theme, fully responsive |

### 5.2 Should Have (P1)
| ID | Requirement |
|---|---|
| F-13 | Campaigns with segment builder and outcome tracking (retained / lost / pending) |
| F-14 | Drift monitoring (PSI per feature) with alerts |
| F-15 | Fairness report (approval-rate parity across Gender, Geography) |
| F-16 | Export to CSV and PDF report |
| F-17 | Notification centre (new high-risk customers, drift alerts, task due) |
| F-18 | Model retraining trigger from UI (admin) with versioning and promote/rollback |

### 5.3 Nice to Have (P2)
Cohort/retention curves, customer similarity ("customers like this who stayed"), keyboard command palette (Ctrl+K), saved filter views.

## 6. Business Logic

**Risk tiers (calibrated probability):**
| Tier | Probability | Colour |
|---|---|---|
| Low | < 0.30 | Green |
| Medium | 0.30 – 0.60 | Amber |
| High | 0.60 – 0.80 | Orange |
| Critical | ≥ 0.80 | Red |

**Revenue at risk** = Σ (churn_probability × estimated annual value), where value = f(balance, products, salary) — configurable.

**Decision threshold:** chosen by minimising expected cost, where the cost of a missed churner (FN) is higher than a wasted retention offer (FP). Default cost ratio FN:FP = 5:1, editable by Admin.

## 7. Success Metrics

| Category | Metric | Target |
|---|---|---|
| Model | ROC-AUC / PR-AUC | ≥ 0.84 / ≥ 0.65 |
| Model | Recall at chosen threshold | ≥ 0.70 |
| Model | Calibration error (ECE) | ≤ 0.05 |
| Product | Time to score single customer | < 300 ms |
| Product | Batch 10,000 rows | < 30 s |
| UX | Task: find high-risk customer and view reasons | ≤ 3 clicks |
| UX | Lighthouse performance / accessibility | ≥ 90 / ≥ 95 |
| Business | Simulated retention uplift from targeting top decile | Reported in dashboard |

## 8. Data

- **Primary dataset:** Bank Customer Churn (`Churn_Modelling.csv`, 10,000 rows, ~20.4% churn).
- **Columns:** RowNumber, CustomerId, Surname, CreditScore, Geography (France/Spain/Germany), Gender, Age, Tenure, Balance, NumOfProducts, HasCrCard, IsActiveMember, EstimatedSalary, Exited.
- **Privacy:** Surname and CustomerId are treated as PII. Surname is never used as a model feature. UI masks PII for roles without permission.
- **Fairness note:** Gender and Geography are used with caution; fairness report is mandatory.

## 9. Assumptions, Risks, Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Class imbalance (≈ 20% churn) | Poor recall | Class weights / SMOTE, PR-AUC focus, threshold tuning |
| Model bias | Compliance issue | Fairness dashboard, no PII features |
| Black-box distrust | Low adoption | SHAP explanations in plain language |
| Drift | Silent degradation | PSI monitoring and alerts |
| Dataset is static | Limited realism | Seed script simulates monthly snapshots for trend charts |

## 10. Release Plan

| Phase | Scope |
|---|---|
| M1 | Data, ML pipeline, model API |
| M2 | Auth, Dashboard, Customer Directory, Customer 360 |
| M3 | Single/Batch prediction, What-If, Actions |
| M4 | Model Lab, Monitoring, Campaigns, Admin, polish, tests |

## 11. Acceptance Criteria (summary)

- Every P0 feature works end-to-end with seeded data and no console errors.
- Predictions match offline model output (tolerance 1e-6).
- Each prediction shows ≥ 3 human-readable reasons.
- RBAC verified: RM cannot access Admin or Model Lab retraining.
- UI passes responsive checks at 375, 768, 1280, 1920 px.
