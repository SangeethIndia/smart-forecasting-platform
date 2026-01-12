import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import sys
import shap

PROJECT_ROOT = Path().resolve()
sys.path.append(str(PROJECT_ROOT))

from src.config import PROCESSED_DATA_DIR, MODEL_DIR

# File Paths

FEATURES_FILE = PROCESSED_DATA_DIR / "features.csv"
MODEL_FILE = MODEL_DIR / "rf_mishap_model.pkl"
MODEL_FEATURES_FILE = MODEL_DIR / "model_features.pkl"

def train_model():
     df = pd.read_csv(FEATURES_FILE)

     df = df.sort_values(by=['entity_type', 'entity_value', 'year', 'quarter'])

     df['target_next_qtr'] = df.groupby(['entity_type', 'entity_value'])['mishap_count'].shift(-1)

     # Drop rows where target is missing (last quarter of each entity)
     df = df.dropna(subset=['target_next_qtr'])

     # Encode Categorical Variables
     df_encoded = pd.get_dummies(df, columns=['entity_type', 'entity_value'], drop_first=False)

     print(df.head(10))

     # Featues and Target

     X = df_encoded[
               ["year", "quarter", "prev_qtr_count", "qoq_change", "rolling_4q_avg"] +
               [col for col in df_encoded.columns if col.startswith('entity_')]
          ]
     
     y = df_encoded["target_next_qtr"]

     # Train-Test Split
     X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

     # Random Forest model
     model = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
     model.fit(X_train, y_train)

     explainer = shap.TreeExplainer(model)
     X_test_sample = X_test.sample(50, random_state=42)
     shap_values = explainer.shap_values(X_test_sample)
     shap.summary_plot(shap_values, X_test_sample)

     row = X_test_sample.iloc[0]
     shap.plots.waterfall(
          shap.Explanation(
               values=explainer.shap_values(row),
               base_values=explainer.expected_value,
               data=row,
               feature_names=X.columns.tolist()
          )
     )

     explainer.explain_row(row, max_evals=10, main_effects=True, error_bounds=True, outputs="shap_values", silent=False)

     # Evaluation
     preds = model.predict(X_test)
     print(f"Mean Absolute Error: {mean_absolute_error(y_test, preds)}")
     print(f"R^2 Score: {r2_score(y_test, preds)}")

     feature_importance = pd.DataFrame({
          'feature': X.columns,
          'importance': model.feature_importances_
     }).sort_values(by='importance', ascending=False)

     print("Feature Importances:")
     print(feature_importance)

     # Save the model
     MODEL_DIR.mkdir(exist_ok=True)
     joblib.dump(model, MODEL_FILE)
     joblib.dump(X_train.columns.tolist(), MODEL_FEATURES_FILE)

     print(f"Model saved to {MODEL_FILE}")
     print(f"Model features saved to {MODEL_FEATURES_FILE}")

if __name__ == "__main__":
     train_model()

