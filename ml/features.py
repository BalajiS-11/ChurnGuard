import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer

from ml.config import (
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
    ALL_FEATURES
)

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute engineered features on raw DataFrame.
    Can be called on batch DataFrames or single-row DataFrames.
    """
    d = df.copy()
    
    # Financial & Tenure ratios
    salary_denom = d['EstimatedSalary'].replace(0, 1) if 'EstimatedSalary' in d else 1
    d['balance_salary_ratio'] = d['Balance'] / (salary_denom + 1.0)
    
    age_denom = d['Age'].replace(0, 1) if 'Age' in d else 1
    d['tenure_age_ratio'] = d['Tenure'] / age_denom
    
    d['products_per_tenure'] = d['NumOfProducts'] / (d['Tenure'] + 1.0)
    d['is_zero_balance'] = (d['Balance'] == 0).astype(int)
    
    # Composite engagement score
    d['engagement_score'] = (
        d['IsActiveMember'] * 2 + d['HasCrCard'] + d['NumOfProducts']
    )
    
    # Age group categorization
    d['age_group'] = pd.cut(
        d['Age'],
        bins=[-np.inf, 29, 39, 49, 59, np.inf],
        labels=['<30', '30-40', '40-50', '50-60', '60+']
    ).astype(str)
    
    # Credit score banding (standard FICO tiers)
    d['credit_band'] = pd.cut(
        d['CreditScore'],
        bins=[-np.inf, 579, 669, 739, 799, np.inf],
        labels=['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
    ).astype(str)
    
    return d

class FeatureEngineeringTransformer(BaseEstimator, TransformerMixin):
    """
    Scikit-learn compatible transformer for feature engineering.
    """
    def fit(self, X, y=None):
        return self
    
    def transform(self, X):
        if not isinstance(X, pd.DataFrame):
            raise TypeError('Expected pandas DataFrame')
        engineered = engineer_features(X)
        return engineered[ALL_FEATURES]

def get_preprocessor():
    """
    Returns ColumnTransformer that handles numeric pass-through/imputation and
    categorical one-hot encoding.
    """
    num_pipeline = SimpleImputer(strategy='median')
    cat_pipeline = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', num_pipeline, NUMERIC_FEATURES),
            ('cat', cat_pipeline, CATEGORICAL_FEATURES)
        ],
        remainder='drop',
        verbose_feature_names_out=False
    )
    return preprocessor
