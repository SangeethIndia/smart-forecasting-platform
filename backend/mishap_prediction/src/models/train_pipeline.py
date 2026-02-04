import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score

import matplotlib.pyplot as plt
import numpy as np

import sys
import shap

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.config import PROCESSED_DATA_DIR, MODEL_DIR

FEATURES_FILE = PROCESSED_DATA_DIR / "features.csv"
RF_PIPELINE_FILE = MODEL_DIR / "rf_pipeline.joblib"
GB_PIPELINE_FILE = MODEL_DIR / "gb_pipeline.joblib"

def train_model():
     # 1. Load feature-engineered data
     df = pd.read_csv(FEATURES_FILE)

     df = df.sort_values(by=["entity_type", "entity_value", "year", "quarter"])

     # 2. Create target (Delta mishap count next quarter)
     df['target_qoq_change'] = (
          df.groupby(['entity_type', 'entity_value'])['mishap_count'].shift(-1) - df['mishap_count']
     )

     # Eliminate Outliers
     df['target_qoq_change'] = df['target_qoq_change'].clip(-50, 50)

     df = df.dropna(subset=['target_qoq_change'])

     # 3. Define feature groups

     cat_cols = ['entity_type', 'entity_value']

     num_cols = [
          'year',
          'quarter',
          'prev_qtr_count',
          'qoq_change',
          'rolling_4q_avg'
     ]

     target = 'target_qoq_change'

     X = df[cat_cols + num_cols]
     y = df[target]

     # 4. Train-test split

     train_idx = []
     test_idx = []

     for _, group in df.groupby(['entity_type', 'entity_value']):
          split_point = int(len(group) * 0.8)
          train_idx.extend(group.index[:split_point])
          test_idx.extend(group.index[split_point:])

     X_train = X.loc[train_idx]
     X_test  = X.loc[test_idx]
     y_train = y.loc[train_idx]
     y_test  = y.loc[test_idx]

     # 5. Preprocessing + Model Pipeline

     preprocess = ColumnTransformer(
                    transformers=[
                         ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
                         ("num", "passthrough", num_cols)
                    ]
     )

     rf_pipeline = Pipeline([
          ("preprocess", preprocess),
          ("model", RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42))
     ])

     gb_pipeline = Pipeline([
          ("preprocess", preprocess),
          ("model", GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=3, random_state=42))
     ])

     # 6. Train model

     rf_pipeline.fit(X_train, y_train)
     gb_pipeline.fit(X_train, y_train)

     # 7. Evaluation

     rf_preds = rf_pipeline.predict(X_test)

     print("Random Forest Results")
     print(f"Mean Absolute Error: {mean_absolute_error(y_test, rf_preds)}")
     print(f"R^2 Score: {r2_score(y_test, rf_preds)}")

     gb_preds = gb_pipeline.predict(X_test)

     print("Gradient Boosting Results")
     print("MAE:", mean_absolute_error(y_test, gb_preds))
     print("R2 :", r2_score(y_test, gb_preds))

     ensemble_preds = 0.6 * gb_preds + 0.4 * rf_preds

     print("Ensembled Results")
     print("MAE:", mean_absolute_error(y_test, ensemble_preds))
     print("R2 :", r2_score(y_test, ensemble_preds))

     # 8. Shap Explainability

     model = rf_pipeline.named_steps['model']
     preprocess_step = rf_pipeline.named_steps['preprocess']

     # 8.1 Transform data for SHAP

     X_test_transformed = preprocess_step.transform(X_test)

     explainer = shap.TreeExplainer(model)
     X_test_sample = X_test_transformed[:50]

     shap_values = explainer.shap_values(X_test_sample)
     shap.summary_plot(shap_values, X_test_sample)

     # 9. Save pipeline

     MODEL_DIR.mkdir(parents=True, exist_ok=True)
     joblib.dump(rf_pipeline, RF_PIPELINE_FILE)
     joblib.dump(gb_pipeline, GB_PIPELINE_FILE)

     print(f"RF Pipeline saved to {RF_PIPELINE_FILE}")
     print(f"GB Pipeline saved to {GB_PIPELINE_FILE}")

     # Take last N points for clarity
     mask = (
          (X_test['entity_type'] == 'MishapType') &
          (X_test['entity_value'] == 'Aviation')
     )

     y_true = y_test[mask].values
     y_pred = gb_pipeline.predict(X_test[mask])

     plt.figure(figsize=(10, 5))
     plt.plot(y_true, marker='o', label='Actual QoQ Change')
     plt.plot(y_pred, marker='x', label='Predicted QoQ Change')

     plt.axhline(0, linestyle='--', linewidth=1)
     plt.title("Actual vs Predicted QoQ Mishap Change (Last Quarters)")
     plt.xlabel("Time (quarters)")
     plt.ylabel("QoQ Mishap Change")
     plt.legend()
     plt.grid(True)

     plt.show()

if __name__ == "__main__":
     train_model()