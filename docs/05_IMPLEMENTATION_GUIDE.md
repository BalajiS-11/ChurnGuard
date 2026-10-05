# 05 · Implementation Guide

Follow the phases in order. Each phase ends with a **Definition of Done (DoD)** that must pass before moving on.

---

## Phase 0 · Setup (30 min)

```bash
mkdir churnguard && cd churnguard
git init
mkdir -p docs data/raw ml/artifacts backend/app frontend scripts
# Put these docs in /docs and Churn_Modelling.csv in /data/raw
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install fastapi "uvicorn[standard]" sqlalchemy alembic pydantic-settings \
  "python-jose[cryptography]" argon2-cffi python-multipart pandas numpy scikit-learn \
  xgboost lightgbm imbalanced-learn shap optuna joblib matplotlib pytest httpx reportlab
pip freeze > backend/requirements.txt
npx create-next-app@latest frontend --typescript --tailwind --app --eslint
cd frontend && npx shadcn@latest init
npm i recharts @tanstack/react-query zustand react-hook-form zod @hookform/resolvers \
  framer-motion lucide-react next-themes axios date-fns
```

> Dataset: download "Bank Customer Churn Prediction" (`Churn_Modelling.csv`) from Kaggle. If unavailable, `scripts/generate_synthetic.py` must create 10,000 realistic rows with the same schema and ~20% churn using the logical relationships below (Germany, age 40–60, 3–4 products, inactive → higher churn).

**DoD:** `uvicorn` hello-world responds; `npm run dev` shows default page.

---

## Phase 1 · ML Pipeline

### 1.1 Feature engineering (`ml/features.py`)
```python
import numpy as np, pandas as pd

def engineer(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    d["balance_salary_ratio"] = d["Balance"] / (d["EstimatedSalary"] + 1)
    d["tenure_age_ratio"]     = d["Tenure"] / d["Age"]
    d["products_per_tenure"]  = d["NumOfProducts"] / (d["Tenure"] + 1)
    d["is_zero_balance"]      = (d["Balance"] == 0).astype(int)
    d["engagement_score"]     = d["IsActiveMember"] * 2 + d["HasCrCard"] + d["NumOfProducts"]
    d["age_group"] = pd.cut(d["Age"], [0, 30, 40, 50, 60, 120],
                            labels=["<30", "30-40", "40-50", "50-60", "60+"]).astype(str)
    return d

NUM = ["CreditScore","Age","Tenure","Balance","NumOfProducts","EstimatedSalary",
       "balance_salary_ratio","tenure_age_ratio","products_per_tenure",
       "engagement_score","HasCrCard","IsActiveMember","is_zero_balance"]
CAT = ["Geography","Gender","age_group"]
```

### 1.2 Training (`ml/train.py`), core skeleton
```python
import json, joblib, optuna, numpy as np, pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, average_precision_score
from xgboost import XGBClassifier
from features import engineer, NUM, CAT

df = engineer(pd.read_csv("data/raw/Churn_Modelling.csv"))
X, y = df[NUM + CAT], df["Exited"]
X_tmp, X_test, y_tmp, y_test = train_test_split(X, y, test_size=0.15, stratify=y, random_state=42)
X_tr, X_val, y_tr, y_val = train_test_split(X_tmp, y_tmp, test_size=0.1765, stratify=y_tmp, random_state=42)

pre = ColumnTransformer([("num", "passthrough", NUM),
                         ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)])
spw = (y_tr == 0).sum() / (y_tr == 1).sum()

def objective(trial):
    params = dict(
        n_estimators=trial.suggest_int("n_estimators", 200, 800),
        max_depth=trial.suggest_int("max_depth", 3, 8),
        learning_rate=trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
        subsample=trial.suggest_float("subsample", 0.6, 1.0),
        colsample_bytree=trial.suggest_float("colsample_bytree", 0.6, 1.0),
        min_child_weight=trial.suggest_int("min_child_weight", 1, 10),
        reg_lambda=trial.suggest_float("reg_lambda", 0.1, 10, log=True),
        scale_pos_weight=spw, eval_metric="aucpr", random_state=42, n_jobs=-1)
    pipe = Pipeline([("pre", pre), ("clf", XGBClassifier(**params))])
    cv = StratifiedKFold(5, shuffle=True, random_state=42)
    return cross_val_score(pipe, X_tr, y_tr, cv=cv, scoring="average_precision").mean()

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=50)

best = Pipeline([("pre", pre), ("clf", XGBClassifier(**study.best_params, scale_pos_weight=spw,
                                                    random_state=42, n_jobs=-1))]).fit(X_tr, y_tr)
# Calibrate on validation set
calib = CalibratedClassifierCV(best, method="isotonic", cv="prefit").fit(X_val, y_val)

# Cost-optimal threshold (FN cost 5, FP cost 1)
p_val = calib.predict_proba(X_val)[:, 1]
ths = np.linspace(0.05, 0.95, 91)
cost = [((p_val < t) & (y_val == 1)).sum() * 5 + ((p_val >= t) & (y_val == 0)).sum() for t in ths]
threshold = float(ths[int(np.argmin(cost))])

p_test = calib.predict_proba(X_test)[:, 1]
metrics = {"roc_auc": roc_auc_score(y_test, p_test), "pr_auc": average_precision_score(y_test, p_test)}
joblib.dump({"model": calib, "base": best, "threshold": threshold,
             "features": NUM + CAT}, "ml/artifacts/model_v1.joblib")
json.dump({"version": "v1.0.0", "threshold": threshold, **metrics}, open("ml/artifacts/metadata.json", "w"), indent=2)
```
Also compare Logistic Regression, Random Forest, and LightGBM with the same split and store a comparison table in `model_metrics` (this impresses evaluators).

### 1.3 Explainability (`ml/explain.py`)
```python
import shap, numpy as np
explainer = shap.TreeExplainer(bundle["base"].named_steps["clf"])
def explain_row(df_row):
    Xt = bundle["base"].named_steps["pre"].transform(df_row)
    sv = explainer.shap_values(Xt)[0]
    names = bundle["base"].named_steps["pre"].get_feature_names_out()
    top = np.argsort(-np.abs(sv))[:5]
    return [{"feature": names[i], "shap": float(sv[i])} for i in top]
```
Map one-hot names back to friendly labels and apply reason templates from the TRD §4.5.

**DoD:** `python ml/train.py` produces artifacts; test ROC-AUC ≥ 0.84; script prints comparison table; ROC/PR/confusion/calibration PNGs saved; `pytest ml/` passes (shape, no-leakage, probability range tests).

---

## Phase 2 · Backend

1. **Config & DB:** `pydantic-settings` reading `.env` (`DATABASE_URL`, `SECRET_KEY`, `MODEL_PATH`). SQLAlchemy models mirroring `04_DATABASE_SCHEMA.md`; run `alembic revision --autogenerate`.
2. **Security:** argon2 password hashing, JWT utilities, dependency `require_roles("admin","manager")`.
3. **Model loader:** load artifact once at startup (`lifespan` event) into `app.state.model`.
4. **Prediction service:**
```python
def predict_one(features: dict, with_explain=True):
    df = engineer(pd.DataFrame([to_model_columns(features)]))[NUM + CAT]
    p = float(bundle["model"].predict_proba(df)[0, 1])
    tier = tier_from_prob(p)
    drivers = explain_row(df) if with_explain else []
    return {"probability": p, "risk_tier": tier, "predicted_churn": p >= bundle["threshold"],
            "threshold": bundle["threshold"], "drivers": to_reasons(drivers, features),
            "recommendations": recommend(drivers, features)}
```
5. **Routers:** implement all endpoints in TRD §5. Use Pydantic schemas for request/response, pagination (`page`, `page_size`, `total`), consistent error envelope, request-ID middleware, rate limiting (slowapi).
6. **Batch:** accept CSV, validate with pydantic per row, process in chunks of 1000 using `BackgroundTasks`, update `batch_jobs.processed_rows`, write results CSV.
7. **Audit middleware/decorator** for login, predict, export, retrain, role change.
8. **Seed script** (`scripts/seed_db.py`): create users, import customers, assign RMs round-robin, score everyone, store top drivers for top-risk 500, generate 12 months of snapshots by perturbing features (documented as simulated), create sample actions, campaigns, drift reports, notifications.

**DoD:** `/docs` (Swagger) shows all endpoints; pytest suite ≥ 80% coverage; RBAC tests pass (RM gets 403 on `/admin/*`); single prediction p95 < 300 ms measured.

---

## Phase 3 · Frontend

### 3.1 Foundation
- Tailwind theme extended with design tokens (TRD/UI doc §2.1) as CSS variables in `globals.css`; `next-themes` for dark mode; Inter + JetBrains Mono via `next/font`.
- `lib/api.ts` axios instance with interceptors (attach JWT, refresh on 401).
- TanStack Query provider; `useAuth` store (Zustand); route guards via middleware and role-based nav config.
- App shell: `Sidebar`, `Topbar`, `CommandPalette`, `ThemeToggle`, `NotificationBell`.

### 3.2 Build order
1. Login → 2. Shell → 3. Dashboard → 4. Customers list → 5. Customer 360 (gauge, SHAP waterfall, what-if) → 6. Single predict → 7. Batch → 8. Watchlist/Actions → 9. Campaigns → 10. Insights → 11. Model Lab → 12. Monitoring → 13. Reports → 14. Admin/Settings.

### 3.3 Reusable components to build first
`KpiCard`, `RiskBadge`, `ProbabilityGauge` (SVG arc), `ShapWaterfall` (Recharts horizontal bar, diverging colours), `DataTable` (TanStack Table), `FilterChips`, `Stepper`, `EmptyState`, `Skeleton*`, `InsightCaption`.

### 3.4 What-If implementation
Debounce slider changes 300 ms → `POST /predict/whatif` with modified features → animate gauge from baseline to scenario, show Δ points and changed drivers.

**DoD:** all routes render with real API data; no hard-coded numbers; loading, empty, and error states exist on every page; Lighthouse a11y ≥ 95; dark and light verified.

---

## Phase 4 · Integration, QA, Polish

| Task | Detail |
|---|---|
| E2E tests (Playwright) | login → dashboard → open customer → what-if → log action; batch upload → download; RM blocked from admin; theme toggle persistence; campaign create |
| Data correctness | UI prediction == offline model output; KPI totals == SQL counts |
| Performance | Index review, API response compression, table virtualisation for long lists |
| Visual QA | Check 375 / 768 / 1280 / 1920 px; consistent spacing; no layout shift |
| Docs | README with screenshots, architecture diagram, model card (`docs/MODEL_CARD.md`), API docs |
| Demo | `docker-compose up` then `python scripts/seed_db.py`; 5-minute demo script below |

## Phase 5 · Docker

```yaml
# docker-compose.yml (essentials)
services:
  db:
    image: postgres:15
    environment: { POSTGRES_USER: churn, POSTGRES_PASSWORD: churn, POSTGRES_DB: churnguard }
    volumes: [pgdata:/var/lib/postgresql/data]
  backend:
    build: ./backend
    env_file: .env
    depends_on: [db]
    ports: ["8000:8000"]
    volumes: ["./ml/artifacts:/app/ml/artifacts"]
  frontend:
    build: ./frontend
    environment: { NEXT_PUBLIC_API_URL: http://localhost:8000/api/v1 }
    ports: ["3000:3000"]
    depends_on: [backend]
volumes: { pgdata: {} }
```

---

## Evaluation Checklist (self-test before submission)

**ML**
- [ ] Multiple models compared, with table and justification
- [ ] Stratified split, no leakage, calibrated probabilities, cost-based threshold
- [ ] ROC, PR, confusion matrix, calibration curve, SHAP plots shown in the UI
- [ ] Fairness and drift views present
- [ ] Model card written

**Product**
- [ ] Every P0 feature in the PRD works
- [ ] Role-based access verified for 4 roles
- [ ] Batch upload works with the provided sample file and rejects bad files gracefully
- [ ] What-if changes the score live

**UI/UX**
- [ ] Consistent design system, dark and light modes
- [ ] Skeletons, empty states, toasts, and error states present
- [ ] Responsive at all breakpoints
- [ ] Insight captions on charts

**Engineering**
- [ ] README, `.env.example`, Docker works from a clean clone
- [ ] Tests pass; no console errors; lint clean

## 5-Minute Demo Script
1. **Login** as Manager → Dashboard: "20% churn, $X revenue at risk, Germany is the hotspot."
2. **Drill into** Germany → top risk customer → **Customer 360**: gauge, SHAP reasons in plain English.
3. **What-If:** convert inactive to active and add a product → risk drops. Save as action plan.
4. **Batch:** upload 500 new customers → results → create a campaign from High+Critical.
5. **Model Lab:** compare 4 models, show ROC/calibration, change threshold and watch cost update.
6. **Monitoring:** drift heatmap and fairness table. Close with the model card and the Predict → Explain → Act → Measure story.

## Common Pitfalls
- Fitting scalers/SMOTE before splitting (leakage). Keep everything inside the Pipeline / CV folds.
- Optimising accuracy on an imbalanced set. Use PR-AUC and recall.
- Using `Surname` or `CustomerId` as features.
- Showing raw SHAP numbers to business users. Always translate to sentences.
- Hard-coding dashboard values. Everything must come from the API.
