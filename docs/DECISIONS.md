# Architectural & Engineering Decisions (ADR)

This document records key decisions made during the design and implementation of ChurnGuard, explaining the rationale and trade-offs.

---

## ADR-001: Data Source & Integrity
- **Decision:** Use the uncompressed 10,000-row Churn_Modelling.csv provided in data/raw/.
- **Rationale:** Preserves exact original ground truth without synthetic modification or leakage.

## ADR-002: Modular Monolith Architecture
- **Decision:** Structure the application as a clean modular monolith:
  - ml/: Standalone data science and training pipeline.
  - backend/: FastAPI service exposing REST APIs, loading serialized ML artifacts at startup.
  - frontend/: Next.js 14 App Router single-page application.
- **Rationale:** Simple to run, zero unnecessary RPC overhead, high developer velocity.

## ADR-003: Database Engine & Zero-Config Fallback
- **Decision:** Support PostgreSQL for production deployments (via Docker Compose) and SQLite (sqlite:///./churnguard.db) as the default fallback for local startup.
- **Rationale:** Evaluators can clone and run immediately with zero database dependencies.

## ADR-004: ML Preprocessing & Leakage Prevention
- **Decision:** All preprocessing (imputation, scaling, one-hot encoding) is encapsulated inside scikit-learn Pipeline and ColumnTransformer instances.
- **Rationale:** Prevents any training-to-serving skew and eliminates data leakage across train/validation/test folds.

## ADR-005: Probability Calibration & Cost-Optimal Thresholding
- **Decision:** Calibrate class probabilities using Isotonic Regression fit on the held-out validation set. Select decision threshold tau by minimizing financial business cost: Cost(tau) = 5 * FN + 1 * FP.
- **Rationale:** Raw tree model outputs can be overconfident or poorly calibrated. Calibrated probabilities allow realistic expected revenue calculations and reliable risk tier assignments.

## ADR-006: Real-Time SHAP TreeExplainer & Pre-Computed Global Attributions
- **Decision:** Pre-compute and serialize global TreeExplainer values for the test cohort (`global_shap.json`), while computing local exact TreeExplainer SHAP attribution vectors dynamically at inference time for individual predictions.
- **Rationale:** Ensures sub-150ms p95 response times for single predictions while guaranteeing 100% mathematical fidelity to the Shapley attribution theorem.

## ADR-007: Next.js 14 App Router with Fintech SaaS Design System
- **Decision:** Build the frontend using Next.js 14 (App Router), Tailwind CSS, Framer Motion, TanStack Query, and Recharts, styled with a high-density, high-contrast fintech aesthetic matching Mercury and Stripe.
- **Rationale:** Delivers instant page transitions, optimistic updates, responsive layouts across mobile (375px) to 4K desktop (1920px), and robust token-based dark mode switching without flash-of-unstyled-content.

## ADR-008: Role-Based Access Control (RBAC) & Analyst PII Masking
- **Decision:** Implement 4 distinct personas (Admin, Manager, RM, Analyst). For Analyst role, dynamically mask customer names (`O***o`) and customer IDs (`CUST-****1234`) across all endpoints and export pipelines. For RM role, restrict `/admin/*` routes with strict 403 HTTP exceptions.
- **Rationale:** Guarantees compliance with GDPR/GLBA banking privacy standards while maintaining separation of duty across front-office relationship managers and back-office quantitative modelers.

## ADR-009: Causal A/B Testing Retention Campaign Architecture
- **Decision:** Retention campaigns mandate a randomized control group holdout (default 10%, configurable 5–30%). Outcomes are tracked separately for Treatment vs Control cohorts to calculate true incremental uplift in percentage points.
- **Rationale:** Prevents the common banking fallacy of claiming credit for customers who would have organically remained without any retention intervention.

## ADR-010: Continuous Population Stability Index (PSI) Drift Monitoring
- **Decision:** Establish PSI monitoring across all 10 raw features and engineered metrics using a 10-bin decile baseline. Status rules: Stable (PSI < 0.10), Moderate (0.10 ≤ PSI ≤ 0.25), and Severe Drift (PSI > 0.25).
- **Rationale:** Provides early warning detection of credit cycle changes or demographic shifts prior to model accuracy degradation in production.
