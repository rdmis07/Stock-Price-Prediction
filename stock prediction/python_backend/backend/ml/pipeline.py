"""
End-to-end sklearn Pipeline factory.
Combines preprocessing (imputation + scaling) with the chosen estimator.
"""
from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def build_preprocessor(numeric_features: list[str]) -> ColumnTransformer:
    """Imputation + standardization for all numeric features."""
    numeric_pipe = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
    ])
    return ColumnTransformer(transformers=[("num", numeric_pipe, numeric_features)])


def build_pipeline(model, numeric_features: list[str]) -> Pipeline:
    """Compose the preprocessor + estimator into a single sklearn Pipeline."""
    return Pipeline(steps=[
        ("preprocess", build_preprocessor(numeric_features)),
        ("model",      model),
    ])
