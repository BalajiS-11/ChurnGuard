from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / 'data' / 'raw' / 'Churn_Modelling.csv'
ARTIFACTS_DIR = BASE_DIR / 'ml' / 'artifacts'
PLOTS_DIR = ARTIFACTS_DIR / 'plots'

# Ensure directories exist
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

# Random Seed
RANDOM_STATE = 42

# Column Groups
ID_COLS = ['RowNumber', 'CustomerId', 'Surname']
TARGET_COL = 'Exited'

RAW_NUMERIC_COLS = [
    'CreditScore', 'Age', 'Tenure', 'Balance', 'NumOfProducts',
    'HasCrCard', 'IsActiveMember', 'EstimatedSalary'
]

RAW_CATEGORICAL_COLS = ['Geography', 'Gender']

# Engineered features
ENGINEERED_NUMERIC_COLS = [
    'balance_salary_ratio', 'tenure_age_ratio', 'products_per_tenure',
    'is_zero_balance', 'engagement_score'
]

ENGINEERED_CATEGORICAL_COLS = ['age_group', 'credit_band']

NUMERIC_FEATURES = RAW_NUMERIC_COLS + ENGINEERED_NUMERIC_COLS
CATEGORICAL_FEATURES = RAW_CATEGORICAL_COLS + ENGINEERED_CATEGORICAL_COLS
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Cost weights for threshold selection
COST_FN = 5.0  # Missed churner cost
COST_FP = 1.0  # Wasted retention offer cost
